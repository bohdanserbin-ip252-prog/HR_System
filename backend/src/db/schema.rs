use super::schema_fragments::{
    development_feedback_table_body, development_goals_table_body, onboarding_tasks_table_body,
};

pub const SCHEMA_SQL: &str = concat!(
    r#"
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        head_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        min_salary REAL DEFAULT 0,
        max_salary REAL DEFAULT 0,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        middle_name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        birth_date TEXT,
        hire_date TEXT NOT NULL,
        salary REAL DEFAULT 0,
        department_id INTEGER,
        position_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_leave','fired')),
        address TEXT,
        photo_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS development_goals "#,
    development_goals_table_body!(),
    r#";

    CREATE TABLE IF NOT EXISTS development_feedback "#,
    development_feedback_table_body!(),
    r#";

    CREATE TABLE IF NOT EXISTS development_meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        meeting_type TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order >= 0),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_tasks "#,
    onboarding_tasks_table_body!(),
    r#";

    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
    CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
    CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);
    CREATE INDEX IF NOT EXISTS idx_employees_first_name ON employees(first_name);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_development_goals_order ON development_goals(display_order);
    CREATE INDEX IF NOT EXISTS idx_development_feedback_order ON development_feedback(display_order);
    CREATE INDEX IF NOT EXISTS idx_development_feedback_employee_id ON development_feedback(employee_id);
    CREATE INDEX IF NOT EXISTS idx_development_meetings_order ON development_meetings(display_order);
    CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_order ON onboarding_tasks(display_order);

    CREATE TRIGGER IF NOT EXISTS trg_employees_status_insert_valid
    BEFORE INSERT ON employees
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('active','on_leave','fired')
    BEGIN
        SELECT RAISE(ABORT, 'invalid employee status');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_employees_status_update_valid
    BEFORE UPDATE OF status ON employees
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('active','on_leave','fired')
    BEGIN
        SELECT RAISE(ABORT, 'invalid employee status');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_users_role_insert_valid
    BEFORE INSERT ON users
    WHEN NEW.role IS NULL OR NEW.role NOT IN ('admin','user')
    BEGIN
        SELECT RAISE(ABORT, 'invalid user role');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_users_role_update_valid
    BEFORE UPDATE OF role ON users
    WHEN NEW.role IS NULL OR NEW.role NOT IN ('admin','user')
    BEGIN
        SELECT RAISE(ABORT, 'invalid user role');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_goals_state_insert_valid
    BEFORE INSERT ON development_goals
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('in-progress','on-track','completed')
      OR NEW.progress IS NULL OR typeof(NEW.progress) NOT IN ('integer','real')
      OR NEW.progress < 0 OR NEW.progress > 100
    BEGIN
        SELECT RAISE(ABORT, 'invalid development goal state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_goals_status_update_valid
    BEFORE UPDATE OF status ON development_goals
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('in-progress','on-track','completed')
    BEGIN
        SELECT RAISE(ABORT, 'invalid development goal state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_goals_progress_update_valid
    BEFORE UPDATE OF progress ON development_goals
    WHEN NEW.progress IS NULL OR typeof(NEW.progress) NOT IN ('integer','real')
      OR NEW.progress < 0 OR NEW.progress > 100
    BEGIN
        SELECT RAISE(ABORT, 'invalid development goal state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_onboarding_tasks_state_insert_valid
    BEFORE INSERT ON onboarding_tasks
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('completed','active','pending')
      OR NEW.is_priority IS NULL OR NEW.is_priority NOT IN (0, 1)
    BEGIN
        SELECT RAISE(ABORT, 'invalid onboarding task state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_onboarding_tasks_status_update_valid
    BEFORE UPDATE OF status ON onboarding_tasks
    WHEN NEW.status IS NULL OR NEW.status NOT IN ('completed','active','pending')
    BEGIN
        SELECT RAISE(ABORT, 'invalid onboarding task state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_onboarding_tasks_priority_update_valid
    BEFORE UPDATE OF is_priority ON onboarding_tasks
    WHEN NEW.is_priority IS NULL OR NEW.is_priority NOT IN (0, 1)
    BEGIN
        SELECT RAISE(ABORT, 'invalid onboarding task state');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_goals_display_order_insert_valid
    BEFORE INSERT ON development_goals
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_goals_display_order_update_valid
    BEFORE UPDATE OF display_order ON development_goals
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_feedback_display_order_insert_valid
    BEFORE INSERT ON development_feedback
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_feedback_display_order_update_valid
    BEFORE UPDATE OF display_order ON development_feedback
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_meetings_display_order_insert_valid
    BEFORE INSERT ON development_meetings
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_development_meetings_display_order_update_valid
    BEFORE UPDATE OF display_order ON development_meetings
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_onboarding_tasks_display_order_insert_valid
    BEFORE INSERT ON onboarding_tasks
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_onboarding_tasks_display_order_update_valid
    BEFORE UPDATE OF display_order ON onboarding_tasks
    WHEN NEW.display_order IS NULL OR NEW.display_order < 0
    BEGIN
        SELECT RAISE(ABORT, 'display_order must be non-negative');
    END;
	"#
);
