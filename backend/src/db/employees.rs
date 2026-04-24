use crate::models::{Employee, EmployeePayload, EmployeeWithNames, EmployeesQuery};
use rusqlite::{Connection, OptionalExtension, params, params_from_iter, types::Value as SqlValue};

pub fn list_employees(
    conn: &Connection,
    query: &EmployeesQuery,
) -> rusqlite::Result<Vec<EmployeeWithNames>> {
    let mut sql = String::from(
        "
        SELECT e.*, d.name as department_name, p.title as position_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE 1=1
        ",
    );
    let mut params: Vec<SqlValue> = Vec::new();

    if let Some(search) = &query.search
        && !search.is_empty()
    {
        sql.push_str(
            " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)",
        );
        let pattern = format!("%{search}%");
        params.push(SqlValue::Text(pattern.clone()));
        params.push(SqlValue::Text(pattern.clone()));
        params.push(SqlValue::Text(pattern.clone()));
        params.push(SqlValue::Text(pattern));
    }

    if let Some(department_id) = &query.department_id
        && !department_id.is_empty()
    {
        sql.push_str(" AND e.department_id = ?");
        params.push(SqlValue::Text(department_id.clone()));
    }

    if let Some(status) = &query.status
        && !status.is_empty()
    {
        sql.push_str(" AND e.status = ?");
        params.push(SqlValue::Text(status.clone()));
    }

    let valid_sorts = [
        "first_name",
        "last_name",
        "salary",
        "hire_date",
        "created_at",
    ];
    let sort_field = match query.sort_by.as_deref() {
        Some(value) if valid_sorts.contains(&value) => value,
        _ => "e.id",
    };
    let sort_direction = match query.sort_dir.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };
    sql.push_str(&format!(" ORDER BY {sort_field} {sort_direction}"));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), EmployeeWithNames::from_row)?;
    rows.collect()
}

pub fn get_employee_with_names(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<EmployeeWithNames>> {
    conn.query_row(
        "
        SELECT e.*, d.name as department_name, p.title as position_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.id = ?
        ",
        params![id],
        EmployeeWithNames::from_row,
    )
    .optional()
}

pub fn get_employee(conn: &Connection, id: i64) -> rusqlite::Result<Option<Employee>> {
    conn.query_row(
        "SELECT * FROM employees WHERE id = ?",
        params![id],
        Employee::from_row,
    )
    .optional()
}

pub fn create_employee(conn: &Connection, payload: &EmployeePayload) -> rusqlite::Result<Employee> {
    conn.execute(
        "
        INSERT INTO employees
        (first_name, last_name, middle_name, email, phone, birth_date, hire_date, salary, department_id, position_id, status, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.first_name,
            payload.last_name,
            payload.middle_name,
            payload.email,
            payload.phone,
            payload.birth_date,
            payload.hire_date,
            payload.salary,
            payload.department_id,
            payload.position_id,
            payload.status.as_deref().unwrap_or("active"),
            payload.address
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_employee(conn, id).map(|employee| employee.expect("employee exists after insert"))
}

pub fn update_employee(
    conn: &Connection,
    id: &str,
    payload: &EmployeePayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE employees SET
        first_name=?, last_name=?, middle_name=?, email=?, phone=?, birth_date=?,
        hire_date=?, salary=?, department_id=?, position_id=?, status=?, address=?,
        updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.first_name,
            payload.last_name,
            payload.middle_name,
            payload.email,
            payload.phone,
            payload.birth_date,
            payload.hire_date,
            payload.salary,
            payload.department_id,
            payload.position_id,
            payload.status.as_deref().unwrap_or("active"),
            payload.address,
            id
        ],
    )
}

pub fn delete_employee(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM employees WHERE id = ?", params![id])
}
