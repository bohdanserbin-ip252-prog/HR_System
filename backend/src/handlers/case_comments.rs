use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::normalize_required_string,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

use super::json_payload::{JsonPayload, parse_json_payload};

pub async fn add_complaint_comment(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let body = normalize_required_string(&payload, "body");
    if body.is_empty() {
        return Err(AppError::bad_request("Коментар обов'язковий"));
    }

    let comment = state
        .run_db(move |conn| {
            let complaint = db::get_complaint(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Скаргу не знайдено"))?;
            conn.execute(
                "
            INSERT INTO complaint_comments
            (complaint_id, author_user_id, author_username, body)
            VALUES (?, ?, ?, ?)
            ",
                rusqlite::params![complaint.id, user.id, user.username, body],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            db::record_audit_event(
                conn,
                db::AuditEventInput {
                    actor_user_id: Some(user.id),
                    actor_username: Some(&user.username),
                    action: "complaint.comment_added",
                    entity_type: "complaint",
                    entity_id: Some(complaint.id),
                    entity_name: Some(&complaint.title),
                    details: Some("Додано коментар до HR case"),
                },
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            Ok(json!({
                "id": conn.last_insert_rowid(),
                "complaintId": complaint.id,
                "authorUsername": user.username,
                "body": body
            }))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(comment)))
}
