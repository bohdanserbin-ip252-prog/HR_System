use axum::{
    body::Body,
    http::{
        Method, Request, StatusCode,
        header::{CONTENT_TYPE, COOKIE, SET_COOKIE},
    },
};
use hr_system_backend::{AppState, build_app, initialize_database};
use http_body_util::BodyExt;
use rusqlite::Connection;
use serde_json::{Value, json};
use tempfile::tempdir;
use tower::ServiceExt;

async fn collect_response(response: axum::response::Response) -> (StatusCode, String, String) {
    let status = response.status();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("body bytes")
        .to_bytes();

    (
        status,
        content_type,
        String::from_utf8_lossy(&body).into_owned(),
    )
}

async fn send_request(app: &axum::Router, request: Request<Body>) -> (StatusCode, String, String) {
    let response = app.clone().oneshot(request).await.expect("response");
    collect_response(response).await
}

fn session_cookie_fragment(set_cookie: &str) -> String {
    set_cookie.split(';').next().unwrap_or_default().to_string()
}

async fn login_admin(app: &axum::Router) -> String {
    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/v2/auth/login")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "username": "admin",
                "password": "admin123"
            })
            .to_string(),
        ))
        .expect("login request");
    let response = app.clone().oneshot(request).await.expect("login response");
    assert_eq!(response.status(), StatusCode::OK);
    let set_cookie = response
        .headers()
        .get(SET_COOKIE)
        .and_then(|value| value.to_str().ok())
        .expect("set-cookie");
    session_cookie_fragment(set_cookie)
}

#[tokio::test]
async fn json_extractor_rejections_use_json_error_contract() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, temp.path().join("dist")));

    let malformed_request = Request::builder()
        .method(Method::POST)
        .uri("/api/v2/auth/login")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from("{bad json"))
        .expect("malformed request");
    let (status, content_type, body) = send_request(&app, malformed_request).await;
    let payload: Value = serde_json::from_str(&body).expect("json error body");

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(content_type.starts_with("application/json"));
    assert_eq!(payload["error"], "Некоректний JSON у запиті");

    let wrong_content_type = Request::builder()
        .method(Method::POST)
        .uri("/api/v2/auth/login")
        .header(CONTENT_TYPE, "text/plain")
        .body(Body::from(
            json!({
                "username": "admin",
                "password": "admin123"
            })
            .to_string(),
        ))
        .expect("wrong content-type request");
    let (status, content_type, body) = send_request(&app, wrong_content_type).await;
    let payload: Value = serde_json::from_str(&body).expect("json error body");

    assert_eq!(status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert!(content_type.starts_with("application/json"));
    assert_eq!(
        payload["error"],
        "Очікується запит із Content-Type application/json"
    );
}

#[tokio::test]
async fn built_frontend_does_not_mask_unknown_api_routes() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let dist = temp.path().join("dist");
    std::fs::create_dir_all(&dist).expect("dist dir");
    std::fs::write(dist.join("index.html"), "<html>spa</html>").expect("index html");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, dist));

    for uri in ["/api", "/api/v2/", "/api/v2/does-not-exist"] {
        let api_request = Request::builder()
            .method(Method::GET)
            .uri(uri)
            .body(Body::empty())
            .expect("api request");
        let (status, content_type, body) = send_request(&app, api_request).await;
        let payload: Value = serde_json::from_str(&body).expect("json error body");

        assert_eq!(status, StatusCode::NOT_FOUND, "{uri}");
        assert!(content_type.starts_with("application/json"), "{uri}");
        assert_eq!(payload["error"], "API маршрут не знайдено", "{uri}");
    }

    let spa_request = Request::builder()
        .method(Method::GET)
        .uri("/some-spa-route")
        .body(Body::empty())
        .expect("spa request");
    let (status, content_type, body) = send_request(&app, spa_request).await;

    assert_eq!(status, StatusCode::OK);
    assert!(content_type.starts_with("text/html"));
    assert!(body.contains("spa"));
}

#[tokio::test]
async fn api_method_not_allowed_uses_json_error_contract() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, temp.path().join("dist")));

    for (method, uri) in [
        (Method::GET, "/api/v2/auth/login"),
        (Method::PATCH, "/api/v2/employees"),
        (Method::DELETE, "/api/v2/stats"),
    ] {
        let request = Request::builder()
            .method(method.clone())
            .uri(uri)
            .body(Body::empty())
            .expect("api request");
        let (status, content_type, body) = send_request(&app, request).await;
        let payload: Value = serde_json::from_str(&body).expect("json error body");

        assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED, "{method} {uri}");
        assert!(
            content_type.starts_with("application/json"),
            "{method} {uri}"
        );
        assert_eq!(
            payload["error"], "Метод не дозволено для цього API маршруту",
            "{method} {uri}"
        );
    }
}

#[tokio::test]
async fn internal_database_read_errors_are_sanitized_for_clients() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path.clone(), temp.path().join("dist")));
    let admin_cookie = login_admin(&app).await;

    let conn = Connection::open(&db_path).expect("db connection");
    conn.execute("UPDATE positions SET min_salary = 'oops' WHERE id = 1", [])
        .expect("corrupt numeric column");

    let request = Request::builder()
        .method(Method::GET)
        .uri("/api/v2/positions")
        .header(COOKIE, admin_cookie)
        .body(Body::empty())
        .expect("positions request");
    let (status, content_type, body) = send_request(&app, request).await;
    let payload: Value = serde_json::from_str(&body).expect("json error body");
    let message = payload["error"].as_str().expect("error message");

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert!(content_type.starts_with("application/json"));
    assert_eq!(message, "Внутрішня помилка сервера");
    assert!(!message.contains("Invalid column type"));
    assert!(!message.contains("rusqlite"));
}

#[tokio::test]
async fn cross_site_cookie_mode_can_emit_secure_samesite_none_cookie() {
    unsafe {
        std::env::set_var("HR_SYSTEM_COOKIE_SECURE", "true");
        std::env::set_var("HR_SYSTEM_COOKIE_SAMESITE", "none");
    }

    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, temp.path().join("dist")));

    let request = Request::builder()
        .method(Method::POST)
        .uri("/api/v2/auth/login")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "username": "admin",
                "password": "admin123"
            })
            .to_string(),
        ))
        .expect("login request");
    let response = app.clone().oneshot(request).await.expect("login response");
    let set_cookie = response
        .headers()
        .get(SET_COOKIE)
        .and_then(|value| value.to_str().ok())
        .expect("set-cookie");

    assert!(set_cookie.contains("Secure"), "{set_cookie}");
    assert!(set_cookie.contains("SameSite=None"), "{set_cookie}");

    unsafe {
        std::env::remove_var("HR_SYSTEM_COOKIE_SECURE");
        std::env::remove_var("HR_SYSTEM_COOKIE_SAMESITE");
    }
}
