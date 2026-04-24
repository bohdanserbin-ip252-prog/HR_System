use crate::{
    AppState, auth,
    error::{AppError, AppResult},
    models::SuccessResponse,
};
use axum::{Json, http::StatusCode};
use axum_extra::extract::cookie::CookieJar;
use rusqlite::Connection;
use serde::Serialize;
use serde_json::{Value, json};

#[derive(Clone, Copy)]
pub enum AccessRequirement {
    Authenticated,
    Admin,
}

async fn authorize(state: &AppState, jar: &CookieJar, access: AccessRequirement) -> AppResult<()> {
    match access {
        AccessRequirement::Authenticated => {
            auth::require_authenticated(state, jar).await?;
        }
        AccessRequirement::Admin => {
            auth::require_admin(state, jar).await?;
        }
    }
    Ok(())
}

fn fetch_required_by_id<T, F>(
    conn: &Connection,
    id: &str,
    not_found_message: &'static str,
    fetch_fn: &F,
) -> AppResult<T>
where
    F: Fn(&Connection, &str) -> rusqlite::Result<Option<T>>,
{
    fetch_fn(conn, id)
        .map_err(|err| AppError::internal(err.to_string()))?
        .ok_or_else(|| AppError::not_found(not_found_message))
}

pub async fn fetch_optional_by_id<T, F>(
    state: &AppState,
    id: String,
    not_found_message: &'static str,
    fetch_fn: F,
) -> AppResult<T>
where
    T: Send + 'static,
    F: Fn(&Connection, &str) -> rusqlite::Result<Option<T>> + Send + 'static,
{
    let result = state
        .run_db(move |conn| fetch_fn(conn, &id).map_err(|err| AppError::internal(err.to_string())))
        .await?;

    result.ok_or_else(|| AppError::not_found(not_found_message))
}

pub async fn update_and_fetch_by_id<T, P, FU, FF>(
    state: &AppState,
    id: String,
    payload: P,
    not_found_message: &'static str,
    write_error_mapper: fn(rusqlite::Error) -> AppError,
    update_fn: FU,
    fetch_fn: FF,
) -> AppResult<T>
where
    T: Send + 'static,
    P: Send + 'static,
    FU: Fn(&Connection, &str, &P) -> rusqlite::Result<usize> + Send + 'static,
    FF: Fn(&Connection, &str) -> rusqlite::Result<Option<T>> + Send + 'static,
{
    state
        .run_db(move |conn| {
            let changes = update_fn(conn, &id, &payload).map_err(write_error_mapper)?;
            if changes == 0 {
                return Err(AppError::not_found(not_found_message));
            }

            fetch_required_by_id(conn, &id, not_found_message, &fetch_fn)
        })
        .await
}

pub async fn update_and_fetch_by_id_checked<T, P, FV, FU, FF>(
    state: &AppState,
    id: String,
    payload: P,
    not_found_message: &'static str,
    write_error_mapper: fn(rusqlite::Error) -> AppError,
    validate_fn: FV,
    update_fn: FU,
    fetch_fn: FF,
) -> AppResult<T>
where
    T: Send + 'static,
    P: Send + 'static,
    FV: Fn(&Connection, &P) -> AppResult<()> + Send + 'static,
    FU: Fn(&Connection, &str, &P) -> rusqlite::Result<usize> + Send + 'static,
    FF: Fn(&Connection, &str) -> rusqlite::Result<Option<T>> + Send + 'static,
{
    state
        .run_db(move |conn| {
            validate_fn(conn, &payload)?;

            let changes = update_fn(conn, &id, &payload).map_err(write_error_mapper)?;
            if changes == 0 {
                return Err(AppError::not_found(not_found_message));
            }

            fetch_required_by_id(conn, &id, not_found_message, &fetch_fn)
        })
        .await
}

pub async fn delete_by_id<F>(
    state: &AppState,
    id: String,
    not_found_message: &'static str,
    delete_fn: F,
) -> AppResult<Json<SuccessResponse>>
where
    F: Fn(&Connection, &str) -> rusqlite::Result<usize> + Send + 'static,
{
    let deleted = state
        .run_db(move |conn| delete_fn(conn, &id).map_err(|err| AppError::internal(err.to_string())))
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found(not_found_message));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn move_by_id<FE, FM>(
    state: &AppState,
    id: String,
    direction: String,
    not_found_message: &'static str,
    exists_fn: FE,
    move_fn: FM,
) -> AppResult<Json<SuccessResponse>>
where
    FE: Fn(&Connection, &str) -> rusqlite::Result<bool> + Send + 'static,
    FM: Fn(&Connection, &str, &str) -> rusqlite::Result<()> + Send + 'static,
{
    state
        .run_db(move |conn| {
            if !exists_fn(conn, &id).map_err(|err| AppError::internal(err.to_string()))? {
                return Err(AppError::not_found(not_found_message));
            }

            move_fn(conn, &id, &direction).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn list_entities<T, F>(
    state: &AppState,
    jar: &CookieJar,
    access: AccessRequirement,
    list_fn: F,
) -> AppResult<Json<Vec<T>>>
where
    T: Serialize + Send + 'static,
    F: Fn(&Connection) -> AppResult<Vec<T>> + Send + 'static,
{
    authorize(state, jar, access).await?;
    let items = state.run_db(list_fn).await?;
    Ok(Json(items))
}

pub async fn create_entity<T, P, F>(
    state: &AppState,
    jar: &CookieJar,
    access: AccessRequirement,
    payload: P,
    create_fn: F,
) -> AppResult<(StatusCode, Json<T>)>
where
    T: Serialize + Send + 'static,
    P: Send + 'static,
    F: Fn(&Connection, &P) -> AppResult<T> + Send + 'static,
{
    authorize(state, jar, access).await?;
    let item = state.run_db(move |conn| create_fn(conn, &payload)).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

pub async fn list_entities_value<T, F>(
    state: &AppState,
    jar: &CookieJar,
    access: AccessRequirement,
    list_fn: F,
) -> AppResult<Json<Value>>
where
    T: Serialize + Send + 'static,
    F: Fn(&Connection) -> AppResult<Vec<T>> + Send + 'static,
{
    let Json(items) = list_entities(state, jar, access, list_fn).await?;
    Ok(Json(json!(items)))
}

pub async fn create_entity_value<T, P, F>(
    state: &AppState,
    jar: &CookieJar,
    access: AccessRequirement,
    payload: P,
    create_fn: F,
) -> AppResult<(StatusCode, Json<Value>)>
where
    T: Serialize + Send + 'static,
    P: Send + 'static,
    F: Fn(&Connection, &P) -> AppResult<T> + Send + 'static,
{
    let (status, Json(item)) = create_entity(state, jar, access, payload, create_fn).await?;
    Ok((status, Json(json!(item))))
}

pub async fn delete_entity<F>(
    state: &AppState,
    jar: &CookieJar,
    access: AccessRequirement,
    delete_fn: F,
) -> AppResult<Json<Value>>
where
    F: Fn(&Connection) -> AppResult<()> + Send + 'static,
{
    authorize(state, jar, access).await?;
    state.run_db(delete_fn).await?;
    Ok(Json(json!({ "success": true })))
}
