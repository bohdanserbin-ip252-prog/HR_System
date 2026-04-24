use crate::{AppState, db, error::AppResult, models::DevelopmentGoalPayload};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::admin_payload_crud;
use super::db_errors;
use super::json_payload::JsonPayload;
use super::validation::validate_development_goal;

pub async fn create_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentGoal>)> {
    admin_payload_crud::create_admin_entity_from_payload(
        &state,
        &jar,
        payload,
        DevelopmentGoalPayload::from_json,
        validate_development_goal,
        db_errors::generic_write_error,
        db::create_development_goal,
    )
    .await
}

pub async fn update_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::DevelopmentGoal>> {
    admin_payload_crud::update_admin_entity_by_id_from_payload(
        &state,
        &jar,
        id,
        payload,
        DevelopmentGoalPayload::from_json,
        validate_development_goal,
        "Ціль розвитку не знайдена",
        db_errors::generic_write_error,
        db::update_development_goal,
        db::get_development_goal,
    )
    .await
}

pub async fn delete_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Ціль розвитку не знайдена",
        db::delete_development_goal,
    )
    .await
}

pub async fn move_development_goal(
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
        "Ціль розвитку не знайдена",
        |conn, item_id| db::get_development_goal(conn, item_id).map(|goal| goal.is_some()),
        |conn, item_id, direction| db::move_development_goal(conn, item_id, direction).map(|_| ()),
    )
    .await
}
