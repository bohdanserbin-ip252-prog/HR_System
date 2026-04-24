use crate::{
    AppState, auth,
    error::{AppError, AppResult},
    models::MovePayload,
};
use axum::{Json, http::StatusCode};
use axum_extra::extract::cookie::CookieJar;
use rusqlite::Connection;
use serde_json::Value;

use super::crud_helpers;
use super::json_payload::{JsonPayload, parse_json_payload};
use super::validation::validate_move_payload;

fn parse_and_validate_payload<P, PF, VF>(
    payload: JsonPayload,
    parse_payload: PF,
    validate_payload: VF,
) -> AppResult<P>
where
    PF: FnOnce(&Value) -> AppResult<P>,
    VF: Fn(&P) -> AppResult<()>,
{
    let payload = parse_json_payload(payload)?;
    let parsed = parse_payload(&payload)?;
    validate_payload(&parsed)?;
    Ok(parsed)
}

pub async fn create_admin_entity_from_payload<T, P, PF, VF, CF>(
    state: &AppState,
    jar: &CookieJar,
    payload: JsonPayload,
    parse_payload: PF,
    validate_payload: VF,
    write_error_mapper: fn(rusqlite::Error) -> AppError,
    create_fn: CF,
) -> AppResult<(StatusCode, Json<T>)>
where
    T: Send + 'static,
    P: Send + 'static,
    PF: FnOnce(&Value) -> AppResult<P>,
    VF: Fn(&P) -> AppResult<()>,
    CF: Fn(&Connection, &P) -> rusqlite::Result<T> + Send + 'static,
{
    auth::require_admin(state, jar).await?;
    let parsed = parse_and_validate_payload(payload, parse_payload, validate_payload)?;
    let created = state
        .run_db(move |conn| create_fn(conn, &parsed).map_err(write_error_mapper))
        .await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_admin_entity_by_id_from_payload<T, P, PF, VF, FU, FF>(
    state: &AppState,
    jar: &CookieJar,
    id: String,
    payload: JsonPayload,
    parse_payload: PF,
    validate_payload: VF,
    not_found_message: &'static str,
    write_error_mapper: fn(rusqlite::Error) -> AppError,
    update_fn: FU,
    fetch_fn: FF,
) -> AppResult<Json<T>>
where
    T: Send + 'static,
    P: Send + 'static,
    PF: FnOnce(&Value) -> AppResult<P>,
    VF: Fn(&P) -> AppResult<()>,
    FU: Fn(&Connection, &str, &P) -> rusqlite::Result<usize> + Send + 'static,
    FF: Fn(&Connection, &str) -> rusqlite::Result<Option<T>> + Send + 'static,
{
    auth::require_admin(state, jar).await?;
    let parsed = parse_and_validate_payload(payload, parse_payload, validate_payload)?;
    let updated = crud_helpers::update_and_fetch_by_id(
        state,
        id,
        parsed,
        not_found_message,
        write_error_mapper,
        update_fn,
        fetch_fn,
    )
    .await?;
    Ok(Json(updated))
}

pub async fn delete_admin_entity_by_id<F>(
    state: &AppState,
    jar: &CookieJar,
    id: String,
    not_found_message: &'static str,
    delete_fn: F,
) -> AppResult<Json<crate::models::SuccessResponse>>
where
    F: Fn(&Connection, &str) -> rusqlite::Result<usize> + Send + 'static,
{
    auth::require_admin(state, jar).await?;
    crud_helpers::delete_by_id(state, id, not_found_message, delete_fn).await
}

pub async fn move_admin_entity_by_id<FE, FM>(
    state: &AppState,
    jar: &CookieJar,
    id: String,
    payload: JsonPayload,
    not_found_message: &'static str,
    exists_fn: FE,
    move_fn: FM,
) -> AppResult<Json<crate::models::SuccessResponse>>
where
    FE: Fn(&Connection, &str) -> rusqlite::Result<bool> + Send + 'static,
    FM: Fn(&Connection, &str, &str) -> rusqlite::Result<()> + Send + 'static,
{
    auth::require_admin(state, jar).await?;
    let payload = parse_json_payload(payload)?;
    let move_payload = MovePayload::from_json(&payload);
    validate_move_payload(&move_payload)?;
    crud_helpers::move_by_id(
        state,
        id,
        move_payload.direction,
        not_found_message,
        exists_fn,
        move_fn,
    )
    .await
}
