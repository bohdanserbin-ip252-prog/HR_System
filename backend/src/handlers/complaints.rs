use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    events::broadcast_event,
    models::{AuditQuery, ComplaintPayload, ComplaintsQuery, SuccessResponse},
    pagination::{LegacyOrPaginated, PaginationQuery},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::complaints_helpers::{audit_complaint, validate_complaint_employee};
use super::db_errors;
use super::json_payload::{JsonPayload, parse_json_payload};
use super::validation::validate_complaint;

pub async fn list_complaints(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<ComplaintsQuery>,
    Query(pagination): Query<PaginationQuery>,
) -> AppResult<Json<LegacyOrPaginated<crate::models::EmployeeComplaint>>> {
    auth::require_authenticated(&state, &jar).await?;

    if pagination.page.is_none() && pagination.per_page.is_none() {
        let complaints = state
            .run_db(move |conn| {
                db::list_complaints(conn, &query)
                    .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))
            })
            .await?;
        return Ok(Json(LegacyOrPaginated::Legacy(complaints)));
    }

    let limit = pagination.limit();
    let offset = pagination.offset();

    let (total, complaints) = state
        .run_db(move |conn| {
            let total = db::count_complaints(conn, &query)
                .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
            let complaints = db::list_complaints_paginated(conn, &query, limit, offset)
                .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
            Ok::<_, AppError>((total, complaints))
        })
        .await?;

    Ok(Json(LegacyOrPaginated::Paginated(
        crate::pagination::PaginatedResponse {
            data: complaints,
            page: pagination.effective_page(),
            per_page: pagination.effective_per_page(),
            total,
        },
    )))
}

pub async fn get_complaint(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::EmployeeComplaint>> {
    auth::require_authenticated(&state, &jar).await?;
    let complaint = state
        .run_db(move |conn| {
            db::get_complaint(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    complaint
        .map(Json)
        .ok_or_else(|| AppError::not_found("Скаргу не знайдено"))
}

pub async fn complaint_timeline(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<Vec<crate::models::AuditEvent>>> {
    auth::require_admin(&state, &jar).await?;
    let events = state
        .run_db(move |conn| {
            db::list_audit_events(
                conn,
                &AuditQuery {
                    entity_type: Some("complaint".to_string()),
                    entity_id: Some(id),
                    limit: Some(50),
                    ..Default::default()
                },
            )
            .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(events))
}

pub async fn create_complaint(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::EmployeeComplaint>)> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let mut complaint = ComplaintPayload::from_json(&payload)?;
    validate_complaint(&complaint, true)?;

    if user.role != "admin" {
        complaint.force_open_status();
    }

    let created = state
        .run_db(move |conn| {
            validate_complaint_employee(conn, &complaint)?;
            let created =
                db::create_complaint(conn, &complaint).map_err(db_errors::generic_write_error)?;
            audit_complaint(
                conn,
                &user,
                "complaint.created",
                &created,
                "Скаргу створено",
            )
            .map_err(db_errors::generic_write_error)?;
            Ok(created)
        })
        .await?;

    broadcast_event(
        "complaint.created",
        serde_json::json!({"id": created.id, "title": &created.title}),
    );

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_complaint(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::EmployeeComplaint>> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let complaint = ComplaintPayload::from_json(&payload)?;
    validate_complaint(&complaint, false)?;

    let updated = state
        .run_db(move |conn| {
            validate_complaint_employee(conn, &complaint)?;
            let changes = db::update_complaint(conn, &id, &complaint)
                .map_err(db_errors::generic_write_error)?;
            if changes == 0 {
                return Err(AppError::not_found("Скаргу не знайдено"));
            }

            db::get_complaint(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Скаргу не знайдено"))
                .and_then(|updated| {
                    audit_complaint(
                        conn,
                        &user,
                        "complaint.updated",
                        &updated,
                        "Скаргу оновлено",
                    )
                    .map_err(db_errors::generic_write_error)?;
                    Ok(updated)
                })
        })
        .await?;

    broadcast_event(
        "complaint.updated",
        serde_json::json!({"id": updated.id, "title": &updated.title, "status": &updated.status}),
    );

    Ok(Json(updated))
}

pub async fn delete_complaint(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    let user = auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            let existing =
                db::get_complaint(conn, &id).map_err(|err| AppError::internal(err.to_string()))?;
            db::delete_complaint(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
                .and_then(|deleted| {
                    if let Some(complaint) = existing.as_ref() {
                        audit_complaint(
                            conn,
                            &user,
                            "complaint.deleted",
                            complaint,
                            "Скаргу видалено",
                        )
                        .map_err(db_errors::generic_write_error)?;
                    }
                    Ok(deleted)
                })
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Скаргу не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}
