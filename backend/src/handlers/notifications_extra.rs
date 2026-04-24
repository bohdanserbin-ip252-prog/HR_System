use crate::{
    AppState, auth,
    error::{AppError, AppResult},
    models::SuccessResponse,
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use serde::Serialize;

#[derive(Serialize)]
pub struct UnreadCountResponse {
    pub unread_count: i64,
}

pub async fn notification_unread_count(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<UnreadCountResponse>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let count = state
        .run_db(move |conn| {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL",
                    rusqlite::params![user.id],
                    |row| row.get(0),
                )
                .map_err(|err| AppError::internal(err.to_string()))?;
            Ok::<i64, AppError>(count)
        })
        .await?;
    Ok(Json(UnreadCountResponse {
        unread_count: count,
    }))
}

pub async fn mark_all_notifications_read(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<SuccessResponse>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    state
        .run_db(move |conn| {
            conn.execute(
                "UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL",
                rusqlite::params![user.id],
            ).map_err(|err| AppError::internal(err.to_string()))?;
            Ok::<(), AppError>(())
        })
        .await?;
    Ok(Json(SuccessResponse { success: true }))
}
