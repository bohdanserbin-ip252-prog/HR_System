use crate::db::schema_fragments::rbac_join_tables_schema_sql;
use rusqlite::{Connection, params};

pub const RBAC_SCHEMA_SQL: &str = concat!(
    r#"
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
"#,
    rbac_join_tables_schema_sql!(),
    r#"
    INSERT OR IGNORE INTO roles (id, key, label) VALUES
        (1, 'admin', 'Адміністратор'),
        (2, 'hr_manager', 'HR-менеджер'),
        (3, 'viewer', 'Спостерігач');

    INSERT OR IGNORE INTO permissions (id, key, label) VALUES
        (1, 'employees.read', 'Перегляд працівників'),
        (2, 'employees.write', 'Редагування працівників'),
        (3, 'departments.read', 'Перегляд відділів'),
        (4, 'departments.write', 'Редагування відділів'),
        (5, 'positions.read', 'Перегляд посад'),
        (6, 'positions.write', 'Редагування посад'),
        (7, 'complaints.read', 'Перегляд скарг'),
        (8, 'complaints.moderate', 'Модерація скарг'),
        (9, 'payroll.read', 'Перегляд payroll'),
        (10, 'payroll.write', 'Редагування payroll'),
        (11, 'reports.read', 'Перегляд звітів'),
        (12, 'admin.read', 'Адміністративний доступ');

    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
        (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12),
        (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 11),
        (3, 1), (3, 3), (3, 5), (3, 7), (3, 11);

    -- Migrate existing users: assign admin role to existing admin users, viewer to others
    INSERT OR IGNORE INTO user_roles (user_id, role_id)
    SELECT id, CASE WHEN role = 'admin' THEN 1 ELSE 3 END FROM users;
"#
);

#[cfg(test)]
pub fn user_has_permission(
    conn: &Connection,
    user_id: i64,
    permission_key: &str,
) -> rusqlite::Result<bool> {
    let count: i64 = conn.query_row(
        "
        SELECT COUNT(*) FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ? AND p.key = ?
        ",
        params![user_id, permission_key],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

pub fn list_user_permissions(conn: &Connection, user_id: i64) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "
        SELECT DISTINCT p.key FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ?
        ORDER BY p.key
        ",
    )?;
    let rows = stmt.query_map(params![user_id], |row| row.get::<_, String>(0))?;
    rows.collect()
}

pub fn list_permissions(conn: &Connection) -> rusqlite::Result<Vec<(i64, String, String)>> {
    let mut stmt = conn.prepare("SELECT id, key, label FROM permissions ORDER BY id")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;
    rows.collect()
}

pub fn assign_role(conn: &Connection, user_id: i64, role_id: i64) -> rusqlite::Result<usize> {
    conn.execute(
        "INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
        params![user_id, role_id],
    )
}

pub fn revoke_role(conn: &Connection, user_id: i64, role_id: i64) -> rusqlite::Result<usize> {
    conn.execute(
        "DELETE FROM user_roles WHERE user_id = ? AND role_id = ?",
        params![user_id, role_id],
    )
}

pub fn list_role_permissions_matrix(
    conn: &Connection,
) -> rusqlite::Result<Vec<(i64, String, i64, String)>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.key, p.id, p.key FROM roles r
         CROSS JOIN permissions p
         LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
         WHERE rp.role_id IS NOT NULL
         ORDER BY r.id, p.id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, String>(3)?,
        ))
    })?;
    rows.collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, employee_id INTEGER, created_at TEXT);
            INSERT INTO users (id, username, password, role) VALUES (1, 'admin', 'hash', 'admin');
            INSERT INTO users (id, username, password, role) VALUES (2, 'hr', 'hash', 'user');
            INSERT INTO users (id, username, password, role) VALUES (3, 'viewer', 'hash', 'user');
            "#,
        ).unwrap();
        conn.execute_batch(RBAC_SCHEMA_SQL).unwrap();
        conn
    }

    #[test]
    fn admin_has_all_permissions() {
        let conn = setup();
        let perms = list_user_permissions(&conn, 1).unwrap();
        assert!(perms.contains(&"admin.read".to_string()));
        assert!(perms.contains(&"employees.write".to_string()));
    }

    #[test]
    fn viewer_has_limited_permissions() {
        let conn = setup();
        let perms = list_user_permissions(&conn, 3).unwrap();
        assert!(perms.contains(&"employees.read".to_string()));
        assert!(!perms.contains(&"employees.write".to_string()));
    }

    #[test]
    fn assign_and_revoke_role() {
        let conn = setup();
        // Create a new user with id 99
        conn.execute(
            "INSERT INTO users (id, username, password, role) VALUES (99, 'test', 'pass', 'user')",
            [],
        )
        .unwrap();

        assign_role(&conn, 99, 2).unwrap();
        assert!(user_has_permission(&conn, 99, "complaints.moderate").unwrap());

        revoke_role(&conn, 99, 2).unwrap();
        assert!(!user_has_permission(&conn, 99, "complaints.moderate").unwrap());
    }
}
