use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use rusqlite::OptionalExtension;
use serde_json::Value;

#[path = "../email.rs"]
mod email;

pub async fn test_email(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    let _user = auth::require_admin(&state, &jar).await?;

    let admin_email = state.run_db(move |conn| find_admin_email(conn)).await?;

    let to = admin_email.ok_or_else(|| AppError::bad_request("Admin email not found"))?;

    email::send_email(
        &to,
        "HR System Test Email",
        "This is a test email from HR System.",
    )
    .await
    .map_err(|err| AppError::internal(err))?;

    Ok(Json(serde_json::json!({ "success": true, "to": to })))
}

fn find_admin_email(conn: &rusqlite::Connection) -> AppResult<Option<String>> {
    let email: Option<String> = conn
        .query_row(
            "SELECT e.email FROM users u LEFT JOIN employees e ON u.employee_id = e.id WHERE u.role = 'admin' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(email)
}

pub async fn send_time_off_created_email(state: &AppState, employee_id: i64, request_type: &str) {
    if let Ok(Some(to)) = state
        .run_db(move |conn| find_manager_email(conn, employee_id))
        .await
    {
        let _ = email::send_email(
            &to,
            "New Time Off Request",
            &format!(
                "A new time off request has been submitted: {}",
                request_type
            ),
        )
        .await;
    }
}

fn find_manager_email(conn: &rusqlite::Connection, employee_id: i64) -> AppResult<Option<String>> {
    let email: Option<String> = conn
        .query_row(
            "SELECT e2.email FROM employees e1 JOIN departments d ON e1.department_id = d.id LEFT JOIN employees e2 ON d.head_employee_id = e2.id WHERE e1.id = ? LIMIT 1",
            [employee_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(email)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_admin_email_returns_none_for_empty_db() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, employee_id INTEGER, created_at TEXT);
            CREATE TABLE employees (id INTEGER PRIMARY KEY, email TEXT);
            "#,
        )
        .unwrap();
        let email = find_admin_email(&conn).unwrap();
        assert!(email.is_none());
    }

    #[test]
    fn find_admin_email_finds_seeded_admin() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, employee_id INTEGER, created_at TEXT);
            CREATE TABLE employees (id INTEGER PRIMARY KEY, email TEXT);
            INSERT INTO employees (id, email) VALUES (1, 'admin@company.ua');
            INSERT INTO users (id, username, password, role, employee_id) VALUES (1, 'admin', 'hash', 'admin', 1);
            "#,
        )
        .unwrap();
        let email = find_admin_email(&conn).unwrap();
        assert_eq!(email.as_deref(), Some("admin@company.ua"));
    }
}
