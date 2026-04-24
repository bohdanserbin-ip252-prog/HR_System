use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::Path;

use super::migrations::Migration;
use super::{
    audit::AUDIT_SCHEMA_SQL,
    complaints::COMPLAINTS_SCHEMA_SQL,
    expansion_migrations::migrate_expansion_columns,
    expansion_schema::EXPANSION_SCHEMA_SQL,
    fts::FTS5_SCHEMA_SQL,
    migration_registry::MIGRATIONS,
    migrations::run_migrations,
    schema::SCHEMA_SQL,
    seed_database,
};

const SCHEMA_VERSION: i64 = 2;

pub fn open_connection(path: &Path) -> AppResult<Connection> {
    if let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        std::fs::create_dir_all(parent).map_err(|err| AppError::internal(err.to_string()))?;
    }

    let conn = Connection::open(path).map_err(|err| {
        sentry::capture_message(
            &format!("Failed to open database connection: {}", err),
            sentry::Level::Fatal,
        );
        AppError::internal(err.to_string())
    })?;
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(conn)
}

pub fn initialize_database(path: &Path) -> AppResult<()> {
    let mut conn = open_connection(path)?;
    if let Err(err) = run_migrations(
        &mut conn,
        &[Migration {
            name: "0001_initial",
            sql: SCHEMA_SQL,
        }],
    ) {
        sentry::capture_message(
            &format!("Database migration failed: {}", err),
            sentry::Level::Fatal,
        );
        return Err(err);
    }
    conn.execute_batch(COMPLAINTS_SCHEMA_SQL)
        .map_err(|err| AppError::internal(err.to_string()))?;
    conn.execute_batch(AUDIT_SCHEMA_SQL)
        .map_err(|err| AppError::internal(err.to_string()))?;
    migrate_expansion_columns(&conn)?;
    conn.execute_batch(EXPANSION_SCHEMA_SQL)
        .map_err(|err| AppError::internal(err.to_string()))?;
    conn.execute_batch(FTS5_SCHEMA_SQL)
        .map_err(|err| AppError::internal(format!("FTS5 schema failed: {}", err)))?;
    seed_database(&mut conn)?;
    if let Err(err) = run_migrations(&mut conn, MIGRATIONS) {
        sentry::capture_message(
            &format!("Database migration failed: {}", err),
            sentry::Level::Fatal,
        );
        return Err(err);
    }
    ensure_v2_schema_marker(&conn)?;
    Ok(())
}

fn ensure_v2_schema_marker(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS hr_schema_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            version INTEGER NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )
    .map_err(|err| AppError::internal(err.to_string()))?;

    conn.execute(
        "
        INSERT INTO hr_schema_meta (id, version, updated_at)
        VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            version = excluded.version,
            updated_at = datetime('now')
        ",
        [SCHEMA_VERSION],
    )
    .map_err(|err| AppError::internal(err.to_string()))?;

    Ok(())
}
