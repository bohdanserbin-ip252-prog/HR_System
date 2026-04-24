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
    let set_cookie = response
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
    let body = if bytes.is_empty() {
        json!(null)
    } else {
        serde_json::from_slice(&bytes).expect("json body")
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
    let dist_path = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");
    (temp, build_app(AppState::new(db_path, dist_path)))
}

async fn login(app: &axum::Router, username: &str, password: &str) -> String {
    let (status, _, cookie) = send(
        app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({ "username": username, "password": password })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    cookie.expect("session cookie")
}

async fn first_employee_id(app: &axum::Router, cookie: &str) -> i64 {
    let (status, body, _) = send(app, Method::GET, "/api/v2/employees", None, Some(cookie)).await;
    assert_eq!(status, StatusCode::OK);
    body.as_array().unwrap()[0]["id"]
        .as_i64()
        .expect("employee id")
}

#[tokio::test]
async fn canonical_expansion_surfaces_are_available_and_retired_paths_return_not_found() {
    let (_temp, app) = build_test_app();
    let admin = login(&app, "admin", "admin123").await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (profile_status, profile_body, _) =
        send(&app, Method::GET, "/api/v2/profile/me", None, Some(&admin)).await;
    assert_eq!(profile_status, StatusCode::OK);
    assert_eq!(profile_body["viewer"]["username"], "admin");
    assert!(profile_body.get("identity").is_some());

    let (case_status, case_body, _) = send(
        &app,
        Method::POST,
        "/api/v2/complaints",
        Some(json!({
            "employee_id": employee_id,
            "title": "Потрібен HR case",
            "description": "Перевірка stage, priority і due date",
            "severity": "high",
            "complaint_date": "2026-04-21",
            "priority": "urgent",
            "case_stage": "investigation",
            "due_date": "2026-04-25"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(case_status, StatusCode::CREATED);
    assert_eq!(case_body["priority"], "urgent");
    assert_eq!(case_body["caseStage"], "investigation");
    let complaint_id = case_body["id"].as_i64().expect("complaint id");

    let (comment_status, comment_body, _) = send(
        &app,
        Method::POST,
        &format!("/api/v2/complaints/{complaint_id}/comments"),
        Some(json!({ "body": "Перший коментар HR" })),
        Some(&admin),
    )
    .await;
    assert_eq!(comment_status, StatusCode::CREATED);
    assert_eq!(comment_body["body"], "Перший коментар HR");

    let (document_status, document_body, _) = send(
        &app,
        Method::POST,
        "/api/v2/documents",
        Some(json!({
            "employee_id": employee_id,
            "complaint_id": complaint_id,
            "title": "Пояснення",
            "document_type": "case",
            "filename": "note.txt",
            "mime_type": "text/plain",
            "content_base64": "SGVsbG8=",
            "expires_at": "2026-12-31"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(document_status, StatusCode::CREATED);
    assert_eq!(document_body["filename"], "note.txt");

    let (review_status, review_body, _) = send(
        &app,
        Method::POST,
        "/api/v2/reviews",
        Some(json!({
            "employee_id": employee_id,
            "period": "2026 Q2",
            "status": "self_review",
            "summary": "Початок review",
            "scores": [{ "competency": "Комунікація", "score": 4, "note": "Добре" }]
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(review_status, StatusCode::CREATED);
    assert_eq!(review_body["scores"][0]["competency"], "Комунікація");

    let (time_off_status, time_off_body, _) = send(
        &app,
        Method::POST,
        "/api/v2/time-off-requests",
        Some(json!({
            "employee_id": employee_id,
            "start_date": "2026-05-01",
            "end_date": "2026-05-03",
            "request_type": "vacation",
            "reason": "Відпустка"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(time_off_status, StatusCode::CREATED);
    assert_eq!(time_off_body["status"], "pending");

    let (org_status, org_body, _) =
        send(&app, Method::GET, "/api/v2/organization/chart", None, Some(&admin)).await;
    assert_eq!(org_status, StatusCode::OK);
    assert!(org_body.as_array().is_some_and(|items| !items.is_empty()));

    let (activity_status, activity_body, _) =
        send(&app, Method::GET, "/api/v2/activity", None, Some(&admin)).await;
    assert_eq!(activity_status, StatusCode::OK);
    assert!(activity_body["items"]
        .as_array()
        .is_some_and(|items| !items.is_empty()));

    let (flags_status, flags_body, _) = send(
        &app,
        Method::GET,
        "/api/v2/system/feature-flags",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(flags_status, StatusCode::OK);
    assert!(flags_body
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["key"] == "payroll_module"));

    let (flag_update_status, flag_update_body, _) = send(
        &app,
        Method::PUT,
        "/api/v2/system/feature-flags/payroll_module",
        Some(json!({
            "enabled": true,
            "rollout_percentage": 100,
            "allowed_roles": "admin"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(flag_update_status, StatusCode::OK);
    assert_eq!(flag_update_body["success"], true);

    let (flag_status, flag_body, _) = send(
        &app,
        Method::GET,
        "/api/v2/system/feature-flags/payroll_module",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(flag_status, StatusCode::OK);
    assert_eq!(flag_body["key"], "payroll_module");
    assert_eq!(flag_body["enabled"], true);

    let (profile_after_status, profile_after_body, _) = send(
        &app,
        Method::GET,
        &format!("/api/v2/profile/{employee_id}"),
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(profile_after_status, StatusCode::OK);
    assert!(profile_after_body["documents"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["filename"] == "note.txt"));
    assert!(profile_after_body["reviews"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["period"] == "2026 Q2"));
    assert!(profile_after_body["timeOff"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["requestType"] == "vacation"));

    let (audit_status, audit_body, _) = send(
        &app,
        Method::GET,
        "/api/v2/audit?action=document.created&entity_type=document",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(audit_status, StatusCode::OK);
    assert!(
        audit_body
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["action"] == "document.created")
    );

    let (legacy_time_off_status, _, _) =
        send(&app, Method::GET, "/api/v2/time-off", None, Some(&admin)).await;
    assert_eq!(legacy_time_off_status, StatusCode::NOT_FOUND);

    let (legacy_org_chart_status, _, _) =
        send(&app, Method::GET, "/api/v2/org-chart", None, Some(&admin)).await;
    assert_eq!(legacy_org_chart_status, StatusCode::NOT_FOUND);

    let (legacy_admin_flags_status, _, _) = send(
        &app,
        Method::GET,
        "/api/v2/admin/feature-flags",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(legacy_admin_flags_status, StatusCode::NOT_FOUND);

    let (legacy_flag_status, _, _) = send(
        &app,
        Method::GET,
        "/api/v2/feature-flags/payroll_module",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(legacy_flag_status, StatusCode::NOT_FOUND);
}
