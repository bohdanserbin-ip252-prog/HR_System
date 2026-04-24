use crate::{
    AppState, auth,
    error::AppResult,
};
use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

use super::super::enterprise_utils::simple_rows;
use super::super::json_payload::{JsonPayload, parse_json_payload};

pub(super) async fn import_preview(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(kind): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let csv = payload["csv"].as_str().unwrap_or_default();
    let rows = parse_csv_preview(csv);
    Ok(Json(
        json!({ "type": kind, "validRows": rows, "rejectedRows": [] }),
    ))
}

pub(super) async fn import_commit(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(kind): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    Ok(Json(
        json!({ "type": kind, "committedRows": parse_csv_preview(payload["csv"].as_str().unwrap_or_default()).len() }),
    ))
}

pub(super) async fn report_json(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(kind): Path<String>,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state
        .run_db(move |conn| {
            report_rows(conn, &kind).map(|rows| json!({ "type": kind, "rows": rows }))
        })
        .await?;
    Ok(Json(rows))
}

pub(super) async fn report_csv(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(kind): Path<String>,
) -> AppResult<String> {
    auth::require_authenticated(&state, &jar).await?;
    state
        .run_db(move |conn| report_rows(conn, &kind).map(|rows| to_csv(&rows)))
        .await
}

fn parse_csv_preview(csv: &str) -> Vec<Value> {
    let mut lines = csv.lines();
    let headers: Vec<String> = lines
        .next()
        .unwrap_or_default()
        .split(',')
        .map(|item| item.trim().to_string())
        .collect();
    lines
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let mut map = serde_json::Map::new();
            for (key, value) in headers.iter().zip(line.split(',')) {
                map.insert(key.clone(), json!(value.trim()));
            }
            Value::Object(map)
        })
        .collect()
}

fn report_rows(conn: &rusqlite::Connection, kind: &str) -> AppResult<Vec<Value>> {
    match kind {
        "payroll" => simple_rows(
            conn,
            "SELECT id, period, status FROM payroll_runs ORDER BY id DESC",
            ["id", "period", "status"],
        ),
        "training" => simple_rows(
            conn,
            "SELECT id, title, COALESCE(due_date,'') FROM training_courses ORDER BY id DESC",
            ["id", "title", "dueDate"],
        ),
        "scheduling" => simple_rows(
            conn,
            "SELECT id, employee_id, date, status FROM shifts ORDER BY date DESC",
            ["id", "employeeId", "date", "status"],
        ),
        _ => simple_rows(
            conn,
            "SELECT id, action, entity_type, created_at FROM audit_events ORDER BY id DESC LIMIT 50",
            ["id", "action", "entityType", "createdAt"],
        ),
    }
}

fn to_csv(rows: &[Value]) -> String {
    let Some(first) = rows.first().and_then(Value::as_object) else {
        return String::new();
    };
    let headers: Vec<&String> = first.keys().collect();
    let mut lines = vec![
        headers
            .iter()
            .map(|key| key.as_str())
            .collect::<Vec<_>>()
            .join(","),
    ];
    for row in rows {
        let object = row.as_object().expect("rows are objects");
        lines.push(
            headers
                .iter()
                .map(|key| object.get(*key).map_or(String::new(), clean_csv))
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    lines.join("\n")
}

fn clean_csv(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_string)
        .unwrap_or_else(|| value.to_string())
        .replace(',', " ")
}
