use axum::Json;
use serde_json::json;

#[path = "../validation/schema.rs"]
mod schema_validation;

pub async fn openapi_spec() -> Json<serde_json::Value> {
    Json(json!({
        "openapi": "3.0.3",
        "info": {
            "title": "HR System API",
            "version": "1.0.0",
            "description": "API for the HR System application"
        },
        "paths": super::openapi_paths::paths(),
        "components": {
            "schemas": super::openapi_schemas::schemas()
        }
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn openapi_spec_returns_valid_structure() {
        let Json(spec) = openapi_spec().await;
        assert_eq!(spec["openapi"], "3.0.3");
        assert_eq!(spec["info"]["title"], "HR System API");
        assert!(spec["paths"]["/api/v2/health"].is_object());
        assert!(spec["paths"]["/api/v2/events"].is_object());
    }
}
