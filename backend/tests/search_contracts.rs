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

#[tokio::test]
async fn search_employees_returns_results() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;

    let (status, body, _) = send(
        &app,
        Method::GET,
        "/api/v2/search?q=kovalenko&entity=employees&limit=10",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["entity"], "employees");
    let results = body["results"].as_array().expect("results array");
    assert!(!results.is_empty());
    let first = &results[0];
    assert!(first["id"].is_number());
    assert!(first["firstName"].is_string());
    assert!(first["lastName"].is_string());
}

#[tokio::test]
async fn search_complaints_returns_empty_for_unknown_term() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;

    let (status, body, _) = send(
        &app,
        Method::GET,
        "/api/v2/search?q=nonexistentxyz123&entity=complaints&limit=10",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["entity"], "complaints");
    assert!(body["results"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn search_documents_returns_empty_for_unknown_term() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;

    let (status, body, _) = send(
        &app,
        Method::GET,
        "/api/v2/search?q=nonexistentxyz123&entity=documents&limit=10",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["entity"], "documents");
    assert!(body["results"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn search_requires_authentication() {
    let (_temp, app) = build_test_app();

    let (status, _, _) = send(
        &app,
        Method::GET,
        "/api/v2/search?q=test&entity=employees",
        None,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn search_rejects_invalid_entity() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;

    let (status, _, _) = send(
        &app,
        Method::GET,
        "/api/v2/search?q=test&entity=invalid",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
