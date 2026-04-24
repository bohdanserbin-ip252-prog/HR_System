use crate::models::{ComplaintPayload, EmployeeComplaint};
use rusqlite::{Connection, OptionalExtension, params};

use super::complaints_query::COMPLAINT_SELECT;

pub const COMPLAINTS_SCHEMA_SQL: &str = r#"
    CREATE TABLE IF NOT EXISTS employee_complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        reporter_name TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','resolved','rejected')),
        complaint_date TEXT NOT NULL,
        resolution_notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_employee_complaints_employee_id ON employee_complaints(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employee_complaints_status ON employee_complaints(status);
    CREATE INDEX IF NOT EXISTS idx_employee_complaints_severity ON employee_complaints(severity);
    CREATE INDEX IF NOT EXISTS idx_employee_complaints_date ON employee_complaints(complaint_date);
    "#;

pub fn get_complaint(conn: &Connection, id: &str) -> rusqlite::Result<Option<EmployeeComplaint>> {
    conn.query_row(
        &format!("{COMPLAINT_SELECT} WHERE c.id = ?"),
        params![id],
        EmployeeComplaint::from_row,
    )
    .optional()
}

pub fn create_complaint(
    conn: &Connection,
    payload: &ComplaintPayload,
) -> rusqlite::Result<EmployeeComplaint> {
    conn.execute(
        "
        INSERT INTO employee_complaints
        (employee_id, reporter_name, title, description, severity, status, complaint_date,
         resolution_notes, assigned_user_id, due_date, priority, case_stage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.employee_id,
            payload.reporter_name,
            payload.title,
            payload.description,
            payload.severity,
            payload.status.as_deref().unwrap_or("open"),
            payload.complaint_date,
            payload.resolution_notes,
            payload.assigned_user_id,
            payload.due_date,
            payload.priority.as_deref().unwrap_or("normal"),
            payload.case_stage.as_deref().unwrap_or("triage")
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_complaint(conn, &id).map(|complaint| complaint.expect("complaint exists after insert"))
}

pub fn update_complaint(
    conn: &Connection,
    id: &str,
    payload: &ComplaintPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE employee_complaints SET
        employee_id=COALESCE(?, employee_id), reporter_name=?, title=?, description=?, severity=?,
        status=COALESCE(?, status), complaint_date=?, resolution_notes=?,
        assigned_user_id=?, due_date=?, priority=COALESCE(?, priority), case_stage=COALESCE(?, case_stage),
        closed_at=CASE WHEN COALESCE(?, status) IN ('resolved','rejected') THEN datetime('now') ELSE closed_at END,
        updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.employee_id,
            payload.reporter_name,
            payload.title,
            payload.description,
            payload.severity,
            payload.status,
            payload.complaint_date,
            payload.resolution_notes,
            payload.assigned_user_id,
            payload.due_date,
            payload.priority,
            payload.case_stage,
            payload.status,
            id
        ],
    )
}

pub fn delete_complaint(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM employee_complaints WHERE id = ?", params![id])
}
