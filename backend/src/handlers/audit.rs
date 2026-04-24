use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::AuditQuery,
    pagination::{LegacyOrPaginated, PaginationQuery},
};
use axum::{
    Json,
    extract::{Query, State},
};
use axum_extra::extract::cookie::CookieJar;

pub async fn list_audit_events(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<AuditQuery>,
    Query(pagination): Query<PaginationQuery>,
) -> AppResult<Json<LegacyOrPaginated<crate::models::AuditEvent>>> {
    auth::require_admin(&state, &jar).await?;

    if pagination.page.is_none() && pagination.per_page.is_none() {
        let events = state
            .run_db(move |conn| {
                db::list_audit_events(conn, &query)
                    .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))
            })
            .await?;
        return Ok(Json(LegacyOrPaginated::Legacy(events)));
    }

    let limit = pagination.limit();
    let offset = pagination.offset();

    let (total, events) = state
        .run_db(move |conn| {
            let total = db::count_audit_events(conn, &query)
                .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
            let events = db::list_audit_events_paginated(conn, &query, limit, offset)
                .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
            Ok::<_, AppError>((total, events))
        })
        .await?;

    Ok(Json(LegacyOrPaginated::Paginated(
        crate::pagination::PaginatedResponse {
            data: events,
            page: pagination.effective_page(),
            per_page: pagination.effective_per_page(),
            total,
        },
    )))
}
