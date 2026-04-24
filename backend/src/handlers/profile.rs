use crate::{
    AppState, auth,
    error::{AppError, AppResult},
    models::User,
};
use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::extract::cookie::CookieJar;
use rusqlite::{Connection, OptionalExtension, params};
use serde_json::{Value, json};

use super::profile_support::{
    empty_profile_response, query_json_array, query_json_array_without_params,
};

pub async fn profile_me(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let response = state
        .run_db(move |conn| build_profile_response(conn, &user, user.employee_id, true))
        .await?;
    Ok(Json(response))
}

pub async fn profile_by_employee_id(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(employee_id): Path<i64>,
) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    if user.role != "admin" && user.employee_id != Some(employee_id) {
        return Err(AppError::forbidden("Недостатньо прав для перегляду профілю"));
    }

    let response = state
        .run_db(move |conn| build_profile_response(conn, &user, Some(employee_id), false))
        .await?;
    Ok(Json(response))
}

fn build_profile_response(
    conn: &Connection,
    user: &User,
    employee_id: Option<i64>,
    is_self: bool,
) -> AppResult<Value> {
    let Some(employee_id) = employee_id else {
        return Ok(empty_profile_response(user, None, is_self));
    };

    let employee = conn
        .query_row(
            "
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.middle_name,
                e.birth_date,
                e.email,
                e.phone,
                e.address,
                e.photo_url,
                e.hire_date,
                e.status,
                e.salary,
                d.id as department_id,
                d.name as department_name,
                p.id as position_id,
                p.title as position_title
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN positions p ON p.id = e.position_id
            WHERE e.id = ?
            ",
            params![employee_id],
            |row| {
                let salary = row.get::<_, f64>("salary")?;
                Ok(json!({
                    "identity": {
                        "id": row.get::<_, i64>("id")?,
                        "first_name": row.get::<_, String>("first_name")?,
                        "last_name": row.get::<_, String>("last_name")?,
                        "middle_name": row.get::<_, Option<String>>("middle_name")?,
                        "birth_date": row.get::<_, Option<String>>("birth_date")?,
                        "email": row.get::<_, Option<String>>("email")?,
                        "phone": row.get::<_, Option<String>>("phone")?,
                        "address": row.get::<_, Option<String>>("address")?,
                        "photo_url": row.get::<_, Option<String>>("photo_url")?
                    },
                    "employment": {
                        "employee_id": row.get::<_, i64>("id")?,
                        "hire_date": row.get::<_, String>("hire_date")?,
                        "status": row.get::<_, String>("status")?,
                        "salary": salary,
                        "department_id": row.get::<_, Option<i64>>("department_id")?,
                        "department_name": row.get::<_, Option<String>>("department_name")?,
                        "position_id": row.get::<_, Option<i64>>("position_id")?,
                        "position_title": row.get::<_, Option<String>>("position_title")?
                    }
                }))
            },
        )
        .optional()
        .map_err(|err| AppError::internal(err.to_string()))?
        .ok_or_else(|| AppError::not_found("Працівника не знайдено"))?;

    let mut response = empty_profile_response(user, Some(employee_id), is_self);
    response["identity"] = employee["identity"].clone();
    response["employment"] = employee["employment"].clone();
    response["documents"] = query_json_array(
        conn,
        "
        SELECT id, title, filename, document_type, mime_type, expires_at, created_at
        FROM employee_documents
        WHERE employee_id = ?
        ORDER BY created_at DESC
        ",
        employee_id,
    )?;
    response["complaints"] = query_json_array(
        conn,
        "
        SELECT id, title, status, severity, complaint_date, reporter_name, resolution_notes
        FROM employee_complaints
        WHERE employee_id = ?
        ORDER BY created_at DESC
        ",
        employee_id,
    )?;
    response["time_off"] = query_json_array(
        conn,
        "
        SELECT id, start_date, end_date, request_type, status, reason, created_at
        FROM time_off_requests
        WHERE employee_id = ?
        ORDER BY created_at DESC
        ",
        employee_id,
    )?;
    response["reviews"] = query_json_array(
        conn,
        "
        SELECT id, period, status, summary, finalized_at, created_at
        FROM performance_reviews
        WHERE employee_id = ?
        ORDER BY created_at DESC
        ",
        employee_id,
    )?;
    response["training"] = query_json_array(
        conn,
        "
        SELECT
            ta.id,
            ta.status,
            ta.progress,
            ta.completed_at,
            tc.id as course_id,
            tc.title as course_title,
            tc.due_date
        FROM training_assignments ta
        LEFT JOIN training_courses tc ON tc.id = ta.course_id
        WHERE ta.employee_id = ?
        ORDER BY ta.id DESC
        ",
        employee_id,
    )?;
    response["payroll"] = query_json_array(
        conn,
        "
        SELECT
            pi.id,
            pr.period,
            pi.gross,
            pi.bonuses,
            pi.deductions,
            pi.net
        FROM payroll_items pi
        LEFT JOIN payroll_runs pr ON pr.id = pi.run_id
        WHERE pi.employee_id = ?
        ORDER BY pi.id DESC
        ",
        employee_id,
    )?;
    response["shifts"] = query_json_array(
        conn,
        "
        SELECT id, date, start_time, end_time, role, note, status, conflict_note
        FROM shifts
        WHERE employee_id = ?
        ORDER BY date DESC, id DESC
        ",
        employee_id,
    )?;
    response["activity"] = query_json_array(
        conn,
        "
        SELECT id, action, entity_type, entity_name, details, created_at
        FROM audit_events
        WHERE entity_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        ",
        employee_id,
    )?;
    response["development"] = json!({
        "goals": query_json_array_without_params(
            conn,
            "
            SELECT id, icon, title, desc, status, progress, due_date, display_order
            FROM development_goals
            ORDER BY display_order, id
            ",
        )?,
        "feedback": query_json_array(
            conn,
            "
            SELECT id, text, feedback_at, display_order
            FROM development_feedback
            WHERE employee_id = ?
            ORDER BY display_order, id
            ",
            employee_id,
        )?,
        "meetings": query_json_array_without_params(
            conn,
            "
            SELECT id, date, title, meeting_type, display_order
            FROM development_meetings
            ORDER BY display_order, id
            ",
        )?
    });

    Ok(response)
}
