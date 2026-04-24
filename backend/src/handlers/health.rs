use crate::AppState;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde_json::json;

pub async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = state
        .run_db(|conn| {
            conn.query_row("SELECT 1", [], |_| Ok(()))
                .map_err(|e| crate::error::AppError::internal(e.to_string()))
        })
        .await
        .is_ok();

    if db_ok {
        (
            StatusCode::OK,
            Json(json!({"status":"ok","database":"connected"})),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"status":"error","database":"disconnected"})),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AppState;
    use axum::http::StatusCode;
    use http_body_util::BodyExt;
    use std::path::PathBuf;
    use tempfile::tempdir;

    #[tokio::test]
    async fn health_check_ok_when_database_connected() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("health.db");
        crate::initialize_database(&db_path).expect("init db");
        let state = AppState::new(&db_path, PathBuf::from("."));

        let response = health_check(State(state)).await.into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "ok");
        assert_eq!(json["database"], "connected");
    }

    #[tokio::test]
    async fn health_check_error_when_database_disconnected() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().to_path_buf();
        let state = AppState::new(db_path, PathBuf::from("."));

        let response = health_check(State(state)).await.into_response();
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "error");
        assert_eq!(json["database"], "disconnected");
    }
}
