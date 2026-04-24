use crate::error::{AppError, AppResult};
use rusqlite::Connection;

pub fn map_all<T, P, F>(
    conn: &Connection,
    sql: &str,
    params: P,
    mapper: F,
) -> rusqlite::Result<Vec<T>>
where
    P: rusqlite::Params,
    F: Fn(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params, mapper)?;
    rows.collect()
}

pub fn table_has_column(conn: &Connection, table_name: &str, column_name: &str) -> AppResult<bool> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|err| AppError::internal(err.to_string()))?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>("name"))
        .map_err(|err| AppError::internal(err.to_string()))?;

    for column in columns {
        if column.map_err(|err| AppError::internal(err.to_string()))? == column_name {
            return Ok(true);
        }
    }

    Ok(false)
}

pub fn table_has_rows(conn: &Connection, table_name: &str) -> AppResult<bool> {
    let sql = format!("SELECT EXISTS(SELECT 1 FROM {table_name} LIMIT 1)");
    conn.query_row(&sql, [], |row| row.get::<_, i64>(0))
        .map(|value| value > 0)
        .map_err(|err| AppError::internal(err.to_string()))
}
