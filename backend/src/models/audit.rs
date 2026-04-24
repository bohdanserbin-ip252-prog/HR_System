use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone, Default)]
pub struct AuditQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub action: Option<String>,
    pub actor_user_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEvent {
    pub id: i64,
    pub actor_user_id: Option<i64>,
    pub actor_username: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<i64>,
    pub entity_name: Option<String>,
    pub details: Option<String>,
    pub created_at: String,
}

impl AuditEvent {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            actor_user_id: row.get("actor_user_id")?,
            actor_username: row.get("actor_username")?,
            action: row.get("action")?,
            entity_type: row.get("entity_type")?,
            entity_id: row.get("entity_id")?,
            entity_name: row.get("entity_name")?,
            details: row.get("details")?,
            created_at: row.get("created_at")?,
        })
    }
}
