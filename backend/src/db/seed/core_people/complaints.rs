use crate::db::table_has_rows;
use crate::db::{AuditEventInput, record_audit_event};
use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};

#[path = "complaints_data.rs"]
mod complaints_data;

pub fn seed_complaints(conn: &Connection) -> AppResult<()> {
    if table_has_rows(conn, "employee_complaints")? {
        return Ok(());
    }
    let employee_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM employees", [], |row| row.get(0))
        .map_err(|err| AppError::internal(err.to_string()))?;
    if employee_count < 20 {
        return Ok(());
    }

    let mut stmt = conn
        .prepare(
            "INSERT INTO employee_complaints
            (employee_id, reporter_name, title, description, severity, status, complaint_date, resolution_notes, assigned_user_id, due_date, priority, case_stage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .map_err(|err| AppError::internal(err.to_string()))?;

    for c in complaints_data::COMPLAINTS {
        stmt.execute(params![
            c.0, c.1, c.2, c.3, c.4, c.5, c.6, c.7, c.8, c.9, c.10, c.11
        ])
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    record_audit_event(
        conn,
        AuditEventInput {
            actor_user_id: None,
            actor_username: Some("system"),
            action: "seed",
            entity_type: "complaint",
            entity_id: None,
            entity_name: Some("complaints"),
            details: Some("seeded 20 complaints"),
        },
    )
    .map_err(|err| AppError::internal(err.to_string()))?;

    Ok(())
}
