use crate::{AppState, db, error::AppResult, models::DevelopmentMeetingPayload};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::admin_payload_crud;
use super::db_errors;
use super::json_payload::JsonPayload;
use super::validation::validate_development_meeting;

pub async fn create_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentMeeting>)> {
    admin_payload_crud::create_admin_entity_from_payload(
        &state,
        &jar,
        payload,
        DevelopmentMeetingPayload::from_json,
        validate_development_meeting,
        db_errors::generic_write_error,
        db::create_development_meeting,
    )
    .await
}

pub async fn update_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::DevelopmentMeeting>> {
    admin_payload_crud::update_admin_entity_by_id_from_payload(
        &state,
        &jar,
        id,
        payload,
        DevelopmentMeetingPayload::from_json,
        validate_development_meeting,
        "Зустріч не знайдено",
        db_errors::generic_write_error,
        db::update_development_meeting,
        db::get_development_meeting,
    )
    .await
}

pub async fn delete_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Зустріч не знайдено",
        db::delete_development_meeting,
    )
    .await
}

pub async fn move_development_meeting(
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
        "Зустріч не знайдено",
        |conn, item_id| db::get_development_meeting(conn, item_id).map(|meeting| meeting.is_some()),
        |conn, item_id, direction| {
            db::move_development_meeting(conn, item_id, direction).map(|_| ())
        },
    )
    .await
}
