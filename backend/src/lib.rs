mod auth;
mod db;
mod error;
mod handlers;
mod models;

use axum::{
    Router,
    routing::{get, get_service, post},
};
use rusqlite::Connection;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
};

pub use db::{default_db_path, default_frontend_dist_dir, initialize_database};
pub use error::{AppError, AppResult};

#[derive(Clone, Debug)]
pub struct AppState {
    db_path: Arc<PathBuf>,
    frontend_dist_dir: Arc<PathBuf>,
    frontend_index_path: Arc<PathBuf>,
    has_built_frontend: bool,
}

impl AppState {
    pub fn new(db_path: impl Into<PathBuf>, frontend_dist_dir: impl Into<PathBuf>) -> Self {
        let db_path = db_path.into();
        let frontend_dist_dir = frontend_dist_dir.into();
        let frontend_index_path = frontend_dist_dir.join("index.html");
        let has_built_frontend = frontend_index_path.exists();

        Self {
            db_path: Arc::new(db_path),
            frontend_dist_dir: Arc::new(frontend_dist_dir),
            frontend_index_path: Arc::new(frontend_index_path),
            has_built_frontend,
        }
    }

    pub fn db_path(&self) -> &Path {
        self.db_path.as_ref().as_path()
    }

    pub fn has_built_frontend(&self) -> bool {
        self.has_built_frontend
    }

    pub async fn run_db<T, F>(&self, operation: F) -> AppResult<T>
    where
        T: Send + 'static,
        F: FnOnce(&Connection) -> AppResult<T> + Send + 'static,
    {
        let db_path = self.db_path.clone();
        tokio::task::spawn_blocking(move || {
            let connection = db::open_connection(db_path.as_ref())?;
            operation(&connection)
        })
        .await
        .map_err(|err| AppError::internal(err.to_string()))?
    }
}

pub fn build_app(state: AppState) -> Router {
    let api_router = Router::new()
        .route("/api/auth/login", post(handlers::login))
        .route("/api/auth/me", get(handlers::me))
        .route("/api/auth/logout", post(handlers::logout))
        .route("/api/stats", get(handlers::stats))
        .route("/api/development", get(handlers::development))
        .route(
            "/api/development/goals",
            post(handlers::create_development_goal),
        )
        .route(
            "/api/development/goals/{id}",
            axum::routing::put(handlers::update_development_goal)
                .delete(handlers::delete_development_goal),
        )
        .route(
            "/api/development/goals/{id}/move",
            post(handlers::move_development_goal),
        )
        .route(
            "/api/development/feedback",
            post(handlers::create_development_feedback),
        )
        .route(
            "/api/development/feedback/{id}",
            axum::routing::put(handlers::update_development_feedback)
                .delete(handlers::delete_development_feedback),
        )
        .route(
            "/api/development/feedback/{id}/move",
            post(handlers::move_development_feedback),
        )
        .route(
            "/api/development/meetings",
            post(handlers::create_development_meeting),
        )
        .route(
            "/api/development/meetings/{id}",
            axum::routing::put(handlers::update_development_meeting)
                .delete(handlers::delete_development_meeting),
        )
        .route(
            "/api/development/meetings/{id}/move",
            post(handlers::move_development_meeting),
        )
        .route("/api/onboarding", get(handlers::onboarding))
        .route("/api/onboarding/tasks", post(handlers::create_onboarding_task))
        .route(
            "/api/onboarding/tasks/{id}",
            axum::routing::put(handlers::update_onboarding_task)
                .delete(handlers::delete_onboarding_task),
        )
        .route(
            "/api/onboarding/tasks/{id}/move",
            post(handlers::move_onboarding_task),
        )
        .route(
            "/api/employees",
            get(handlers::list_employees).post(handlers::create_employee),
        )
        .route(
            "/api/employees/{id}",
            get(handlers::get_employee)
                .put(handlers::update_employee)
                .delete(handlers::delete_employee),
        )
        .route(
            "/api/departments",
            get(handlers::list_departments).post(handlers::create_department),
        )
        .route(
            "/api/departments/{id}",
            get(handlers::get_department)
                .put(handlers::update_department)
                .delete(handlers::delete_department),
        )
        .route(
            "/api/positions",
            get(handlers::list_positions).post(handlers::create_position),
        )
        .route(
            "/api/positions/{id}",
            get(handlers::get_position)
                .put(handlers::update_position)
                .delete(handlers::delete_position),
        )
        .with_state(state.clone());

    let app = Router::new()
        .merge(api_router)
        .layer(CorsLayer::permissive());

    if state.has_built_frontend() {
        let frontend_dist_dir = state.frontend_dist_dir.as_ref().clone();
        let frontend_index_path = state.frontend_index_path.as_ref().clone();
        let static_service = get_service(
            ServeDir::new(frontend_dist_dir).fallback(ServeFile::new(frontend_index_path)),
        );

        app.fallback_service(static_service)
    } else {
        app
    }
}
