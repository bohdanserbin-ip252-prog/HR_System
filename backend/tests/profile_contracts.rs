use axum::{
    body::Body,
    http::{
        Method, Request, StatusCode,
        header::{CONTENT_TYPE, COOKIE, SET_COOKIE},
    },
};
use hr_system_backend::{AppState, build_app, initialize_database};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tempfile::tempdir;
use tower::ServiceExt;

async fn send_json(
    app: &axum::Router,
    method: Method,
    path: &str,
    body: Option<Value>,
) -> (StatusCode, Value, Option<String>) {
    send_json_with_cookie(app, method, path, body, None).await
}

async fn send_json_with_cookie(
    app: &axum::Router,
    method: Method,
    path: &str,
    body: Option<Value>,
    cookie: Option<&str>,
) -> (StatusCode, Value, Option<String>) {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header(CONTENT_TYPE, "application/json");

    if let Some(cookie) = cookie {
        builder = builder.header(COOKIE, cookie);
    }

    let request = builder
        .body(match body {
            Some(value) => Body::from(value.to_string()),
            None => Body::empty(),
        })
        .expect("request");

    let response = app.clone().oneshot(request).await.expect("response");
    let status = response.status();
    let set_cookie = response
        .headers()
        .get(SET_COOKIE)
        .and_then(|value| value.to_str().ok())
        .map(|cookie| cookie.split(';').next().unwrap_or_default().to_string());
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body bytes")
        .to_bytes();
    let body = if bytes.is_empty() {
        json!(null)
    } else {
        serde_json::from_slice(&bytes).expect("valid json")
    };

    let normalized_body = if status.is_success() {
        body.get("data").cloned().unwrap_or(body)
    } else {
        body
    };

    (status, normalized_body, set_cookie)
}

fn build_test_app() -> (tempfile::TempDir, axum::Router) {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let fake_frontend = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");
    (temp, build_app(AppState::new(db_path, fake_frontend)))
}

fn assert_profile_sections(body: &Value) {
    for key in [
        "identity",
        "employment",
        "documents",
        "complaints",
        "timeOff",
        "reviews",
        "development",
        "training",
        "payroll",
        "shifts",
        "activity",
    ] {
        assert!(body.get(key).is_some(), "missing key: {key}");
    }
}

#[tokio::test]
async fn profile_endpoints_expose_canonical_sections_and_retire_portal_surface() {
    let (_temp, app) = build_test_app();

    let (login_status, _, admin_cookie) = send_json(
        &app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({
            "username": "admin",
            "password": "admin123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    let admin_cookie = admin_cookie.expect("admin session cookie");

    let (self_status, self_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/profile/me",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(self_status, StatusCode::OK);
    assert_profile_sections(&self_body);

    let (employee_status, employee_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/profile/1",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(employee_status, StatusCode::OK);
    assert_profile_sections(&employee_body);
    assert_eq!(employee_body["identity"]["id"], 1);

    let (portal_status, _, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/portal/me",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(portal_status, StatusCode::NOT_FOUND);
}
