use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::PositionPayload,
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
use super::json_payload::JsonPayload;
use super::validation::validate_position;

pub async fn list_positions(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Vec<crate::models::PositionWithCount>>> {
    auth::require_authenticated(&state, &jar).await?;
    let positions = state
        .run_db(|conn| db::list_positions(conn).map_err(|err| AppError::internal(err.to_string())))
        .await?;
    Ok(Json(positions))
}

pub async fn get_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::Position>> {
    auth::require_authenticated(&state, &jar).await?;
    let position =
        crud_helpers::fetch_optional_by_id(&state, id, "Посаду не знайдено", db::get_position)
            .await?;
    Ok(Json(position))
}

pub async fn create_position(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::Position>)> {
    admin_payload_crud::create_admin_entity_from_payload(
        &state,
        &jar,
        payload,
        PositionPayload::from_json,
        validate_position,
        db_errors::position_write_error,
        db::create_position,
    )
    .await
}

pub async fn update_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::Position>> {
    admin_payload_crud::update_admin_entity_by_id_from_payload(
        &state,
        &jar,
        id,
        payload,
        PositionPayload::from_json,
        validate_position,
        "Посаду не знайдено",
        db_errors::position_write_error,
        db::update_position,
        db::get_position,
    )
    .await
}

pub async fn delete_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Посаду не знайдено",
        db::delete_position,
    )
    .await
}
