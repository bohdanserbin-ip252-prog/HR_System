macro_rules! development_goals_table_body {
    () => {
        r#"(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icon TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('in-progress','on-track','completed')),
        progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
        due_date TEXT,
        display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order >= 0),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )"#
    };
}

macro_rules! development_feedback_table_body {
    () => {
        r#"(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        text TEXT NOT NULL,
        feedback_at TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order >= 0),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    )"#
    };
}

macro_rules! onboarding_tasks_table_body {
    () => {
        r#"(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL CHECK(status IN ('completed','active','pending')),
        icon TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT NOT NULL,
        is_priority INTEGER NOT NULL DEFAULT 0,
        due_date TEXT,
        display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order >= 0),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )"#
    };
}

macro_rules! rbac_join_tables_schema_sql {
    () => {
        r#"
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
"#
    };
}

pub(crate) use development_feedback_table_body;
pub(crate) use development_goals_table_body;
pub(crate) use onboarding_tasks_table_body;
pub(crate) use rbac_join_tables_schema_sql;
