use axum::{
    body::Body,
    http::{
        HeaderMap, Method, Request, StatusCode,
        header::{
            ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_HEADERS,
            ACCESS_CONTROL_ALLOW_METHODS, ACCESS_CONTROL_ALLOW_ORIGIN,
            ACCESS_CONTROL_REQUEST_HEADERS, ACCESS_CONTROL_REQUEST_METHOD, CONTENT_TYPE, COOKIE,
            ORIGIN, SET_COOKIE,
        },
    },
};
use hr_system_backend::{AppState, build_app, initialize_database};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::sync::{Mutex, MutexGuard};
use tempfile::tempdir;
use tower::ServiceExt;

static ENV_LOCK: Mutex<()> = Mutex::new(());

fn env_lock() -> MutexGuard<'static, ()> {
    ENV_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

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

    let normalized_body = if status.is_success() {
        body.get("data").cloned().unwrap_or(body)
    } else {
        body
    };

    (status, normalized_body, set_cookie)
}

async fn send_raw_request(app: &axum::Router, request: Request<Body>) -> (StatusCode, HeaderMap) {
    let response = app.clone().oneshot(request).await.expect("response");
    (response.status(), response.headers().clone())
}

fn session_cookie_fragment(set_cookie: &str) -> String {
    set_cookie.split(';').next().unwrap_or_default().to_string()
}

fn build_test_app() -> (tempfile::TempDir, axum::Router) {
    build_test_app_with_cors_origin(None)
}

fn build_test_app_with_cors_origin(cors_origin: Option<&str>) -> (tempfile::TempDir, axum::Router) {
    let _guard = env_lock();
    unsafe {
        match cors_origin {
            Some(origin) => std::env::set_var("HR_SYSTEM_CORS_ORIGIN", origin),
            None => std::env::remove_var("HR_SYSTEM_CORS_ORIGIN"),
        }
    }

    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let fake_frontend = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, fake_frontend));

    unsafe {
        std::env::remove_var("HR_SYSTEM_CORS_ORIGIN");
    }

    (temp, app)
}

