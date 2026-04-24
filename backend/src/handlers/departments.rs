use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::DepartmentPayload,
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
use super::validation::validate_department;

pub async fn list_departments(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Vec<crate::models::DepartmentWithCount>>> {
    auth::require_authenticated(&state, &jar).await?;
    let departments = state
        .run_db(|conn| {
            db::list_departments(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(departments))
}

pub async fn get_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::Department>> {
    auth::require_authenticated(&state, &jar).await?;
    let department =
        crud_helpers::fetch_optional_by_id(&state, id, "Відділ не знайдено", db::get_department)
            .await?;
    Ok(Json(department))
}

pub async fn create_department(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::Department>)> {
    admin_payload_crud::create_admin_entity_from_payload(
        &state,
        &jar,
        payload,
        |payload| Ok(DepartmentPayload::from_json(payload)),
        validate_department,
        db_errors::department_write_error,
        db::create_department,
    )
    .await
}

pub async fn update_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::Department>> {
    admin_payload_crud::update_admin_entity_by_id_from_payload(
        &state,
        &jar,
        id,
        payload,
        |payload| Ok(DepartmentPayload::from_json(payload)),
        validate_department,
        "Відділ не знайдено",
        db_errors::department_write_error,
        db::update_department,
        db::get_department,
    )
    .await
}

pub async fn delete_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::SuccessResponse>> {
    admin_payload_crud::delete_admin_entity_by_id(
        &state,
        &jar,
        id,
        "Відділ не знайдено",
        db::delete_department,
    )
    .await
}
