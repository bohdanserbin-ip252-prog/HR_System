use crate::{AppState, db, error::AppResult, models::OnboardingTaskPayload};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::admin_payload_crud;
use super::db_errors;
use super::json_payload::JsonPayload;
use super::validation::validate_onboarding_task;

pub async fn create_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::OnboardingTask>)> {
    admin_payload_crud::create_admin_entity_from_payload(
        &state,
        &jar,
        payload,
        OnboardingTaskPayload::from_json,
        validate_onboarding_task,
        db_errors::generic_write_error,
        db::create_onboarding_task,
    )
    .await
}

pub async fn update_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::OnboardingTask>> {
    admin_payload_crud::update_admin_entity_by_id_from_payload(
        &state,
        &jar,
        id,
        payload,
        OnboardingTaskPayload::from_json,
        validate_onboarding_task,
        "Onboarding-задачу не знайдено",
        db_errors::generic_write_error,
        db::update_onboarding_task,
        db::get_onboarding_task,
    )
    .await
}

pub async fn delete_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Onboarding-задачу не знайдено",
        db::delete_onboarding_task,
    )
    .await
}

pub async fn move_onboarding_task(
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
        "Onboarding-задачу не знайдено",
        |conn, item_id| db::get_onboarding_task(conn, item_id).map(|task| task.is_some()),
        |conn, item_id, direction| db::move_onboarding_task(conn, item_id, direction).map(|_| ()),
    )
    .await
}
