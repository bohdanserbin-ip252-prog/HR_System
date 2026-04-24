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

#[tokio::test]
async fn smoke_checks_pass() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    let fake_frontend = temp.path().join("dist");
    initialize_database(&db_path).expect("database initialized");

    let app = build_app(AppState::new(db_path, fake_frontend));

    let (login_status, login_body, admin_cookie) = send_json(
        &app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({
            "username": " admin ",
            "password": "admin123"
        })),
    )
    .await;
    assert_eq!(login_status, StatusCode::OK);
    assert_eq!(login_body["user"]["username"], "admin");
    let admin_cookie = admin_cookie.expect("admin session cookie");

    let (me_status, me_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/auth/me",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(me_status, StatusCode::OK);
    assert_eq!(me_body["role"], "admin");

    let (stats_status, stats_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/stats",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(stats_status, StatusCode::OK);
    assert!(stats_body["totalEmployees"].is_number());

    let (development_status, development_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/development",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(development_status, StatusCode::OK);
    assert!(
        development_body["goals"]
            .as_array()
            .is_some_and(|goals| !goals.is_empty())
    );
    let first_goal = development_body["goals"]
        .as_array()
        .and_then(|goals| goals.first())
        .expect("goal exists");
    assert!(first_goal["id"].is_number());
    assert!(first_goal.get("statusText").is_none());
    assert!(first_goal.get("dueDate").is_some());
    assert!(
        development_body["feedback"]
            .as_array()
            .is_some_and(|feedback| !feedback.is_empty())
    );
    let first_feedback = development_body["feedback"]
        .as_array()
        .and_then(|feedback| feedback.first())
        .expect("feedback exists");
    assert!(first_feedback["id"].is_number());
    assert!(first_feedback.get("time").is_none());
    assert!(first_feedback.get("feedbackAt").is_some());
    assert!(
        development_body["meetings"]
            .as_array()
            .is_some_and(|meetings| !meetings.is_empty())
    );

    let (onboarding_status, onboarding_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/onboarding",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(onboarding_status, StatusCode::OK);
    assert_eq!(onboarding_body["team"]["totalCount"], 34);
    assert!(
        onboarding_body["tasks"]
            .as_array()
            .is_some_and(|tasks| !tasks.is_empty())
    );
    let first_task = onboarding_body["tasks"]
        .as_array()
        .and_then(|tasks| tasks.first())
        .expect("task exists");
    assert!(first_task["id"].is_number());
    assert!(first_task.get("time").is_none());
    assert!(first_task.get("dueDate").is_some());
    assert_eq!(onboarding_body["progress"]["completedCount"], 1);
    assert_eq!(onboarding_body["progress"]["totalCount"], 2);

    let (create_goal_status, create_goal_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/goals",
        Some(json!({
            "icon": "insights",
            "title": "Нова ціль розвитку",
            "desc": "Підготувати квартальний огляд розвитку команди.",
            "status": "on-track",
            "progress": 15,
            "due_date": "2026-04-21",
            "display_order": 9
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(create_goal_status, StatusCode::CREATED);
    let created_goal_id = create_goal_body["id"].as_i64().expect("goal id");

    let (move_goal_status, move_goal_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        &format!("/api/v2/development/goals/{created_goal_id}/move"),
        Some(json!({
            "direction": "up"
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(move_goal_status, StatusCode::OK);
    assert_eq!(move_goal_body["success"], true);

    let (reordered_development_status, reordered_development_body, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/development",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(reordered_development_status, StatusCode::OK);
    let created_goal_position = reordered_development_body["goals"]
        .as_array()
        .and_then(|goals| goals.iter().position(|goal| goal["id"] == created_goal_id))
        .expect("created goal in reordered list");
    assert!(
        created_goal_position + 1
            < reordered_development_body["goals"]
                .as_array()
                .expect("goal list")
                .len()
    );

    let (update_goal_status, update_goal_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/development/goals/{created_goal_id}"),
        Some(json!({
            "icon": "insights",
            "title": "Нова ціль розвитку",
            "desc": "Підготувати квартальний огляд розвитку команди.",
            "status": "completed",
            "progress": 100,
            "due_date": "2026-04-21",
            "display_order": 9
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(update_goal_status, StatusCode::OK);
    assert_eq!(update_goal_body["status"], "completed");

    let (delete_goal_status, delete_goal_body, _) = send_json_with_cookie(
        &app,
        Method::DELETE,
        &format!("/api/v2/development/goals/{created_goal_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_goal_status, StatusCode::OK);
    assert_eq!(delete_goal_body["success"], true);

    let (create_feedback_status, create_feedback_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/feedback",
        Some(json!({
            "employee_id": 1,
            "feedback_at": "2026-03-31",
            "text": "План розвитку команди оновлено та узгоджено.",
            "display_order": 5
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(create_feedback_status, StatusCode::CREATED);
    let created_feedback_id = create_feedback_body["id"].as_i64().expect("feedback id");

    let (update_feedback_status, update_feedback_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/development/feedback/{created_feedback_id}"),
        Some(json!({
            "employee_id": 1,
            "feedback_at": "2026-03-31",
            "text": "План розвитку команди оновлено, узгоджено та передано менеджеру.",
            "display_order": 5
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(update_feedback_status, StatusCode::OK);
    assert!(
        update_feedback_body["text"]
            .as_str()
            .is_some_and(|text| text.contains("менеджеру"))
    );

    let (delete_feedback_status, delete_feedback_body, _) = send_json_with_cookie(
        &app,
        Method::DELETE,
        &format!("/api/v2/development/feedback/{created_feedback_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_feedback_status, StatusCode::OK);
    assert_eq!(delete_feedback_body["success"], true);

    let (create_meeting_status, create_meeting_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/development/meetings",
        Some(json!({
            "date": "2026-04-09",
            "title": "Планова 1:1 розмова",
            "meeting_type": "Онлайн",
            "display_order": 4
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(create_meeting_status, StatusCode::CREATED);
    let created_meeting_id = create_meeting_body["id"].as_i64().expect("meeting id");

    let (update_meeting_status, update_meeting_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/development/meetings/{created_meeting_id}"),
        Some(json!({
            "date": "2026-04-10",
            "title": "Планова 1:1 розмова",
            "meeting_type": "Офіс",
            "display_order": 4
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(update_meeting_status, StatusCode::OK);
    assert_eq!(update_meeting_body["type"], "Офіс");

    let (delete_meeting_status, delete_meeting_body, _) = send_json_with_cookie(
        &app,
        Method::DELETE,
        &format!("/api/v2/development/meetings/{created_meeting_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_meeting_status, StatusCode::OK);
    assert_eq!(delete_meeting_body["success"], true);

    let (create_task_status, create_task_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/onboarding/tasks",
        Some(json!({
            "status": "pending",
            "icon": "bookmark",
            "title": "Підготовка welcome-пакету",
            "desc": "Підготувати welcome-пакет і чеклист першого дня.",
            "is_priority": true,
            "due_date": "2026-04-05",
            "display_order": 5
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(create_task_status, StatusCode::CREATED);
    let created_task_id = create_task_body["id"].as_i64().expect("task id");

    let (update_task_status, update_task_body, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        &format!("/api/v2/onboarding/tasks/{created_task_id}"),
        Some(json!({
            "status": "active",
            "icon": "bookmark",
            "title": "Підготовка welcome-пакету",
            "desc": "Підготувати welcome-пакет і чеклист першого дня.",
            "is_priority": false,
            "due_date": "2026-04-06",
            "display_order": 5
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(update_task_status, StatusCode::OK);
    assert_eq!(update_task_body["status"], "active");

    let (delete_task_status, delete_task_body, _) = send_json_with_cookie(
        &app,
        Method::DELETE,
        &format!("/api/v2/onboarding/tasks/{created_task_id}"),
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(delete_task_status, StatusCode::OK);
    assert_eq!(delete_task_body["success"], true);

    let (invalid_employee_status, _, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/employees",
        Some(json!({
            "first_name": "Test",
            "last_name": "User",
            "hire_date": "2024-01-01",
            "salary": -100
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_employee_status, StatusCode::BAD_REQUEST);

    let (invalid_position_status, _, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/positions",
        Some(json!({
            "title": "Broken Range",
            "min_salary": 5000,
            "max_salary": 1000
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_position_status, StatusCode::BAD_REQUEST);

    let (missing_delete_status, _, _) = send_json_with_cookie(
        &app,
        Method::DELETE,
        "/api/v2/employees/999999",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(missing_delete_status, StatusCode::NOT_FOUND);

    let (missing_update_status, _, _) = send_json_with_cookie(
        &app,
        Method::PUT,
        "/api/v2/positions/999999",
        Some(json!({
            "title": "Ghost",
            "min_salary": 1000,
            "max_salary": 2000
        })),
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(missing_update_status, StatusCode::NOT_FOUND);

    let (user_login_status, user_login_body, user_cookie) = send_json(
        &app,
        Method::POST,
        "/api/v2/auth/login",
        Some(json!({
            "username": " viewer ",
            "password": "viewer123"
        })),
    )
    .await;
    assert_eq!(user_login_status, StatusCode::OK);
    assert_eq!(user_login_body["user"]["role"], "user");
    let user_cookie = user_cookie.expect("user session cookie");

    let (forbidden_create_status, _, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/departments",
        Some(json!({
            "name": "Blocked",
            "description": "Should fail"
        })),
        Some(&user_cookie),
    )
    .await;
    assert_eq!(forbidden_create_status, StatusCode::FORBIDDEN);

    let (forbidden_task_status, _, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/onboarding/tasks",
        Some(json!({
            "status": "pending",
            "icon": "checklist",
            "title": "Blocked task",
            "desc": "Should fail for viewer"
        })),
        Some(&user_cookie),
    )
    .await;
    assert_eq!(forbidden_task_status, StatusCode::FORBIDDEN);

    let (forbidden_move_status, _, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/onboarding/tasks/1/move",
        Some(json!({
            "direction": "down"
        })),
        Some(&user_cookie),
    )
    .await;
    assert_eq!(forbidden_move_status, StatusCode::FORBIDDEN);

    let (logout_status, logout_body, _) = send_json_with_cookie(
        &app,
        Method::POST,
        "/api/v2/auth/logout",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(logout_status, StatusCode::OK);
    assert_eq!(logout_body["success"], true);

    let (post_logout_status, _, _) = send_json_with_cookie(
        &app,
        Method::GET,
        "/api/v2/stats",
        None,
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(post_logout_status, StatusCode::UNAUTHORIZED);
}
