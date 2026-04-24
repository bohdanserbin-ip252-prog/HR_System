use axum::{
    body::Body,
    http::{
        Method, StatusCode,
        header::{CONTENT_TYPE, COOKIE, SET_COOKIE},
    },
};
use hr_system_backend::{AppState, build_app, initialize_database};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tempfile::tempdir;
use tower::ServiceExt;

async fn send(
    app: &axum::Router,
    method: Method,
    path: &str,
    body: Option<Value>,
    cookie: Option<&str>,
) -> (StatusCode, Value, Option<String>) {
    let mut builder = axum::http::Request::builder()
        .method(method)
        .uri(path)
        .header(CONTENT_TYPE, "application/json");
    if let Some(cookie) = cookie {
        builder = builder.header(COOKIE, cookie);
    }
    let request = builder
        .body(body.map_or_else(Body::empty, |value| Body::from(value.to_string())))
        .expect("request");
    let response = app.clone().oneshot(request).await.expect("response");
    let status = response.status();
    let cookie = response
        .headers()
        .get(SET_COOKIE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.split(';').next().unwrap_or_default().to_string());
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    let payload = if bytes.is_empty() {
        json!(null)
    } else {
        serde_json::from_slice(&bytes).expect("json body")
    };
    let normalized_payload = if status.is_success() {
        payload.get("data").cloned().unwrap_or(payload)
    } else {
        payload
    };
    (status, normalized_payload, cookie)
}

fn build_test_app() -> (tempfile::TempDir, axum::Router) {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let dist_path = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");
    (temp, build_app(AppState::new(db_path, dist_path)))
}

async fn login(app: &axum::Router) -> String {
    let (status, _, cookie) = send(
        app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({ "username": "admin", "password": "admin123" })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    cookie.expect("session cookie")
}

async fn first_employee_id(app: &axum::Router, cookie: &str) -> i64 {
    let (status, body, _) = send(app, Method::GET, "/api/v2/employees", None, Some(cookie)).await;
    assert_eq!(status, StatusCode::OK);
    body.as_array().unwrap()[0]["id"].as_i64().unwrap()
}

#[tokio::test]
async fn bulk_delete_employees_removes_matching_rows() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;

    let (list_status, list_body, _) =
        send(&app, Method::GET, "/api/v2/employees", None, Some(&admin)).await;
    assert_eq!(list_status, StatusCode::OK);
    let ids: Vec<i64> = list_body
        .as_array()
        .unwrap()
        .iter()
        .map(|e| e["id"].as_i64().unwrap())
        .collect();
    assert!(ids.len() >= 2);

    let to_delete = &ids[0..2];
    let (status, body, _) = send(
        &app,
        Method::POST,
        "/api/v2/employees/bulk-delete",
        Some(json!({ "ids": to_delete })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["deleted"], 2);
}

#[tokio::test]
async fn bulk_update_employees_changes_status() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (status, body, _) = send(
        &app,
        Method::POST,
        "/api/v2/employees/bulk-update",
        Some(json!({ "ids": [employee_id], "status": "on_leave" })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["updated"], 1);

    let (get_status, get_body, _) = send(
        &app,
        Method::GET,
        &format!("/api/v2/employees/{employee_id}"),
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(get_status, StatusCode::OK);
    assert_eq!(get_body["status"], "on_leave");
}

#[tokio::test]
async fn bulk_update_employees_rejects_invalid_status() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (status, _, _) = send(
        &app,
        Method::POST,
        "/api/v2/employees/bulk-update",
        Some(json!({ "ids": [employee_id], "status": "invalid" })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn bulk_delete_complaints_removes_matching_rows() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (create_status, created, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(json!({
            "employee_id": employee_id,
            "title": "Test complaint",
            "description": "Description",
            "severity": "low",
            "complaint_date": "2026-04-22"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    let complaint_id = created["id"].as_i64().unwrap();

    let (status, body, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints/bulk-delete",
        Some(json!({ "ids": [complaint_id] })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["deleted"], 1);
}

#[tokio::test]
async fn bulk_update_complaints_changes_status() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (create_status, created, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(json!({
            "employee_id": employee_id,
            "title": "Test complaint",
            "description": "Description",
            "severity": "low",
            "complaint_date": "2026-04-22"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    let complaint_id = created["id"].as_i64().unwrap();

    let (status, body, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints/bulk-update",
        Some(json!({
            "ids": [complaint_id],
            "status": "resolved",
            "resolution_notes": "Fixed"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["updated"], 1);

    let (get_status, get_body, _) = send(
        &app,
        Method::GET,
        &format!("/api/v2/complaints/{complaint_id}"),
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(get_status, StatusCode::OK);
    assert_eq!(get_body["status"], "resolved");
}

#[tokio::test]
async fn bulk_update_complaints_rejects_invalid_status() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (create_status, created, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(json!({
            "employee_id": employee_id,
            "title": "Test complaint",
            "description": "Description",
            "severity": "low",
            "complaint_date": "2026-04-22"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    let complaint_id = created["id"].as_i64().unwrap();

    let (status, _, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints/bulk-update",
        Some(json!({
            "ids": [complaint_id],
            "status": "invalid"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn bulk_endpoints_require_admin() {
    let (_temp, app) = build_test_app();

    let (status, _, _) = send(
        &app,
        Method::POST,
        "/api/v2/employees/bulk-delete",
        Some(json!({ "ids": [1] })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, _, _) = send(
        &app,
        Method::POST,
        "/api/v2/employees/bulk-update",
        Some(json!({ "ids": [1], "status": "active" })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}
