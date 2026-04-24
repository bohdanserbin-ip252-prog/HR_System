use crate::{AppResult, error::AppError};
use rusqlite::Connection;

use super::table_has_column;

pub fn migrate_expansion_columns(conn: &Connection) -> AppResult<()> {
    add_column(conn, "users", "employee_id", "employee_id INTEGER")?;
    add_column(
        conn,
        "departments",
        "head_employee_id",
        "head_employee_id INTEGER",
    )?;
    add_column(
        conn,
        "employee_complaints",
        "assigned_user_id",
        "assigned_user_id INTEGER",
    )?;
    add_column(conn, "employee_complaints", "due_date", "due_date TEXT")?;
    add_column(
        conn,
        "employee_complaints",
        "priority",
        "priority TEXT NOT NULL DEFAULT 'normal'",
    )?;
    add_column(
        conn,
        "employee_complaints",
        "case_stage",
        "case_stage TEXT NOT NULL DEFAULT 'triage'",
    )?;
    add_column(conn, "employee_complaints", "closed_at", "closed_at TEXT")?;
    conn.execute(
        "UPDATE employee_complaints SET priority = 'normal' WHERE priority IS NULL OR priority = ''",
        [],
    )
    .map_err(|err| AppError::internal(err.to_string()))?;
    conn.execute(
        "UPDATE employee_complaints SET case_stage = 'triage' WHERE case_stage IS NULL OR case_stage = ''",
        [],
    )
    .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(())
}

fn add_column(conn: &Connection, table: &str, column: &str, definition: &str) -> AppResult<()> {
    if !table_has_column(conn, table, column)? {
        conn.execute(&format!("ALTER TABLE {table} ADD COLUMN {definition}"), [])
            .map_err(|err| AppError::internal(err.to_string()))?;
    }
    Ok(())
}
