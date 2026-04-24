use crate::models::User;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use rand_core::OsRng;
use rusqlite::{Connection, OptionalExtension, params};
use uuid::Uuid;

fn password_error(err: impl std::fmt::Display) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::other(err.to_string())))
}

pub(crate) fn hash_password(password: &str) -> rusqlite::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(password_error)
}

fn verify_password(password: &str, stored_password: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(stored_password) else {
        return false;
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn authenticate_user(
    conn: &Connection,
    username: &str,
    password: &str,
) -> rusqlite::Result<Option<User>> {
    let user_with_password = conn
        .query_row(
            "SELECT id, username, password, role, employee_id FROM users WHERE username = ?",
            params![username],
            |row| {
                Ok((
                    User {
                        id: row.get("id")?,
                        username: row.get("username")?,
                        role: row.get("role")?,
                        employee_id: row.get("employee_id")?,
                    },
                    row.get::<_, String>("password")?,
                ))
            },
        )
        .optional()?;

    let Some((user, stored_password)) = user_with_password else {
        return Ok(None);
    };

    if !verify_password(password, &stored_password) {
        return Ok(None);
    }

    Ok(Some(user))
}

pub fn create_session(conn: &Connection, user_id: i64) -> rusqlite::Result<String> {
    purge_expired_sessions(conn)?;
    let token = Uuid::new_v4().to_string();
    conn.execute(
        "
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+7 day'))
        ",
        params![token, user_id],
    )?;
    Ok(token)
}

pub fn find_user_by_session_token(
    conn: &Connection,
    token: &str,
) -> rusqlite::Result<Option<User>> {
    purge_expired_sessions(conn)?;
    conn.query_row(
        "
        SELECT u.id, u.username, u.role, u.employee_id
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now')
        ",
        params![token],
        User::from_row,
    )
    .optional()
}

pub fn delete_session(conn: &Connection, token: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM sessions WHERE token = ?", params![token])
}

fn purge_expired_sessions(conn: &Connection) -> rusqlite::Result<usize> {
    conn.execute(
        "DELETE FROM sessions WHERE expires_at <= datetime('now')",
        [],
    )
}