async fn login_admin(app: &axum::Router) -> String {
    let (login_status, _, set_cookie) = send_json(
        app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({
            "username": "admin",
            "password": "admin123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    set_cookie
        .map(|value| session_cookie_fragment(&value))
        .expect("admin cookie")
}

fn assert_no_raw_sqlite_constraint(body: &Value) {
    let message = body["error"].as_str().expect("error message");
    assert!(!message.contains("constraint"), "{message}");
    assert!(!message.contains("FOREIGN KEY"), "{message}");
    assert!(!message.contains("UNIQUE"), "{message}");
    assert!(!message.contains("CHECK"), "{message}");
}

#[tokio::test]
async fn unauthenticated_requests_are_rejected_with_contract_messages() {
    let (_temp, app) = build_test_app();

    let (me_status, me_body, _) = send_json(&app, Method::GET, "/api/v2/auth/me", None).await;
    assert_eq!(me_status, StatusCode::UNAUTHORIZED);
    assert_eq!(me_body["error"], "Необхідно увійти в систему");

    let (stats_status, stats_body, _) = send_json(&app, Method::GET, "/api/v2/stats", None).await;
    assert_eq!(stats_status, StatusCode::UNAUTHORIZED);
    assert_eq!(stats_body["error"], "Необхідно увійти в систему");

    let (development_status, development_body, _) =
        send_json(&app, Method::GET, "/api/v2/development", None).await;
    assert_eq!(development_status, StatusCode::UNAUTHORIZED);
    assert_eq!(development_body["error"], "Необхідно увійти в систему");
}

#[tokio::test]
async fn cors_defaults_to_same_origin_and_allows_configured_credential_origin() {
    let (_temp, default_app) = build_test_app();
    let default_request = Request::builder()
        .method(Method::OPTIONS)
        .uri("/api/v2/auth/login")
        .header(ORIGIN, "https://frontend.example")
        .header(ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .header(ACCESS_CONTROL_REQUEST_HEADERS, "content-type")
        .body(Body::empty())
        .expect("default preflight");
    let (_default_status, default_headers) = send_raw_request(&default_app, default_request).await;
    assert!(default_headers.get(ACCESS_CONTROL_ALLOW_ORIGIN).is_none());
    assert!(
        default_headers
            .get(ACCESS_CONTROL_ALLOW_CREDENTIALS)
            .is_none()
    );

    let (_temp, cors_app) = build_test_app_with_cors_origin(Some("https://frontend.example"));
    let allowed_request = Request::builder()
        .method(Method::OPTIONS)
        .uri("/api/v2/auth/login")
        .header(ORIGIN, "https://frontend.example")
        .header(ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .header(ACCESS_CONTROL_REQUEST_HEADERS, "content-type")
        .body(Body::empty())
        .expect("allowed preflight");
    let (allowed_status, allowed_headers) = send_raw_request(&cors_app, allowed_request).await;
    assert_eq!(allowed_status, StatusCode::OK);
    assert_eq!(
        allowed_headers
            .get(ACCESS_CONTROL_ALLOW_ORIGIN)
            .and_then(|value| value.to_str().ok()),
        Some("https://frontend.example")
    );
    assert_eq!(
        allowed_headers
            .get(ACCESS_CONTROL_ALLOW_CREDENTIALS)
            .and_then(|value| value.to_str().ok()),
        Some("true")
    );
    assert!(
        allowed_headers
            .get(ACCESS_CONTROL_ALLOW_METHODS)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.contains("POST"))
    );
    assert!(
        allowed_headers
            .get(ACCESS_CONTROL_ALLOW_HEADERS)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.to_ascii_lowercase().contains("content-type"))
    );

    let denied_request = Request::builder()
        .method(Method::OPTIONS)
        .uri("/api/v2/auth/login")
        .header(ORIGIN, "https://evil.example")
        .header(ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .body(Body::empty())
        .expect("denied preflight");
    let (_denied_status, denied_headers) = send_raw_request(&cors_app, denied_request).await;
    assert_ne!(
        denied_headers
            .get(ACCESS_CONTROL_ALLOW_ORIGIN)
            .and_then(|value| value.to_str().ok()),
        Some("https://evil.example")
    );
    assert_ne!(
        denied_headers
            .get(ACCESS_CONTROL_ALLOW_ORIGIN)
            .and_then(|value| value.to_str().ok()),
        Some("*")
    );
}

#[tokio::test]
async fn viewer_has_read_access_but_cannot_write_admin_resources() {
    let (_temp, app) = build_test_app();

    let (login_status, login_body, set_cookie) = send_json(
        &app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({
            "username": "viewer",
            "password": "viewer123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    assert_eq!(login_body["user"]["role"], "user");
    let viewer_cookie = set_cookie
        .map(|value| session_cookie_fragment(&value))
        .expect("viewer cookie");

    let (development_status, development_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/development",
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(development_status, StatusCode::OK);
    assert!(development_body["goals"].is_array());

    let (onboarding_status, onboarding_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/onboarding",
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(onboarding_status, StatusCode::OK);
    assert!(onboarding_body["tasks"].is_array());

    let (forbidden_status, forbidden_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals",
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
    assert_eq!(
        forbidden_body["error"],
        "Недостатньо прав для виконання дії"
    );
}

#[tokio::test]
async fn move_contract_validates_direction_and_missing_records() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
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
    let admin_cookie = set_cookie
        .map(|value| session_cookie_fragment(&value))
        .expect("admin cookie");

    let (bad_direction_status, bad_direction_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals/1/move",
        Some(json!({
            "direction": "left"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(bad_direction_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        bad_direction_body["error"],
        "Напрямок переміщення має бути up або down"
    );

    let (missing_status, missing_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals/999999/move",
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
async fn write_contract_rejects_invalid_numbers_and_calendar_dates() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
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
    let admin_cookie = set_cookie
        .map(|value| session_cookie_fragment(&value))
        .expect("admin cookie");

    let (invalid_salary_status, invalid_salary_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Олена",
            "last_name": "Тестова",
            "hire_date": "2026-04-21",
            "salary": "abc",
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_salary_status, StatusCode::BAD_REQUEST);
    assert_eq!(invalid_salary_body["error"], "Поле salary має бути числом");

    let (invalid_position_status, invalid_position_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/positions",
        Some(json!({
            "title": "Invalid numeric position",
            "min_salary": "not-a-number",
            "max_salary": 10
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_position_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        invalid_position_body["error"],
        "Поле min_salary має бути числом"
    );

    let (invalid_date_status, invalid_date_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals",
        Some(json!({
            "icon": "target",
            "title": "Invalid date goal",
            "desc": "Calendar date must be real.",
            "status": "on-track",
            "progress": 30,
            "due_date": "2026-04-31",
            "display_order": 8
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_date_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        invalid_date_body["error"],
        "Дата дедлайну має бути у форматі YYYY-MM-DD"
    );

    let (invalid_birth_date_status, invalid_birth_date_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Дата",
            "last_name": "Народження",
            "birth_date": "2026-02-29",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_birth_date_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        invalid_birth_date_body["error"],
        "Дата народження має бути у форматі YYYY-MM-DD"
    );

    let (invalid_hire_date_status, invalid_hire_date_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Дата",
            "last_name": "Прийому",
            "birth_date": "2024-02-29",
            "hire_date": "2026-04-31",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_hire_date_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        invalid_hire_date_body["error"],
        "Дата прийому має бути у форматі YYYY-MM-DD"
    );
}

#[tokio::test]
async fn write_contract_rejects_invalid_employee_status_and_missing_relations_cleanly() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login_admin(&app).await;

    let (invalid_status_status, invalid_status_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Некоректний",
            "last_name": "Статус",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "deleted"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_status_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        invalid_status_body["error"],
        "Некоректний статус працівника"
    );
    assert_no_raw_sqlite_constraint(&invalid_status_body);

    let (missing_department_status, missing_department_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Немає",
            "last_name": "Відділу",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "department_id": 999999,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(missing_department_status, StatusCode::BAD_REQUEST);
    assert_eq!(missing_department_body["error"], "Відділ не знайдено");
    assert_no_raw_sqlite_constraint(&missing_department_body);

    let (missing_position_status, missing_position_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Немає",
            "last_name": "Посади",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "position_id": 999999,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(missing_position_status, StatusCode::BAD_REQUEST);
    assert_eq!(missing_position_body["error"], "Посаду не знайдено");
    assert_no_raw_sqlite_constraint(&missing_position_body);

    let (missing_feedback_employee_status, missing_feedback_employee_body, _) =
        send_json_with_cookie(
            &app,
            Method::POST,
            "/api/v2/development/feedback",
            Some(json!({
                "employee_id": 999999,
                "text": "Feedback for missing employee",
                "feedback_at": "2026-04-21"
            })),
            Some(&admin_cookie),
        )
        .await;
    assert_eq!(missing_feedback_employee_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        missing_feedback_employee_body["error"],
        "Працівника не знайдено"
    );
    assert_no_raw_sqlite_constraint(&missing_feedback_employee_body);
}

#[tokio::test]
async fn write_contract_maps_duplicate_constraints_to_human_messages() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login_admin(&app).await;

    let (duplicate_department_status, duplicate_department_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/departments",
        Some(json!({
            "name": "IT-відділ",
            "description": "Duplicate"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(duplicate_department_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        duplicate_department_body["error"],
        "Відділ з такою назвою вже існує"
    );
    assert_no_raw_sqlite_constraint(&duplicate_department_body);

    let (duplicate_position_status, duplicate_position_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/positions",
        Some(json!({
            "title": "HR-спеціаліст",
            "min_salary": 1000,
            "max_salary": 2000
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(duplicate_position_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        duplicate_position_body["error"],
        "Посада з такою назвою вже існує"
    );
    assert_no_raw_sqlite_constraint(&duplicate_position_body);

    let (duplicate_email_status, duplicate_email_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Email",
            "last_name": "Duplicate",
            "email": "kovalenko@company.ua",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(duplicate_email_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        duplicate_email_body["error"],
        "Працівник з таким email вже існує"
    );
    assert_no_raw_sqlite_constraint(&duplicate_email_body);
}

#[tokio::test]
async fn employee_email_contract_normalizes_and_rejects_case_insensitive_duplicates() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login_admin(&app).await;

    let (created_status, created_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Case",
            "last_name": "Normalize",
            "email": "  New.Person@Company.UA  ",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED);
    assert_eq!(created_body["email"], "new.person@company.ua");

    let (duplicate_create_status, duplicate_create_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Email",
            "last_name": "Uppercase Duplicate",
            "email": "KOVALENKO@company.ua",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(duplicate_create_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        duplicate_create_body["error"],
        "Працівник з таким email вже існує"
    );
    assert_no_raw_sqlite_constraint(&duplicate_create_body);

    let employee_id = created_body["id"].as_i64().expect("created employee id");
    let (duplicate_update_status, duplicate_update_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/employees/{employee_id}"),
        Some(json!({
            "first_name": "Case",
            "last_name": "Normalize",
            "email": "KOVALENKO@company.ua",
            "hire_date": "2026-04-21",
            "salary": 1000,
            "status": "active"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(duplicate_update_status, StatusCode::BAD_REQUEST);
    assert_eq!(
        duplicate_update_body["error"],
        "Працівник з таким email вже існує"
    );
    assert_no_raw_sqlite_constraint(&duplicate_update_body);
}

#[tokio::test]
async fn omitted_display_order_appends_on_create_and_preserves_on_update() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login_admin(&app).await;

    let (development_status, development_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/development",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(development_status, StatusCode::OK);
    let max_goal_order = development_body["goals"]
        .as_array()
        .expect("goals array")
        .iter()
        .filter_map(|goal| goal["displayOrder"].as_i64())
        .max()
        .expect("seeded goals");

    let (created_status, created_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals",
        Some(json!({
            "icon": "target",
            "title": "Append without order",
            "desc": "Missing display_order should append.",
            "status": "on-track",
            "progress": 10,
            "due_date": "2026-04-21"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED);
    assert_eq!(created_body["displayOrder"], max_goal_order + 1);

    let goal_id = created_body["id"].as_i64().expect("created id");
    let (updated_status, updated_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/development/goals/{goal_id}"),
        Some(json!({
            "icon": "target",
            "title": "Preserve without order",
            "desc": "Missing display_order should preserve existing order.",
            "status": "on-track",
            "progress": 20,
            "due_date": "2026-04-22"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(updated_status, StatusCode::OK);
    assert_eq!(updated_body["displayOrder"], max_goal_order + 1);
}

#[tokio::test]
async fn onboarding_task_contract_rejects_non_boolean_priority() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login_admin(&app).await;

    for (label, priority_value) in [
        ("yes-string", json!("yes")),
        ("false-string", json!("false")),
        ("numeric-two", json!(2)),
    ] {
        let (status, body, _) = send_json_with_cookie(
            &app,
            Method::POST,
            "/api/v2/onboarding/tasks",
            Some(json!({
                "status": "active",
                "icon": "task_alt",
                "title": format!("Invalid priority {label}"),
                "desc": "Only JSON booleans are accepted.",
                "is_priority": priority_value,
                "due_date": "2026-04-21"
            })),
            Some(&admin_cookie),
        )
        .await;

        assert_eq!(status, StatusCode::BAD_REQUEST, "{label}");
        assert_eq!(
            body["error"], "Поле is_priority має бути булевим значенням",
            "{label}"
        );
    }

    for (label, priority_value, expected_priority) in [
        ("omitted", None, false),
        ("null", Some(json!(null)), false),
        ("true", Some(json!(true)), true),
        ("false", Some(json!(false)), false),
    ] {
        let mut payload = json!({
            "status": "active",
            "icon": "task_alt",
            "title": format!("Valid priority {label}"),
            "desc": "Valid boolean/default priority.",
            "due_date": "2026-04-21"
        });
        if let Some(priority_value) = priority_value {
            payload["is_priority"] = priority_value;
        }

        let (status, body, _) = send_json_with_cookie(
            &app,
            Method::POST,
            "/api/v2/onboarding/tasks",
            Some(payload),
            Some(&admin_cookie),
        )
        .await;

        assert_eq!(status, StatusCode::CREATED, "{label}");
        assert_eq!(body["priority"], expected_priority, "{label}");
    }
}

#[tokio::test]
async fn write_contract_rejects_negative_display_order() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
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
    let admin_cookie = set_cookie
        .map(|value| session_cookie_fragment(&value))
        .expect("admin cookie");

    let cases = [
        (
            "/api/v2/development/goals",
            json!({
                "icon": "target",
                "title": "Negative goal order",
                "desc": "Must be rejected.",
                "status": "on-track",
                "progress": 10,
                "due_date": "2026-04-21",
                "display_order": -1
            }),
        ),
        (
            "/api/v2/development/feedback",
            json!({
                "employee_id": null,
                "text": "Negative feedback order",
                "feedback_at": "2026-04-21",
                "display_order": -1
            }),
        ),
        (
            "/api/v2/development/meetings",
            json!({
                "date": "2026-04-21",
                "title": "Negative meeting order",
                "meeting_type": "Офіс",
                "display_order": -1
            }),
        ),
        (
            "/api/v2/onboarding/tasks",
            json!({
                "status": "active",
                "icon": "task_alt",
                "title": "Negative task order",
                "desc": "Must be rejected.",
                "is_priority": false,
                "due_date": "2026-04-21",
                "display_order": -1
            }),
        ),
    ];

    for (path, payload) in cases {
        let (status, body, _) =
            send_json_with_cookie(&app, Method::POST, path, Some(payload), Some(&admin_cookie))
                .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{path}");
        assert_eq!(
            body["error"], "Поле display_order не може бути від’ємним",
            "{path}"
        );
    }
}

#[tokio::test]
async fn logout_clears_cookie_and_old_session_can_no_longer_access_me() {
    let (_temp, app) = build_test_app();

    let (login_status, _, set_cookie) = send_json(
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
    let admin_cookie_header = set_cookie.expect("admin cookie header");
    let admin_cookie = session_cookie_fragment(&admin_cookie_header);

    let (logout_status, logout_body, logout_set_cookie) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/auth/logout",
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
        "/api/v2/auth/me",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(me_status, StatusCode::UNAUTHORIZED);
    assert_eq!(me_body["error"], "Сесію не знайдено або термін дії минув");
}
