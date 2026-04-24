use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

use super::enterprise_utils::*;
use super::json_payload::{JsonPayload, parse_json_payload};

#[path = "docs.rs"]
mod docs;
#[path = "enterprise_imports_reports.rs"]
mod enterprise_imports_reports;
#[path = "enterprise_shifts.rs"]
mod enterprise_shifts;

pub fn enterprise_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v2/docs", get(docs::docs_ui))
        .route(
            "/api/v2/payroll/runs",
            get(list_payroll_runs).post(create_payroll_run),
        )
        .route(
            "/api/v2/payroll/runs/{id}/finalize",
            post(finalize_payroll_run),
        )
        .route(
            "/api/v2/training/courses",
            get(list_courses).post(create_course),
        )
        .route("/api/v2/training/assignments", post(assign_course))
        .route(
            "/api/v2/shifts",
            get(enterprise_shifts::list_shifts).post(enterprise_shifts::create_shift),
        )
        .route("/api/v2/workflows/start", post(start_workflow))
        .route("/api/v2/workflows", get(list_workflows))
        .route(
            "/api/v2/import/{kind}/preview",
            post(enterprise_imports_reports::import_preview),
        )
        .route(
            "/api/v2/import/{kind}/commit",
            post(enterprise_imports_reports::import_commit),
        )
        .route(
            "/api/v2/reports/{kind}",
            get(enterprise_imports_reports::report_json),
        )
        .route(
            "/api/v2/reports/{kind}/csv",
            get(enterprise_imports_reports::report_csv),
        )
}

async fn create_payroll_run(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let period = str_field(&payload, "period");
    let notes = opt_str(&payload, "notes");
    if period.is_empty() {
        return Err(AppError::bad_request("Період payroll обов'язковий"));
    }
    let run = state
        .run_db(move |conn| {
            conn.execute(
                "INSERT INTO payroll_runs (period, notes) VALUES (?, ?)",
                rusqlite::params![period, notes],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            let id = conn.last_insert_rowid();
            let items = seed_payroll_items(conn, id)?;
            audit(conn, &user, "payroll.created", "payroll_run", id, &period)?;
            Ok(json!({ "id": id, "period": period, "status": "draft", "items": items }))
        })
        .await?;
    Ok((StatusCode::CREATED, Json(run)))
}

async fn list_payroll_runs(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state
        .run_db(|conn| {
            simple_rows(
                conn,
                "SELECT id, period, status, COALESCE(notes,'') FROM payroll_runs ORDER BY id DESC",
                ["id", "period", "status", "notes"],
            )
        })
        .await?;
    Ok(Json(json!(rows)))
}

async fn finalize_payroll_run(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    let user = auth::require_admin(&state, &jar).await?;
    let result = state.run_db(move |conn| {
        conn.execute("UPDATE payroll_runs SET status='finalized', finalized_at=datetime('now') WHERE id=?", [id])
            .map_err(|err| AppError::internal(err.to_string()))?;
        audit(conn, &user, "payroll.finalized", "payroll_run", id, "Payroll finalized")?;
        Ok(json!({ "id": id, "status": "finalized" }))
    }).await?;
    Ok(Json(result))
}

async fn create_course(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let title = str_field(&payload, "title");
    if title.is_empty() {
        return Err(AppError::bad_request("Назва курсу обов'язкова"));
    }
    let description = opt_str(&payload, "description");
    let due_date = opt_str(&payload, "due_date");
    let course = state
        .run_db(move |conn| {
            conn.execute(
                "INSERT INTO training_courses (title, description, due_date) VALUES (?, ?, ?)",
                rusqlite::params![title, description, due_date],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            let id = conn.last_insert_rowid();
            audit(
                conn,
                &user,
                "training.course_created",
                "training_course",
                id,
                &title,
            )?;
            Ok(json!({ "id": id, "title": title, "description": description, "dueDate": due_date }))
        })
        .await?;
    Ok((StatusCode::CREATED, Json(course)))
}

async fn list_courses(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state.run_db(|conn| simple_rows(conn, "SELECT id, title, COALESCE(description,''), COALESCE(due_date,'') FROM training_courses ORDER BY id DESC", ["id","title","description","dueDate"])).await?;
    Ok(Json(json!(rows)))
}

async fn assign_course(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let course_id = int_field(&payload, "course_id")?;
    let employee_id = int_field(&payload, "employee_id")?;
    let assignment = state.run_db(move |conn| {
        conn.execute("INSERT INTO training_assignments (course_id, employee_id) VALUES (?, ?)", [course_id, employee_id])
            .map_err(|err| AppError::internal(err.to_string()))?;
        Ok(json!({ "id": conn.last_insert_rowid(), "courseId": course_id, "employeeId": employee_id, "status": "assigned", "progress": 0 }))
    }).await?;
    Ok((StatusCode::CREATED, Json(assignment)))
}

async fn start_workflow(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let key = str_field(&payload, "workflow_key");
    let entity_type = str_field(&payload, "entity_type");
    let entity_id = payload["entity_id"].as_i64();
    let item = state.run_db(move |conn| {
        conn.execute("INSERT INTO workflow_instances (workflow_key, entity_type, entity_id) VALUES (?, ?, ?)", rusqlite::params![key, entity_type, entity_id])
            .map_err(|err| AppError::internal(err.to_string()))?;
        let id = conn.last_insert_rowid();
        audit(conn, &user, "workflow.started", "workflow", id, &key)?;
        Ok(json!({ "id": id, "workflowKey": key, "entityType": entity_type, "entityId": entity_id, "currentStep": "start", "status": "active" }))
    }).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

async fn list_workflows(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state.run_db(|conn| simple_rows(conn, "SELECT id, workflow_key, entity_type, status FROM workflow_instances ORDER BY id DESC", ["id","workflowKey","entityType","status"])).await?;
    Ok(Json(json!(rows)))
}
