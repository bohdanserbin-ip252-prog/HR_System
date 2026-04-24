pub struct Migration {
    pub name: &'static str,
    pub sql: &'static str,
}

pub fn ensure_migrations_table(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS __migrations (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            applied_at TEXT
        )",
        [],
    )?;
    Ok(())
}
