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
async fn enterprise_modules_are_available_and_integrated() {
    let (_temp, app) = build_test_app();
    let admin = login(&app).await;
    let employee_id = first_employee_id(&app, &admin).await;

    let (roles_status, roles, _) =
        send(&app, Method::GET, "/api/v2/rbac/roles", None, Some(&admin)).await;
    assert_eq!(roles_status, StatusCode::OK);
    assert!(
        roles
            .as_array()
            .unwrap()
            .iter()
            .any(|role| role["key"] == "hr_manager")
    );

    let (payroll_status, payroll, _) = send(
        &app,
        Method::POST,
        "/api/v2/payroll/runs",
        Some(json!({ "period": "2026-05", "notes": "May payroll" })),
        Some(&admin),
    )
    .await;
    assert_eq!(payroll_status, StatusCode::CREATED);
    assert_eq!(payroll["status"], "draft");
    assert!(
        payroll["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["employeeId"] == employee_id)
    );

    let run_id = payroll["id"].as_i64().unwrap();
    let (finalize_status, finalized, _) = send(
        &app,
        Method::POST,
        &format!("/api/v2/payroll/runs/{run_id}/finalize"),
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(finalize_status, StatusCode::OK);
    assert_eq!(finalized["status"], "finalized");

    let (course_status, course, _) = send(
        &app,
        Method::POST,
        "/api/v2/training/courses",
        Some(json!({ "title": "Security Basics", "description": "Core LMS", "due_date": "2026-06-01" })),
        Some(&admin),
    )
    .await;
    assert_eq!(course_status, StatusCode::CREATED);
    let course_id = course["id"].as_i64().unwrap();

    let (assign_status, assignment, _) = send(
        &app,
        Method::POST,
        "/api/v2/training/assignments",
        Some(json!({ "course_id": course_id, "employee_id": employee_id })),
        Some(&admin),
    )
    .await;
    assert_eq!(assign_status, StatusCode::CREATED);
    assert_eq!(assignment["status"], "assigned");

    let (shift_status, shift, _) = send(
        &app,
        Method::POST,
        "/api/v2/shifts",
        Some(json!({
            "employee_id": employee_id,
            "date": "2026-05-10",
            "start_time": "09:00",
            "end_time": "17:00",
            "role": "day"
        })),
        Some(&admin),
    )
    .await;
    assert_eq!(shift_status, StatusCode::CREATED);
    assert_eq!(shift["status"], "scheduled");

    let (workflow_status, workflow, _) = send(
        &app,
        Method::POST,
        "/api/v2/workflows/start",
        Some(json!({ "workflow_key": "payroll_finalization", "entity_type": "payroll_run", "entity_id": run_id })),
        Some(&admin),
    )
    .await;
    assert_eq!(workflow_status, StatusCode::CREATED);
    assert_eq!(workflow["status"], "active");

    let (import_status, preview, _) = send(
        &app,
        Method::POST,
        "/api/v2/import/departments/preview",
        Some(json!({ "csv": "name,description\nQA,Quality team" })),
        Some(&admin),
    )
    .await;
    assert_eq!(import_status, StatusCode::OK);
    assert_eq!(preview["validRows"].as_array().unwrap().len(), 1);

    let (report_status, report, _) = send(
        &app,
        Method::GET,
        "/api/v2/reports/payroll",
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(report_status, StatusCode::OK);
    assert_eq!(report["type"], "payroll");

    let (profile_status, profile, _) = send(
        &app,
        Method::GET,
        &format!("/api/v2/profile/{employee_id}"),
        None,
        Some(&admin),
    )
    .await;
    assert_eq!(profile_status, StatusCode::OK);
    assert!(
        profile["payroll"]
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["period"] == "2026-05")
    );
}
