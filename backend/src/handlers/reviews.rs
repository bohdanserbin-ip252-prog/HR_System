use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::{normalize_optional_i64, normalize_optional_string, normalize_required_string},
};
use axum::{Json, extract::State, http::StatusCode};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

use super::json_payload::{JsonPayload, parse_json_payload};

pub async fn create_review(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let employee_id = normalize_optional_i64(&payload, "employee_id")?
        .ok_or_else(|| AppError::bad_request("Працівник обов'язковий"))?;
    let period = normalize_required_string(&payload, "period");
    let status = normalize_required_string(&payload, "status");
    let summary = normalize_optional_string(&payload, "summary");
    if period.is_empty()
        || !matches!(
            status.as_str(),
            "draft" | "self_review" | "manager_review" | "finalized"
        )
    {
        return Err(AppError::bad_request("Некоректні дані performance review"));
    }
    let scores = payload["scores"].as_array().cloned().unwrap_or_default();

    let review = state.run_db(move |conn| {
        conn.execute(
            "INSERT INTO performance_reviews (employee_id, period, status, summary, created_by) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![employee_id, period, status, summary, user.id],
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let id = conn.last_insert_rowid();
        let mut score_values = Vec::new();
        for score in scores {
            let competency = normalize_required_string(&score, "competency");
            let value = score["score"].as_i64().unwrap_or(0);
            let note = normalize_optional_string(&score, "note");
            if competency.is_empty() || !(1..=5).contains(&value) {
                return Err(AppError::bad_request("Некоректна оцінка компетенції"));
            }
            conn.execute(
                "INSERT INTO performance_review_scores (review_id, competency, score, note) VALUES (?, ?, ?, ?)",
                rusqlite::params![id, competency, value, note],
            ).map_err(|err| AppError::internal(err.to_string()))?;
            score_values.push(json!({ "competency": competency, "score": value, "note": note }));
        }
        db::record_audit_event(conn, db::AuditEventInput {
            actor_user_id: Some(user.id),
            actor_username: Some(&user.username),
            action: "review.created",
            entity_type: "review",
            entity_id: Some(id),
            entity_name: Some(&period),
            details: Some("Performance review створено"),
        }).map_err(|err| AppError::internal(err.to_string()))?;
        Ok(json!({ "id": id, "employeeId": employee_id, "period": period, "status": status, "summary": summary, "scores": score_values }))
    }).await?;
    Ok((StatusCode::CREATED, Json(review)))
}

pub async fn list_reviews(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let reviews = state.run_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, employee_id, period, status, summary, finalized_at, created_at FROM performance_reviews ORDER BY id DESC"
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let rows = stmt.query_map([], |row| Ok(json!({
            "id": row.get::<_, i64>(0)?, "employeeId": row.get::<_, i64>(1)?,
            "period": row.get::<_, String>(2)?, "status": row.get::<_, String>(3)?,
            "summary": row.get::<_, Option<String>>(4)?, "finalizedAt": row.get::<_, Option<String>>(5)?,
            "createdAt": row.get::<_, String>(6)?
        }))).map_err(|err| AppError::internal(err.to_string()))?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|err| AppError::internal(err.to_string()))
    }).await?;
    Ok(Json(json!(reviews)))
}
