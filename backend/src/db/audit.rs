use crate::models::{AuditEvent, AuditQuery};
use rusqlite::{Connection, params, params_from_iter, types::Value as SqlValue};

use super::map_all;

pub const AUDIT_SCHEMA_SQL: &str = r#"
    CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER,
        actor_username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_name TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
    "#;

pub struct AuditEventInput<'a> {
    pub actor_user_id: Option<i64>,
    pub actor_username: Option<&'a str>,
    pub action: &'a str,
    pub entity_type: &'a str,
    pub entity_id: Option<i64>,
    pub entity_name: Option<&'a str>,
    pub details: Option<&'a str>,
}

pub fn record_audit_event(conn: &Connection, input: AuditEventInput<'_>) -> rusqlite::Result<()> {
    conn.execute(
        "
        INSERT INTO audit_events
        (actor_user_id, actor_username, action, entity_type, entity_id, entity_name, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            input.actor_user_id,
            input.actor_username,
            input.action,
            input.entity_type,
            input.entity_id,
            input.entity_name,
            input.details
        ],
    )?;
    Ok(())
}

pub fn list_audit_events(
    conn: &Connection,
    query: &AuditQuery,
) -> rusqlite::Result<Vec<AuditEvent>> {
    let limit = query.limit.unwrap_or(30).clamp(1, 100);
    list_audit_events_paginated(conn, query, limit, 0)
}

fn build_audit_where(query: &AuditQuery) -> (String, Vec<SqlValue>) {
    let mut sql = String::from(
        "
        SELECT id, actor_user_id, actor_username, action, entity_type, entity_id,
               entity_name, details, created_at
        FROM audit_events
        WHERE 1=1
        ",
    );
    let mut params: Vec<SqlValue> = Vec::new();

    if let Some(entity_type) = query
        .entity_type
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        sql.push_str(" AND entity_type = ?");
        params.push(SqlValue::Text(entity_type.to_string()));
    }

    if let Some(entity_id) = query.entity_id.as_deref().filter(|value| !value.is_empty()) {
        sql.push_str(" AND entity_id = ?");
        params.push(SqlValue::Text(entity_id.to_string()));
    }

    if let Some(action) = query.action.as_deref().filter(|value| !value.is_empty()) {
        sql.push_str(" AND action = ?");
        params.push(SqlValue::Text(action.to_string()));
    }

    if let Some(actor) = query
        .actor_user_id
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        sql.push_str(" AND actor_user_id = ?");
        params.push(SqlValue::Text(actor.to_string()));
    }

    if let Some(from) = query.from.as_deref().filter(|value| !value.is_empty()) {
        sql.push_str(" AND created_at >= ?");
        params.push(SqlValue::Text(from.to_string()));
    }

    if let Some(to) = query.to.as_deref().filter(|value| !value.is_empty()) {
        sql.push_str(" AND created_at <= ?");
        params.push(SqlValue::Text(to.to_string()));
    }

    (sql, params)
}

pub fn count_audit_events(conn: &Connection, query: &AuditQuery) -> rusqlite::Result<i64> {
    let (sql, params) = build_audit_where(query);
    let count_sql = format!("SELECT COUNT(*) FROM ({}) t", sql);
    let mut stmt = conn.prepare(&count_sql)?;
    let count: i64 = stmt.query_row(params_from_iter(params.iter()), |row| row.get(0))?;
    Ok(count)
}

pub fn list_audit_events_paginated(
    conn: &Connection,
    query: &AuditQuery,
    limit: i64,
    offset: i64,
) -> rusqlite::Result<Vec<AuditEvent>> {
    let (mut sql, mut params) = build_audit_where(query);
    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(SqlValue::Integer(limit));
    params.push(SqlValue::Integer(offset));
    map_all(
        conn,
        &sql,
        params_from_iter(params.iter()),
        AuditEvent::from_row,
    )
}
