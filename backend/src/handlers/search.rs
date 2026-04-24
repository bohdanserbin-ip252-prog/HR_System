use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub entity: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct EmployeeSearchResult {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ComplaintSearchResult {
    pub id: i64,
    pub title: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentSearchResult {
    pub id: i64,
    pub title: String,
    pub filename: String,
}

pub async fn search(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<SearchQuery>,
) -> AppResult<(StatusCode, Json<serde_json::Value>)> {
    auth::require_authenticated(&state, &jar).await?;

    let q = query.q.trim();
    if q.is_empty() {
        return Err(AppError::bad_request(
            "Пошуковий запит не може бути порожнім",
        ));
    }

    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let sanitized = q.replace('"', "");

    let result = state
        .run_db(move |conn| match query.entity.as_str() {
            "employees" => {
                let ids = db::search_employees(conn, &sanitized, limit)
                    .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
                let mut results = Vec::new();
                for id in ids {
                    if let Ok(row) = conn.query_row(
                        "SELECT id, first_name, last_name, email FROM employees WHERE id = ?",
                        rusqlite::params![id],
                        |row| {
                            Ok(EmployeeSearchResult {
                                id: row.get(0)?,
                                first_name: row.get(1)?,
                                last_name: row.get(2)?,
                                email: row.get(3)?,
                            })
                        },
                    ) {
                        results.push(row);
                    }
                }
                Ok(serde_json::json!({
                    "entity": "employees",
                    "results": results
                }))
            }
            "complaints" => {
                let ids = db::search_complaints(conn, &sanitized, limit)
                    .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
                let mut results = Vec::new();
                for id in ids {
                    if let Ok(row) = conn.query_row(
                        "SELECT id, title, status FROM employee_complaints WHERE id = ?",
                        rusqlite::params![id],
                        |row| {
                            Ok(ComplaintSearchResult {
                                id: row.get(0)?,
                                title: row.get(1)?,
                                status: row.get(2)?,
                            })
                        },
                    ) {
                        results.push(row);
                    }
                }
                Ok(serde_json::json!({
                    "entity": "complaints",
                    "results": results
                }))
            }
            "documents" => {
                let ids = db::search_documents(conn, &sanitized, limit)
                    .map_err(|err: rusqlite::Error| AppError::internal(err.to_string()))?;
                let mut results = Vec::new();
                for id in ids {
                    if let Ok(row) = conn.query_row(
                        "SELECT id, title, filename FROM employee_documents WHERE id = ?",
                        rusqlite::params![id],
                        |row| {
                            Ok(DocumentSearchResult {
                                id: row.get(0)?,
                                title: row.get(1)?,
                                filename: row.get(2)?,
                            })
                        },
                    ) {
                        results.push(row);
                    }
                }
                Ok(serde_json::json!({
                    "entity": "documents",
                    "results": results
                }))
            }
            _ => Err(AppError::bad_request("Невідомий тип сутності")),
        })
        .await?;

    Ok((StatusCode::OK, Json(result)))
}
