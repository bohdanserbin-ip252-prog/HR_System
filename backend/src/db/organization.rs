use crate::db::map_all;
use crate::models::{
    Department, DepartmentPayload, DepartmentWithCount, Position, PositionPayload,
    PositionWithCount,
};
use rusqlite::{Connection, OptionalExtension, params};

pub fn list_departments(conn: &Connection) -> rusqlite::Result<Vec<DepartmentWithCount>> {
    map_all(
        conn,
        "
        SELECT d.*, COUNT(e.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status != 'fired'
        GROUP BY d.id ORDER BY d.name
        ",
        [],
        DepartmentWithCount::from_row,
    )
}

pub fn get_department(conn: &Connection, id: &str) -> rusqlite::Result<Option<Department>> {
    conn.query_row(
        "SELECT * FROM departments WHERE id = ?",
        params![id],
        Department::from_row,
    )
    .optional()
}

pub fn create_department(
    conn: &Connection,
    payload: &DepartmentPayload,
) -> rusqlite::Result<Department> {
    conn.execute(
        "INSERT INTO departments (name, description, head_name) VALUES (?, ?, ?)",
        params![payload.name, payload.description, payload.head_name],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_department(conn, &id).map(|department| department.expect("department exists after insert"))
}

pub fn update_department(
    conn: &Connection,
    id: &str,
    payload: &DepartmentPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE departments SET name=?, description=?, head_name=?, updated_at=datetime('now') WHERE id=?",
        params![payload.name, payload.description, payload.head_name, id],
    )
}

pub fn delete_department(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM departments WHERE id = ?", params![id])
}

pub fn list_positions(conn: &Connection) -> rusqlite::Result<Vec<PositionWithCount>> {
    map_all(
        conn,
        "
        SELECT p.*, COUNT(e.id) as employee_count
        FROM positions p
        LEFT JOIN employees e ON e.position_id = p.id AND e.status != 'fired'
        GROUP BY p.id ORDER BY p.title
        ",
        [],
        PositionWithCount::from_row,
    )
}

pub fn get_position(conn: &Connection, id: &str) -> rusqlite::Result<Option<Position>> {
    conn.query_row(
        "SELECT * FROM positions WHERE id = ?",
        params![id],
        Position::from_row,
    )
    .optional()
}

pub fn create_position(conn: &Connection, payload: &PositionPayload) -> rusqlite::Result<Position> {
    conn.execute(
        "INSERT INTO positions (title, min_salary, max_salary, description) VALUES (?, ?, ?, ?)",
        params![
            payload.title,
            payload.min_salary,
            payload.max_salary,
            payload.description
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_position(conn, &id).map(|position| position.expect("position exists after insert"))
}

pub fn update_position(
    conn: &Connection,
    id: &str,
    payload: &PositionPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE positions SET title=?, min_salary=?, max_salary=?, description=?, updated_at=datetime('now') WHERE id=?",
        params![
            payload.title,
            payload.min_salary,
            payload.max_salary,
            payload.description,
            id
        ],
    )
}

pub fn delete_position(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM positions WHERE id = ?", params![id])
}
