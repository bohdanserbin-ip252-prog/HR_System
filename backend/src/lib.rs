mod auth;
mod cors;
mod db;
mod error;
mod events;
mod handlers;
mod json_schemas;
mod middleware;
mod models;
mod pagination;
mod routes;

use axum::{Router, middleware::from_fn, routing::get_service};
use rusqlite::Connection;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tower_http::services::{ServeDir, ServeFile};

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
    let app = Router::new()
        .merge(routes::build_api_router(state.clone()))
        .layer(from_fn(middleware::v2_contract::v2_contract_middleware))
        .layer(middleware::security::SecurityHeadersLayer::new())
        .layer(middleware::rate_limit::RateLimitLayer::new(
            5,
            std::time::Duration::from_secs(60),
        ))
        .layer(cors::cors_layer_from_env());

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
