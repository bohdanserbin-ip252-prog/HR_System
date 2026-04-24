use rusqlite::{Connection, params};
use tempfile::tempdir;

use super::*;

fn setup_connection() -> (tempfile::TempDir, Connection) {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("hr_system.db");
    initialize_database(&db_path).expect("database initialized");
    let conn = open_connection(&db_path).expect("database connection");
    (temp, conn)
}

#[test]
fn authenticate_user_matches_seeded_credentials() {
    let (_temp, conn) = setup_connection();

    let admin = authenticate_user(&conn, "admin", "admin123")
        .expect("admin auth")
        .expect("admin user");
    assert_eq!(admin.username, "admin");
    assert_eq!(admin.role, "admin");

    let missing = authenticate_user(&conn, "admin", "wrong-password").expect("auth query");
    assert!(missing.is_none());
}

#[test]
fn seeded_passwords_are_hashed() {
    let (_temp, conn) = setup_connection();

    let stored_password: String = conn
        .query_row(
            "SELECT password FROM users WHERE username = ?",
            params!["admin"],
            |row| row.get(0),
        )
        .expect("stored admin password");

    assert_ne!(stored_password, "admin123");
    assert!(stored_password.starts_with("$argon2"));
}

#[test]
fn create_session_and_lookup_return_expected_user() {
    let (_temp, conn) = setup_connection();
    let admin = authenticate_user(&conn, "admin", "admin123")
        .expect("admin auth")
        .expect("admin user");

    let token = create_session(&conn, admin.id).expect("session token");
    assert!(!token.is_empty());

    let from_session = find_user_by_session_token(&conn, &token)
        .expect("session lookup")
        .expect("user from session");
    assert_eq!(from_session.id, admin.id);
    assert_eq!(from_session.username, "admin");
}

#[test]
fn delete_session_removes_lookup_access() {
    let (_temp, conn) = setup_connection();
    let admin = authenticate_user(&conn, "admin", "admin123")
        .expect("admin auth")
        .expect("admin user");
    let token = create_session(&conn, admin.id).expect("session token");

    let deleted = delete_session(&conn, &token).expect("delete session");
    assert_eq!(deleted, 1);

    let user = find_user_by_session_token(&conn, &token).expect("session lookup after delete");
    assert!(user.is_none());
}

#[test]
fn expired_session_is_ignored_and_purged_on_lookup() {
    let (_temp, conn) = setup_connection();
    let admin = authenticate_user(&conn, "admin", "admin123")
        .expect("admin auth")
        .expect("admin user");

    conn.execute(
        "
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (?, ?, datetime('now', '-1 day'))
        ",
        params!["expired-token", admin.id],
    )
    .expect("insert expired session");

    let user = find_user_by_session_token(&conn, "expired-token").expect("expired lookup");
    assert!(user.is_none());

    let remaining: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sessions WHERE token = ?",
            params!["expired-token"],
            |row| row.get(0),
        )
        .expect("remaining expired sessions count");
    assert_eq!(remaining, 0);
}

#[test]
fn initialize_database_creates_missing_parent_directories() {
    let temp = tempdir().expect("temp dir");
    let db_path = temp.path().join("nested").join("data").join("hr_system.db");

    initialize_database(&db_path).expect("database initialized in nested path");

    assert!(db_path.exists());
}
