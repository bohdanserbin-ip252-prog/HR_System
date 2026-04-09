use axum::{
    body::Body,
    http::{Method, Request, StatusCode, header::{CONTENT_TYPE, COOKIE, SET_COOKIE}},
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
        .map(|value| value.to_string());
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

    (status, body, set_cookie)
}

fn session_cookie_fragment(set_cookie: &str) -> String {
    set_cookie.split(';').next().unwrap_or_default().to_string()
}

fn build_test_app() -> (tempfile::TempDir, axum::Router) {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let fake_frontend = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, fake_frontend));
    (temp, app)
}

#[tokio::test]
async fn unauthenticated_requests_are_rejected_with_contract_messages() {
    let (_temp, app) = build_test_app();

    let (me_status, me_body, _) = send_json(&app, Method::GET, "/api/auth/me", None).await;
    assert_eq!(me_status, StatusCode::UNAUTHORIZED);
    assert_eq!(me_body["error"], "Необхідно увійти в систему");

    let (stats_status, stats_body, _) = send_json(&app, Method::GET, "/api/stats", None).await;
    assert_eq!(stats_status, StatusCode::UNAUTHORIZED);
    assert_eq!(stats_body["error"], "Необхідно увійти в систему");

    let (development_status, development_body, _) =
        send_json(&app, Method::GET, "/api/development", None).await;
    assert_eq!(development_status, StatusCode::UNAUTHORIZED);
    assert_eq!(development_body["error"], "Необхідно увійти в систему");
}

#[tokio::test]
async fn viewer_has_read_access_but_cannot_write_admin_resources() {
    let (_temp, app) = build_test_app();

    let (login_status, login_body, set_cookie) = send_json(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "username": "viewer",
            "password": "viewer123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    assert_eq!(login_body["user"]["role"], "user");
    let viewer_cookie = set_cookie.map(|value| session_cookie_fragment(&value)).expect("viewer cookie");

    let (development_status, development_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/development",
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(development_status, StatusCode::OK);
    assert!(development_body["goals"].is_array());

    let (onboarding_status, onboarding_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/onboarding",
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(onboarding_status, StatusCode::OK);
    assert!(onboarding_body["tasks"].is_array());

    let (forbidden_status, forbidden_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/development/goals",
        Some(json!({
            "icon": "insights",
            "title": "Blocked goal",
            "desc": "Should fail for viewer.",
            "status": "on-track",
            "progress": 20,
            "due_date": "2026-04-21",
            "display_order": 9
        })),
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);
    assert_eq!(forbidden_body["error"], "Недостатньо прав для виконання дії");
}

#[tokio::test]
async fn move_contract_validates_direction_and_missing_records() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "username": "admin",
            "password": "admin123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    let admin_cookie = set_cookie.map(|value| session_cookie_fragment(&value)).expect("admin cookie");

    let (bad_direction_status, bad_direction_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/development/goals/1/move",
        Some(json!({
            "direction": "left"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(bad_direction_status, StatusCode::BAD_REQUEST);
    assert_eq!(bad_direction_body["error"], "Напрямок переміщення має бути up або down");

    let (missing_status, missing_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/development/goals/999999/move",
        Some(json!({
            "direction": "up"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(missing_status, StatusCode::NOT_FOUND);
    assert_eq!(missing_body["error"], "Ціль розвитку не знайдена");
}

#[tokio::test]
async fn logout_clears_cookie_and_old_session_can_no_longer_access_me() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "username": "admin",
            "password": "admin123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    let admin_cookie_header = set_cookie.expect("admin cookie header");
    let admin_cookie = session_cookie_fragment(&admin_cookie_header);

    let (logout_status, logout_body, logout_set_cookie) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/auth/logout",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(logout_status, StatusCode::OK);
    assert_eq!(logout_body["success"], true);
    let logout_set_cookie = logout_set_cookie.expect("logout set-cookie");
    assert!(logout_set_cookie.contains("hr_system_session="));
    assert!(logout_set_cookie.contains("HttpOnly"));

    let (me_status, me_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/auth/me",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(me_status, StatusCode::UNAUTHORIZED);
    assert_eq!(me_body["error"], "Сесію не знайдено або термін дії минув");
}
