use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use rusqlite::Connection;
use rusqlite::types::Value as SqlValue;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct BulkDeletePayload {
    pub ids: Vec<i64>,
}

#[derive(Debug, Deserialize)]
pub struct BulkUpdateEmployeesPayload {
    pub ids: Vec<i64>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkUpdateComplaintsPayload {
    pub ids: Vec<i64>,
    pub status: String,
    pub resolution_notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BulkDeleteResponse {
    pub deleted: usize,
}

#[derive(Debug, Serialize)]
pub struct BulkUpdateResponse {
    pub updated: usize,
}

fn build_in_placeholders(count: usize) -> String {
    std::iter::repeat("?")
        .take(count)
        .collect::<Vec<_>>()
        .join(", ")
}

fn execute_bulk_statement(
    conn: &Connection,
    ids: &[i64],
    mut params: Vec<SqlValue>,
    sql_builder: impl FnOnce(&str) -> String,
) -> AppResult<usize> {
    if ids.is_empty() {
        return Ok(0);
    }

    let placeholders = build_in_placeholders(ids.len());
    let sql = sql_builder(&placeholders);
    params.extend(ids.iter().copied().map(SqlValue::Integer));
    conn.execute(&sql, rusqlite::params_from_iter(&params))
        .map_err(|err| AppError::internal(err.to_string()))
}

async fn run_bulk_statement(
    state: &AppState,
    ids: Vec<i64>,
    params: Vec<SqlValue>,
    sql_builder: impl FnOnce(&str) -> String + Send + 'static,
) -> AppResult<usize> {
    state
        .run_db(move |conn| execute_bulk_statement(conn, &ids, params, sql_builder))
        .await
}

async fn run_bulk_delete(state: &AppState, ids: Vec<i64>, table: &'static str) -> AppResult<usize> {
    run_bulk_statement(state, ids, Vec::new(), move |placeholders| {
        format!("DELETE FROM {table} WHERE id IN ({placeholders})")
    })
    .await
}

pub async fn bulk_delete_employees(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<BulkDeletePayload>,
) -> AppResult<Json<BulkDeleteResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = run_bulk_delete(&state, payload.ids, "employees").await?;

    Ok(Json(BulkDeleteResponse { deleted }))
}

pub async fn bulk_update_employees(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<BulkUpdateEmployeesPayload>,
) -> AppResult<Json<BulkUpdateResponse>> {
    auth::require_admin(&state, &jar).await?;

    if !matches!(payload.status.as_str(), "active" | "on_leave" | "fired") {
        return Err(AppError::bad_request("Некоректний статус працівника"));
    }

    let updated = run_bulk_statement(
        &state,
        payload.ids,
        vec![SqlValue::Text(payload.status)],
        |placeholders| {
            format!(
                "UPDATE employees SET status = ?, updated_at = datetime('now') WHERE id IN ({placeholders})"
            )
        },
    )
    .await?;

    Ok(Json(BulkUpdateResponse { updated }))
}

pub async fn bulk_delete_complaints(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<BulkDeletePayload>,
) -> AppResult<Json<BulkDeleteResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = run_bulk_delete(&state, payload.ids, "employee_complaints").await?;

    Ok(Json(BulkDeleteResponse { deleted }))
}

pub async fn bulk_update_complaints(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<BulkUpdateComplaintsPayload>,
) -> AppResult<Json<BulkUpdateResponse>> {
    auth::require_admin(&state, &jar).await?;

    if !matches!(
        payload.status.as_str(),
        "open" | "in_review" | "resolved" | "rejected"
    ) {
        return Err(AppError::bad_request("Некоректний статус скарги"));
    }

    let updated = run_bulk_statement(
        &state,
        payload.ids,
        vec![
            SqlValue::Text(payload.status.clone()),
            payload
                .resolution_notes
                .map(SqlValue::Text)
                .unwrap_or(SqlValue::Null),
            SqlValue::Text(payload.status),
        ],
        |placeholders| {
            format!(
                "UPDATE employee_complaints SET status = ?, resolution_notes = COALESCE(?, resolution_notes), closed_at = CASE WHEN ? IN ('resolved','rejected') THEN datetime('now') ELSE closed_at END, updated_at = datetime('now') WHERE id IN ({placeholders})"
            )
        },
    )
    .await?;

    Ok(Json(BulkUpdateResponse { updated }))
}
