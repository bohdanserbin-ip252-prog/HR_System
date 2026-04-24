use crate::models::{ComplaintsQuery, EmployeeComplaint};
use rusqlite::{Connection, params_from_iter, types::Value as SqlValue};

pub(super) const COMPLAINT_SELECT: &str = "
    SELECT
        c.id, c.employee_id, c.reporter_name, c.title, c.description,
        c.severity, c.status, c.complaint_date, c.resolution_notes,
        c.assigned_user_id, c.due_date, c.priority, c.case_stage, c.closed_at,
        c.created_at, c.updated_at,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        d.name as employee_department_name,
        p.title as employee_position_title
    FROM employee_complaints c
    LEFT JOIN employees e ON c.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
";

fn build_base_filtered_sql(query: &ComplaintsQuery) -> (String, Vec<SqlValue>) {
    let mut sql = String::from(COMPLAINT_SELECT);
    sql.push_str(" WHERE 1=1");
    let mut params: Vec<SqlValue> = Vec::new();

    if let Some(search) = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        sql.push_str(
            " AND (c.title LIKE ? OR c.description LIKE ? OR c.reporter_name LIKE ?
               OR e.first_name LIKE ? OR e.last_name LIKE ?)",
        );
        let pattern = format!("%{search}%");
        for _ in 0..5 {
            params.push(SqlValue::Text(pattern.clone()));
        }
    }

    if let Some(employee_id) = query
        .employee_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        sql.push_str(" AND c.employee_id = ?");
        params.push(SqlValue::Text(employee_id.to_string()));
    }

    for (field, value) in [
        ("c.status", query.status.as_deref()),
        ("c.severity", query.severity.as_deref()),
    ] {
        if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
            sql.push_str(&format!(" AND {field} = ?"));
            params.push(SqlValue::Text(value.to_string()));
        }
    }

    (sql, params)
}

fn apply_sorting(sql: &mut String, query: &ComplaintsQuery) {
    let sort_field = match query.sort_by.as_deref() {
        Some("title") => "c.title",
        Some("severity") => "c.severity",
        Some("status") => "c.status",
        Some("complaint_date") => "c.complaint_date",
        _ => "c.created_at",
    };
    let sort_direction = match query.sort_dir.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };
    sql.push_str(&format!(
        " ORDER BY {sort_field} {sort_direction}, c.id DESC"
    ));
}

pub fn list_complaints(
    conn: &Connection,
    query: &ComplaintsQuery,
) -> rusqlite::Result<Vec<EmployeeComplaint>> {
    let (mut sql, params) = build_base_filtered_sql(query);
    apply_sorting(&mut sql, query);

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), EmployeeComplaint::from_row)?;
    rows.collect()
}

pub fn count_complaints(conn: &Connection, query: &ComplaintsQuery) -> rusqlite::Result<i64> {
    let (sql, params) = build_base_filtered_sql(query);
    let count_sql = format!("SELECT COUNT(*) FROM ({}) t", sql);
    let mut stmt = conn.prepare(&count_sql)?;
    let count: i64 = stmt.query_row(params_from_iter(params.iter()), |row| row.get(0))?;
    Ok(count)
}

pub fn list_complaints_paginated(
    conn: &Connection,
    query: &ComplaintsQuery,
    limit: i64,
    offset: i64,
) -> rusqlite::Result<Vec<EmployeeComplaint>> {
    let (mut sql, mut params) = build_base_filtered_sql(query);
    apply_sorting(&mut sql, query);
    sql.push_str(" LIMIT ? OFFSET ?");
    params.push(SqlValue::Integer(limit));
    params.push(SqlValue::Integer(offset));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), EmployeeComplaint::from_row)?;
    rows.collect()
}
