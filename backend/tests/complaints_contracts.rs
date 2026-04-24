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

async fn send_json(
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
        .map(|value| value.split(';').next().unwrap_or_default().to_string());
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body bytes")
        .to_bytes();
    let body = if bytes.is_empty() {
        json!(null)
    } else {
        serde_json::from_slice(&bytes).expect("json response body")
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
    initialize_database(&db_path).expect("database initialized");
    let app = build_app(AppState::new(db_path, temp.path().join("dist")));
    (temp, app)
}

async fn login(app: &axum::Router, username: &str, password: &str) -> String {
    let (status, _, set_cookie) = send_json(
        app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({ "username": username, "password": password })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    set_cookie.expect("session cookie")
}

async fn first_employee_id(app: &axum::Router, cookie: &str) -> i64 {
    let (status, body, _) =
        send_json(app, Method::GET, "/api/v2/employees", None, Some(cookie)).await;
    assert_eq!(status, StatusCode::OK);
    body.as_array()
        .and_then(|items| items.first())
        .and_then(|employee| employee["id"].as_i64())
        .expect("seeded employee id")
}

fn complaint_payload(employee_id: i64) -> Value {
    json!({
        "employee_id": employee_id,
        "reporter_name": "Олена Репортер",
        "title": "Порушення комунікації",
        "description": "Працівник ігнорує домовленості щодо командної роботи.",
        "severity": "high",
        "complaint_date": "2026-04-21"
    })
}

#[tokio::test]
async fn complaints_api_supports_viewer_create_admin_moderation_and_listing() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login(&app, "admin", "admin123").await;
    let viewer_cookie = login(&app, "viewer", "viewer123").await;
    let employee_id = first_employee_id(&app, &admin_cookie).await;

    let (unauth_status, unauth_body, _) =
        send_json(&app, Method::GET, "/api/v2/complaints", None, None).await;
    assert_eq!(unauth_status, StatusCode::UNAUTHORIZED);
    assert_eq!(unauth_body["error"], "Необхідно увійти в систему");

    let mut payload = complaint_payload(employee_id);
    payload["status"] = json!("resolved");
    payload["resolution_notes"] = json!("Should not be accepted from viewer");
    let (created_status, created_body, _) = send_json(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(payload),
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED);
    assert_eq!(created_body["title"], "Порушення комунікації");
    assert_eq!(created_body["status"], "open");
    assert_eq!(created_body["resolutionNotes"], Value::Null);
    assert_eq!(created_body["employee"]["id"], employee_id);
    let complaint_id = created_body["id"].as_i64().expect("complaint id");

    let (list_status, list_body, _) = send_json(
        &app,
        Method::GET,
        "/api/v2/complaints",
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    assert!(
        list_body
            .as_array()
            .is_some_and(|items| items.iter().any(|item| item["id"] == complaint_id))
    );

    let (viewer_update_status, viewer_update_body, _) = send_json(
        &app,
        Method::PUT,
        &format!("/api/v2/complaints/{complaint_id}"),
        Some(complaint_payload(employee_id)),
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(viewer_update_status, StatusCode::FORBIDDEN);
    assert_eq!(
        viewer_update_body["error"],
        "Недостатньо прав для виконання дії"
    );

    let mut admin_update = complaint_payload(employee_id);
    admin_update["status"] = json!("in_review");
    admin_update["resolution_notes"] = json!("HR проводить перевірку");
    let (updated_status, updated_body, _) = send_json(
        &app,
        Method::PUT,
        &format!("/api/v2/complaints/{complaint_id}"),
        Some(admin_update),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(updated_status, StatusCode::OK);
    assert_eq!(updated_body["status"], "in_review");
    assert_eq!(updated_body["resolutionNotes"], "HR проводить перевірку");

    let (timeline_status, timeline_body, _) = send_json(
        &app,
        Method::GET,
        &format!("/api/v2/complaints/{complaint_id}/timeline"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(timeline_status, StatusCode::OK);
    let timeline = timeline_body.as_array().expect("timeline array");
    assert!(
        timeline
            .iter()
            .any(|item| item["action"] == "complaint.created")
    );
    assert!(
        timeline
            .iter()
            .any(|item| item["action"] == "complaint.updated")
    );

    let (viewer_delete_status, _, _) = send_json(
        &app,
        Method::DELETE,
        &format!("/api/v2/complaints/{complaint_id}"),
        None,
        Some(&viewer_cookie),
    )
    .await;
    assert_eq!(viewer_delete_status, StatusCode::FORBIDDEN);

    let (delete_status, delete_body, _) = send_json(
        &app,
        Method::DELETE,
        &format!("/api/v2/complaints/{complaint_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_status, StatusCode::OK);
    assert_eq!(delete_body["success"], true);
}

#[tokio::test]
async fn complaints_api_validates_payload_and_relations() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login(&app, "admin", "admin123").await;
    let employee_id = first_employee_id(&app, &admin_cookie).await;

    let invalid_cases = [
        (
            "missing employee",
            json!({ "title": "A", "description": "B", "severity": "low", "complaint_date": "2026-04-21" }),
            "Працівник, назва, опис і дата скарги обов'язкові",
        ),
        (
            "missing relation",
            complaint_payload(999999),
            "Працівника не знайдено",
        ),
        (
            "bad severity",
            {
                let mut payload = complaint_payload(employee_id);
                payload["severity"] = json!("urgent");
                payload
            },
            "Некоректна серйозність скарги",
        ),
        (
            "bad date",
            {
                let mut payload = complaint_payload(employee_id);
                payload["complaint_date"] = json!("2026-04-31");
                payload
            },
            "Дата скарги має бути у форматі YYYY-MM-DD",
        ),
        (
            "bad status",
            {
                let mut payload = complaint_payload(employee_id);
                payload["status"] = json!("archived");
                payload
            },
            "Некоректний статус скарги",
        ),
    ];

    for (label, payload, expected_error) in invalid_cases {
        let (status, body, _) = send_json(
            &app,
            Method::POST,
            "/api/v2/complaints",
            Some(payload),
            Some(&admin_cookie),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{label}");
        assert_eq!(body["error"], expected_error, "{label}");
    }
}

#[tokio::test]
async fn complaints_survive_employee_delete_with_null_employee_reference() {
    let (_temp, app) = build_test_app();
    let admin_cookie = login(&app, "admin", "admin123").await;
    let employee_id = first_employee_id(&app, &admin_cookie).await;

    let (created_status, created_body, _) = send_json(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(complaint_payload(employee_id)),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED);
    let complaint_id = created_body["id"].as_i64().expect("complaint id");

    let (delete_employee_status, _, _) = send_json(
        &app,
        Method::DELETE,
        &format!("/api/v2/employees/{employee_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_employee_status, StatusCode::OK);

    let (get_status, get_body, _) = send_json(
        &app,
        Method::GET,
        &format!("/api/v2/complaints/{complaint_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(get_status, StatusCode::OK);
    assert_eq!(get_body["employee"], Value::Null);
    assert_eq!(get_body["title"], "Порушення комунікації");

    let (update_status, update_body, _) = send_json(
        &app,
        Method::PUT,
        &format!("/api/v2/complaints/{complaint_id}"),
        Some(json!({
            "title": "Порушення комунікації",
            "description": "Працівник вже видалений, але кейс закрито.",
            "severity": "high",
            "status": "resolved",
            "complaint_date": "2026-04-21",
            "resolution_notes": "Закрито після перевірки"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(update_status, StatusCode::OK);
    assert_eq!(update_body["employee"], Value::Null);
    assert_eq!(update_body["status"], "resolved");
}
