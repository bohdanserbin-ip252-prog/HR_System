use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::DevelopmentFeedbackPayload,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::admin_payload_crud;
use super::crud_helpers;
use super::db_errors;
use super::json_payload::{JsonPayload, parse_json_payload};
use super::validation::validate_development_feedback;

fn validate_feedback_employee(
    conn: &rusqlite::Connection,
    feedback: &DevelopmentFeedbackPayload,
) -> AppResult<()> {
    if let Some(employee_id) = feedback.employee_id
        && db::get_employee(conn, employee_id)
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
    {
        return Err(AppError::bad_request("Працівника не знайдено"));
    }

    Ok(())
}

pub async fn create_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentFeedback>)> {
    auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let feedback = DevelopmentFeedbackPayload::from_json(&payload)?;
    validate_development_feedback(&feedback)?;

    let created = state
        .run_db(move |conn| {
            validate_feedback_employee(conn, &feedback)?;
            db::create_development_feedback(conn, &feedback).map_err(db_errors::generic_write_error)
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::DevelopmentFeedback>> {
    auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let feedback = DevelopmentFeedbackPayload::from_json(&payload)?;
    validate_development_feedback(&feedback)?;

    let updated = crud_helpers::update_and_fetch_by_id_checked(
        &state,
        id,
        feedback,
        "Відгук не знайдено",
        db_errors::generic_write_error,
        validate_feedback_employee,
        db::update_development_feedback,
        db::get_development_feedback,
    )
    .await?;

    Ok(Json(updated))
}

pub async fn delete_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Відгук не знайдено",
        db::delete_development_feedback,
    )
    .await
}

pub async fn move_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::move_admin_entity_by_id(
        &state,
        &jar,
        id,
        payload,
        "Відгук не знайдено",
        |conn, item_id| db::get_development_feedback(conn, item_id).map(|item| item.is_some()),
        |conn, item_id, direction| {
            db::move_development_feedback(conn, item_id, direction).map(|_| ())
        },
    )
    .await
}
