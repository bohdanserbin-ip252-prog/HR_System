pub const FTS5_SCHEMA_SQL: &str = r#"
CREATE VIRTUAL TABLE IF NOT EXISTS employees_fts USING fts5(
    first_name, last_name, email, phone, address
);

CREATE VIRTUAL TABLE IF NOT EXISTS complaints_fts USING fts5(
    title, description, reporter_name, resolution_notes
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, filename, document_type
);

CREATE TRIGGER IF NOT EXISTS trg_employees_fts_insert
AFTER INSERT ON employees BEGIN
    INSERT INTO employees_fts(rowid, first_name, last_name, email, phone, address)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, COALESCE(NEW.email, ' '), COALESCE(NEW.phone, ' '), COALESCE(NEW.address, ' '));
END;

CREATE TRIGGER IF NOT EXISTS trg_employees_fts_update
AFTER UPDATE ON employees BEGIN
    DELETE FROM employees_fts WHERE rowid = OLD.id;
    INSERT INTO employees_fts(rowid, first_name, last_name, email, phone, address)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, COALESCE(NEW.email, ' '), COALESCE(NEW.phone, ' '), COALESCE(NEW.address, ' '));
END;

CREATE TRIGGER IF NOT EXISTS trg_employees_fts_delete
AFTER DELETE ON employees BEGIN
    DELETE FROM employees_fts WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_complaints_fts_insert
AFTER INSERT ON employee_complaints BEGIN
    INSERT INTO complaints_fts(rowid, title, description, reporter_name, resolution_notes)
    VALUES (NEW.id, NEW.title, NEW.description, COALESCE(NEW.reporter_name, ' '), COALESCE(NEW.resolution_notes, ' '));
END;

CREATE TRIGGER IF NOT EXISTS trg_complaints_fts_update
AFTER UPDATE ON employee_complaints BEGIN
    DELETE FROM complaints_fts WHERE rowid = OLD.id;
    INSERT INTO complaints_fts(rowid, title, description, reporter_name, resolution_notes)
    VALUES (NEW.id, NEW.title, NEW.description, COALESCE(NEW.reporter_name, ' '), COALESCE(NEW.resolution_notes, ' '));
END;

CREATE TRIGGER IF NOT EXISTS trg_complaints_fts_delete
AFTER DELETE ON employee_complaints BEGIN
    DELETE FROM complaints_fts WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_fts_insert
AFTER INSERT ON employee_documents BEGIN
    INSERT INTO documents_fts(rowid, title, filename, document_type)
    VALUES (NEW.id, NEW.title, NEW.filename, NEW.document_type);
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_fts_update
AFTER UPDATE ON employee_documents BEGIN
    DELETE FROM documents_fts WHERE rowid = OLD.id;
    INSERT INTO documents_fts(rowid, title, filename, document_type)
    VALUES (NEW.id, NEW.title, NEW.filename, NEW.document_type);
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_fts_delete
AFTER DELETE ON employee_documents BEGIN
    DELETE FROM documents_fts WHERE rowid = OLD.id;
END;
"#;

pub fn search_employees(
    conn: &rusqlite::Connection,
    query: &str,
    limit: i64,
) -> rusqlite::Result<Vec<i64>> {
    let mut stmt = conn.prepare(
        "SELECT rowid FROM employees_fts WHERE employees_fts MATCH ? ORDER BY rank LIMIT ?",
    )?;
    let rows = stmt.query_map(rusqlite::params![query, limit], |row| row.get(0))?;
    rows.collect()
}

pub fn search_complaints(
    conn: &rusqlite::Connection,
    query: &str,
    limit: i64,
) -> rusqlite::Result<Vec<i64>> {
    let mut stmt = conn.prepare(
        "SELECT rowid FROM complaints_fts WHERE complaints_fts MATCH ? ORDER BY rank LIMIT ?",
    )?;
    let rows = stmt.query_map(rusqlite::params![query, limit], |row| row.get(0))?;
    rows.collect()
}

pub fn search_documents(
    conn: &rusqlite::Connection,
    query: &str,
    limit: i64,
) -> rusqlite::Result<Vec<i64>> {
    let mut stmt = conn.prepare(
        "SELECT rowid FROM documents_fts WHERE documents_fts MATCH ? ORDER BY rank LIMIT ?",
    )?;
    let rows = stmt.query_map(rusqlite::params![query, limit], |row| row.get(0))?;
    rows.collect()
}

#[cfg(test)]
pub fn rebuild_fts_index(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM employees_fts", [])?;
    conn.execute(
        "INSERT INTO employees_fts(rowid, first_name, last_name, email, phone, address)
         SELECT id, first_name, last_name, COALESCE(email, ' '), COALESCE(phone, ' '), COALESCE(address, ' ') FROM employees",
        [],
    )?;
    conn.execute("DELETE FROM complaints_fts", [])?;
    conn.execute(
        "INSERT INTO complaints_fts(rowid, title, description, reporter_name, resolution_notes)
         SELECT id, title, description, COALESCE(reporter_name, ' '), COALESCE(resolution_notes, ' ') FROM employee_complaints",
        [],
    )?;
    conn.execute("DELETE FROM documents_fts", [])?;
    conn.execute(
        "INSERT INTO documents_fts(rowid, title, filename, document_type)
         SELECT id, title, filename, document_type FROM employee_documents",
        [],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{initialize_database, open_connection};
    use tempfile::tempdir;

    fn setup() -> (tempfile::TempDir, rusqlite::Connection) {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("test.db");
        initialize_database(&db_path).expect("init db");
        let conn = open_connection(&db_path).expect("open connection");
        (temp, conn)
    }

    #[test]
    fn search_employees_finds_seeded_employee() {
        let (_temp, conn) = setup();
        let ids = search_employees(&conn, "kovalenko", 10).expect("search");
        assert!(
            !ids.is_empty(),
            "expected at least one employee matching 'kovalenko'"
        );
    }

    #[test]
    fn search_complaints_returns_empty_for_no_match() {
        let (_temp, conn) = setup();
        let ids = search_complaints(&conn, "nonexistentxyz", 10).expect("search");
        assert!(ids.is_empty());
    }

    #[test]
    fn search_documents_returns_empty_for_no_match() {
        let (_temp, conn) = setup();
        let ids = search_documents(&conn, "nonexistentxyz", 10).expect("search");
        assert!(ids.is_empty());
    }

    #[test]
    fn rebuild_fts_index_is_idempotent() {
        let (_temp, conn) = setup();
        let ids_first = search_employees(&conn, "kovalenko", 10).expect("search first");
        assert!(
            !ids_first.is_empty(),
            "expected employees_fts to be populated after init"
        );

        rebuild_fts_index(&conn).expect("rebuild");
        let ids_second = search_employees(&conn, "kovalenko", 10).expect("search second");
        assert!(
            !ids_second.is_empty(),
            "expected employees_fts to remain populated after rebuild"
        );
    }
}
