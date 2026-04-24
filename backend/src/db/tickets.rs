use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Ticket {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub category: String,
    pub priority: String,
    pub status: String,
    pub requester_name: Option<String>,
    pub assignee_name: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TicketPayload {
    pub title: String,
    pub description: String,
    pub category: String,
    pub priority: Option<String>,
    pub requester_name: Option<String>,
    pub assignee_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTicketStatusPayload {
    pub status: String,
}

impl Ticket {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            description: row.get("description")?,
            category: row.get("category")?,
            priority: row.get("priority")?,
            status: row.get("status")?,
            requester_name: row.get("requester_name")?,
            assignee_name: row.get("assignee_name")?,
            created_at: row.get("created_at")?,
            resolved_at: row.get("resolved_at")?,
        })
    }
}

pub fn list_tickets(conn: &Connection) -> rusqlite::Result<Vec<Ticket>> {
    let mut stmt = conn.prepare("SELECT * FROM tickets ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], Ticket::from_row)?;
    rows.collect()
}

pub fn create_ticket(conn: &Connection, payload: &TicketPayload) -> rusqlite::Result<Ticket> {
    let priority = payload.priority.as_deref().unwrap_or("medium");
    conn.execute(
        "INSERT INTO tickets (title, description, category, priority, requester_name, assignee_name)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![
            payload.title,
            payload.description,
            payload.category,
            priority,
            payload.requester_name,
            payload.assignee_name
        ],
    )?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT * FROM tickets WHERE id = ?",
        params![id],
        Ticket::from_row,
    )
}

pub fn update_ticket_status(conn: &Connection, id: i64, status: &str) -> rusqlite::Result<bool> {
    let valid = ["open", "in_progress", "resolved", "closed"];
    if !valid.contains(&status) {
        return Ok(false);
    }
    let resolved_at = if status == "resolved" || status == "closed" {
        "datetime('now')"
    } else {
        "NULL"
    };
    let sql = format!(
        "UPDATE tickets SET status = ?, resolved_at = {} WHERE id = ?",
        resolved_at
    );
    let affected = conn.execute(&sql, params![status, id])?;
    Ok(affected > 0)
}

pub fn delete_ticket(conn: &Connection, id: i64) -> rusqlite::Result<bool> {
    let affected = conn.execute("DELETE FROM tickets WHERE id = ?", params![id])?;
    Ok(affected > 0)
}
