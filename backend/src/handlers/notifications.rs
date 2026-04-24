use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

pub async fn list_notifications(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let rows = state.run_db(move |conn| {
        conn.execute(
            "
            INSERT INTO notifications (user_id, title, body, target_type, target_id)
            SELECT ?, 'Службова подія', details, entity_type, entity_id
            FROM audit_events a
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.user_id = ? AND n.target_type = a.entity_type AND n.target_id = a.entity_id
                      AND n.body = a.details
            )
            ORDER BY a.id DESC LIMIT 20
            ",
            rusqlite::params![user.id, user.id],
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, title, body, target_type, target_id, read_at, created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 30"
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let rows = stmt.query_map([user.id], |row| Ok(json!({
            "id": row.get::<_, i64>(0)?, "title": row.get::<_, String>(1)?,
            "body": row.get::<_, Option<String>>(2)?, "targetType": row.get::<_, Option<String>>(3)?,
            "targetId": row.get::<_, Option<i64>>(4)?, "readAt": row.get::<_, Option<String>>(5)?,
            "createdAt": row.get::<_, String>(6)?
        }))).map_err(|err| AppError::internal(err.to_string()))?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|err| AppError::internal(err.to_string()))
    }).await?;
    Ok(Json(json!(rows)))
}

pub async fn mark_notification_read(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    state
        .run_db(move |conn| {
            conn.execute(
                "UPDATE notifications SET read_at=datetime('now') WHERE id=? AND user_id=?",
                rusqlite::params![id, user.id],
            )
            .map(|_| ())
            .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!({ "success": true })))
}
