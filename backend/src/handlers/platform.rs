use crate::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn platform_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v2/activity", get(super::activity))
        .route("/api/v2/export/employees", get(super::export_employees))
        .route("/api/v2/export/complaints", get(super::export_complaints))
        .route(
            "/api/v2/notifications/unread-count",
            get(super::notification_unread_count),
        )
        .route(
            "/api/v2/notifications/read-all",
            post(super::mark_all_notifications_read),
        )
}
