use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{Json, extract::State, http::StatusCode};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

use super::super::enterprise_utils::{audit, int_field, opt_str, simple_rows, str_field};
use super::super::json_payload::{JsonPayload, parse_json_payload};

pub(super) async fn create_shift(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let employee_id = int_field(&payload, "employee_id")?;
    let date = str_field(&payload, "date");
    let start = str_field(&payload, "start_time");
    let end = str_field(&payload, "end_time");
    let role = opt_str(&payload, "role");
    let shift = state
        .run_db(move |conn| {
            let conflict = has_time_off_conflict(conn, employee_id, &date)?;
            conn.execute(
                "INSERT INTO shifts (employee_id, date, start_time, end_time, role, status, conflict_note) VALUES (?, ?, ?, ?, ?, 'scheduled', ?)",
                rusqlite::params![employee_id, date, start, end, role, conflict],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            let id = conn.last_insert_rowid();
            if conflict.is_some() {
                audit(
                    conn,
                    &user,
                    "shift.conflict",
                    "shift",
                    id,
                    "Shift conflicts with approved time-off",
                )?;
            }
            Ok(json!({ "id": id, "employeeId": employee_id, "date": date, "startTime": start, "endTime": end, "role": role, "status": "scheduled", "conflictNote": conflict }))
        })
        .await?;
    Ok((StatusCode::CREATED, Json(shift)))
}

pub(super) async fn list_shifts(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state
        .run_db(|conn| {
            simple_rows(
                conn,
                "SELECT id, employee_id, date, start_time, end_time, status FROM shifts ORDER BY date DESC",
                ["id", "employeeId", "date", "startTime", "endTime", "status"],
            )
        })
        .await?;
    Ok(Json(json!(rows)))
}

fn has_time_off_conflict(
    conn: &rusqlite::Connection,
    employee_id: i64,
    date: &str,
) -> AppResult<Option<&'static str>> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM time_off_requests WHERE employee_id=? AND status='approved' AND ? BETWEEN start_date AND end_date",
            rusqlite::params![employee_id, date],
            |row| row.get(0),
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok((count > 0).then_some("Approved time-off conflict"))
}
