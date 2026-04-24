use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use serde::Serialize;

#[derive(Serialize)]
pub struct ActivityItem {
    pub id: String,
    pub timestamp: String,
    pub actor: String,
    pub action: String,
    pub entity_type: String,
    pub entity_name: Option<String>,
    pub details: Option<String>,
    pub category: String,
}

#[derive(Serialize)]
pub struct ActivityResponse {
    pub items: Vec<ActivityItem>,
}

pub async fn activity(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<ActivityResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let items = state
        .run_db(|conn| {
            let mut all_items = Vec::new();

            let mut stmt = conn.prepare(
                "SELECT id, actor_username, action, entity_type, entity_name, details, created_at
                 FROM audit_events
                 ORDER BY created_at DESC LIMIT 30",
            ).map_err(|err| AppError::internal(err.to_string()))?;
            let audit_rows = stmt.query_map([], |row| {
                Ok(ActivityItem {
                    id: format!("audit-{}", row.get::<_, i64>("id")?),
                    timestamp: row.get("created_at")?,
                    actor: row.get("actor_username").unwrap_or_else(|_| "system".to_string()),
                    action: row.get("action")?,
                    entity_type: row.get("entity_type")?,
                    entity_name: row.get("entity_name").ok(),
                    details: row.get("details").ok(),
                    category: "audit".to_string(),
                })
            }).map_err(|err| AppError::internal(err.to_string()))?;
            for row in audit_rows {
                if let Ok(item) = row {
                    all_items.push(item);
                }
            }

            let mut stmt = conn.prepare(
                "SELECT c.id, c.title, c.status, c.created_at,
                        e.first_name || ' ' || e.last_name as employee_name
                 FROM employee_complaints c
                 LEFT JOIN employees e ON c.employee_id = e.id
                 ORDER BY c.created_at DESC LIMIT 15",
            ).map_err(|err| AppError::internal(err.to_string()))?;
            let complaint_rows = stmt.query_map([], |row| {
                Ok(ActivityItem {
                    id: format!("complaint-{}", row.get::<_, i64>("id")?),
                    timestamp: row.get("created_at")?,
                    actor: "system".to_string(),
                    action: row.get::<_, String>("status")?,
                    entity_type: "complaint".to_string(),
                    entity_name: row.get("employee_name").ok(),
                    details: row.get::<_, Option<String>>("title")?,
                    category: "complaint".to_string(),
                })
            }).map_err(|err| AppError::internal(err.to_string()))?;
            for row in complaint_rows {
                if let Ok(item) = row {
                    all_items.push(item);
                }
            }

            let mut stmt = conn.prepare(
                "SELECT t.id, t.start_date, t.end_date, t.request_type, t.status, t.reason, t.created_at,
                        e.first_name || ' ' || e.last_name as employee_name
                 FROM time_off_requests t
                 LEFT JOIN employees e ON t.employee_id = e.id
                 ORDER BY t.created_at DESC LIMIT 15",
            ).map_err(|err| AppError::internal(err.to_string()))?;
            let timeoff_rows = stmt.query_map([], |row| {
                Ok(ActivityItem {
                    id: format!("timeoff-{}", row.get::<_, i64>("id")?),
                    timestamp: row.get("created_at")?,
                    actor: row.get("employee_name").unwrap_or_else(|_| "system".to_string()),
                    action: row.get::<_, String>("status")?,
                    entity_type: "time_off_request".to_string(),
                    entity_name: row.get("employee_name").ok(),
                    details: row.get::<_, Option<String>>("reason")?,
                    category: "time_off_request".to_string(),
                })
            }).map_err(|err| AppError::internal(err.to_string()))?;
            for row in timeoff_rows {
                if let Ok(item) = row {
                    all_items.push(item);
                }
            }

            all_items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
            all_items.truncate(50);
            Ok(all_items)
        })
        .await?;

    Ok(Json(ActivityResponse { items }))
}
