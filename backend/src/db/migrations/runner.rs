use rusqlite::Connection;

use super::core::{Migration, ensure_migrations_table};
use crate::error::{AppError, AppResult};

pub fn run_migrations(conn: &mut Connection, migrations: &[Migration]) -> AppResult<()> {
    ensure_migrations_table(conn).map_err(|err| AppError::internal(err.to_string()))?;

    for migration in migrations {
        let already_applied = match conn.query_row(
            "SELECT 1 FROM __migrations WHERE name = ? LIMIT 1",
            [&migration.name],
            |_| Ok(()),
        ) {
            Ok(()) => true,
            Err(rusqlite::Error::QueryReturnedNoRows) => false,
            Err(err) => return Err(AppError::internal(err.to_string())),
        };

        if !already_applied {
            let tx = conn
                .transaction()
                .map_err(|err| AppError::internal(err.to_string()))?;
            tx.execute_batch(migration.sql)
                .map_err(|err| AppError::internal(err.to_string()))?;
            tx.execute(
                "INSERT INTO __migrations (name, applied_at) VALUES (?, datetime('now'))",
                [&migration.name],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            tx.commit()
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    Ok(())
}
