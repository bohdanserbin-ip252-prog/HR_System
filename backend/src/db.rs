use crate::{
    error::{AppError, AppResult},
    models::{
        Department, DepartmentCountStat, DepartmentPayload, DepartmentWithCount,
        DevelopmentFeedback, DevelopmentFeedbackPayload, DevelopmentGoal,
        DevelopmentGoalPayload, DevelopmentMeeting, DevelopmentMeetingPayload,
        DevelopmentResponse, Employee, EmployeePayload, EmployeeWithNames, EmployeesQuery,
        OnboardingAvatar, OnboardingBuddy, OnboardingProgress, OnboardingResponse, OnboardingTask,
        OnboardingTaskPayload, Position, PositionPayload, PositionWithCount, RecentHire,
        SalaryByDeptStat, StatsResponse, User,
    },
};
use rusqlite::{Connection, OptionalExtension, params, params_from_iter, types::Value as SqlValue};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const SCHEMA_SQL: &str = r#"
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
        status TEXT DEFAULT 'active' CHECK(status IN ('active','on_leave','fired')),
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
        role TEXT DEFAULT 'user' CHECK(role IN ('admin','user')),
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

    CREATE TABLE IF NOT EXISTS development_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icon TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('in-progress','on-track','completed')),
        progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
        due_date TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS development_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        text TEXT NOT NULL,
        feedback_at TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS development_meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        meeting_type TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL CHECK(status IN ('completed','active','pending')),
        icon TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT NOT NULL,
        is_priority INTEGER NOT NULL DEFAULT 0,
        due_date TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

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
"#;

pub fn default_db_path() -> PathBuf {
    resolve_runtime_path(
        "HR_SYSTEM_DB_PATH",
        &[
            "backend/hr_system.db",
            "HR_System/backend/hr_system.db",
            "hr_system.db",
        ],
    )
}

pub fn default_frontend_dist_dir() -> PathBuf {
    resolve_runtime_path(
        "HR_SYSTEM_FRONTEND_DIST",
        &["frontend/dist", "HR_System/frontend/dist", "../frontend/dist"],
    )
}

pub fn open_connection(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path).map_err(|err| AppError::internal(err.to_string()))?;
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(conn)
}

pub fn initialize_database(path: &Path) -> AppResult<()> {
    let mut conn = open_connection(path)?;
    conn.execute_batch(SCHEMA_SQL)
        .map_err(|err| AppError::internal(err.to_string()))?;
    migrate_dynamic_tables(&conn)?;
    conn.execute_batch(SCHEMA_SQL)
        .map_err(|err| AppError::internal(err.to_string()))?;
    seed_database(&mut conn)?;
    Ok(())
}

fn migrate_dynamic_tables(conn: &Connection) -> AppResult<()> {
    if table_has_column(conn, "development_goals", "status_text")?
        || !table_has_column(conn, "development_goals", "due_date")?
    {
        conn.execute_batch(
            "
            ALTER TABLE development_goals RENAME TO development_goals_legacy;

            CREATE TABLE development_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                icon TEXT NOT NULL,
                title TEXT NOT NULL,
                desc TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('in-progress','on-track','completed')),
                progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
                due_date TEXT,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            INSERT INTO development_goals
            (id, icon, title, desc, status, progress, due_date, display_order, created_at, updated_at)
            SELECT
                id,
                icon,
                title,
                desc,
                status,
                progress,
                CASE
                    WHEN due GLOB '____-__-__' THEN due
                    ELSE NULL
                END,
                display_order,
                created_at,
                updated_at
            FROM development_goals_legacy;

            DROP TABLE development_goals_legacy;
            ",
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    if table_has_column(conn, "development_feedback", "time")?
        || !table_has_column(conn, "development_feedback", "feedback_at")?
    {
        conn.execute_batch(
            "
            ALTER TABLE development_feedback RENAME TO development_feedback_legacy;

            CREATE TABLE development_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                text TEXT NOT NULL,
                feedback_at TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
            );

            INSERT INTO development_feedback
            (id, employee_id, text, feedback_at, display_order, created_at, updated_at)
            SELECT
                id,
                employee_id,
                text,
                CASE
                    WHEN time GLOB '____-__-__' THEN time
                    WHEN time GLOB '____-__-__ *' THEN substr(time, 1, 10)
                    ELSE substr(COALESCE(created_at, date('now')), 1, 10)
                END,
                display_order,
                created_at,
                updated_at
            FROM development_feedback_legacy;

            DROP TABLE development_feedback_legacy;
            ",
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    if table_has_column(conn, "onboarding_tasks", "time")?
        || !table_has_column(conn, "onboarding_tasks", "due_date")?
    {
        conn.execute_batch(
            "
            ALTER TABLE onboarding_tasks RENAME TO onboarding_tasks_legacy;

            CREATE TABLE onboarding_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT NOT NULL CHECK(status IN ('completed','active','pending')),
                icon TEXT NOT NULL,
                title TEXT NOT NULL,
                desc TEXT NOT NULL,
                is_priority INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            INSERT INTO onboarding_tasks
            (id, status, icon, title, desc, is_priority, due_date, display_order, created_at, updated_at)
            SELECT
                id,
                status,
                icon,
                title,
                desc,
                is_priority,
                CASE
                    WHEN time GLOB '____-__-__' THEN time
                    ELSE NULL
                END,
                display_order,
                created_at,
                updated_at
            FROM onboarding_tasks_legacy;

            DROP TABLE onboarding_tasks_legacy;
            ",
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    Ok(())
}

fn table_has_column(conn: &Connection, table_name: &str, column_name: &str) -> AppResult<bool> {
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

fn seed_database(conn: &mut Connection) -> AppResult<()> {
    let tx = conn
        .transaction()
        .map_err(|err| AppError::internal(err.to_string()))?;

    if !table_has_rows(&tx, "departments")? {
        let mut insert_dept = tx
            .prepare("INSERT INTO departments (name, description, head_name) VALUES (?, ?, ?)")
            .map_err(|err| AppError::internal(err.to_string()))?;
        let departments = [
            (
                "IT-відділ",
                "Розробка та підтримка програмного забезпечення",
                "Коваленко О.М.",
            ),
            (
                "HR-відділ",
                "Підбір, адаптація та розвиток персоналу",
                "Іваненко С.П.",
            ),
            (
                "Відділ продажів",
                "Робота з клієнтами та виконання плану продажів",
                "Бондар Т.О.",
            ),
            (
                "Операційний відділ",
                "Планування процесів і внутрішня координація команд",
                "Савченко Д.М.",
            ),
        ];

        for department in departments {
            insert_dept
                .execute(params![department.0, department.1, department.2])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    if !table_has_rows(&tx, "positions")? {
        let mut insert_position = tx
            .prepare(
                "INSERT INTO positions (title, min_salary, max_salary, description) VALUES (?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
        let positions = [
            (
                "Team Lead",
                65000.0,
                90000.0,
                "Координація роботи команди та пріоритезація задач",
            ),
            (
                "Senior Developer",
                55000.0,
                90000.0,
                "Розробка складних програмних продуктів",
            ),
            (
                "HR-спеціаліст",
                28000.0,
                45000.0,
                "Супровід найму, адаптації та розвитку працівників",
            ),
            (
                "Менеджер з продажів",
                18000.0,
                50000.0,
                "Продаж та робота з клієнтами",
            ),
        ];

        for position in positions {
            insert_position
                .execute(params![position.0, position.1, position.2, position.3])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    if !table_has_rows(&tx, "employees")? {
        let mut insert_employee = tx
            .prepare(
                "INSERT INTO employees
                (first_name, last_name, middle_name, email, phone, birth_date, hire_date, salary, department_id, position_id, status, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
        let employees = [
            (
                "Олександр",
                "Коваленко",
                Some("Миколайович"),
                Some("kovalenko@company.ua"),
                Some("+380501234567"),
                Some("1985-03-15"),
                "2018-06-01",
                82000.0,
                Some(1_i64),
                Some(1_i64),
                "active",
                Some("м. Київ, вул. Хрещатик, 10"),
            ),
            (
                "Марія",
                "Шевченко",
                Some("Іванівна"),
                Some("shevchenko@company.ua"),
                Some("+380502345678"),
                Some("1990-07-22"),
                "2020-01-15",
                65000.0,
                Some(1),
                Some(2),
                "active",
                Some("м. Київ, вул. Саксаганського, 5"),
            ),
            (
                "Сергій",
                "Іваненко",
                Some("Павлович"),
                Some("ivanenko@company.ua"),
                Some("+380505678901"),
                Some("1992-05-18"),
                "2019-11-20",
                40000.0,
                Some(2),
                Some(3),
                "active",
                Some("м. Харків, вул. Сумська, 25"),
            ),
            (
                "Юлія",
                "Бондар",
                Some("Тарасівна"),
                Some("bondar@company.ua"),
                Some("+380500123456"),
                Some("1994-08-03"),
                "2021-02-01",
                42000.0,
                Some(3),
                Some(4),
                "active",
                Some("м. Вінниця, вул. Соборна, 17"),
            ),
            (
                "Дмитро",
                "Ткаченко",
                Some("Сергійович"),
                Some("tkachenko@company.ua"),
                Some("+380509012345"),
                Some("1997-02-14"),
                "2023-01-20",
                30000.0,
                Some(1),
                Some(2),
                "on_leave",
                Some("м. Запоріжжя, вул. Незалежності, 42"),
            ),
            (
                "Павло",
                "Савченко",
                Some("Дмитрович"),
                Some("savchenko@company.ua"),
                Some("+380503344556"),
                Some("1987-07-07"),
                "2016-12-01",
                70000.0,
                Some(4),
                Some(1),
                "fired",
                Some("м. Київ, вул. Інститутська, 22"),
            ),
            (
                "Катерина",
                "Лисенко",
                Some("Борисівна"),
                Some("lysenko@company.ua"),
                Some("+380504455667"),
                Some("1998-03-25"),
                "2023-09-15",
                25000.0,
                Some(4),
                Some(4),
                "active",
                Some("м. Чернігів, вул. Шевченка, 55"),
            ),
        ];

        for employee in employees {
            insert_employee
                .execute(params![
                    employee.0,
                    employee.1,
                    employee.2,
                    employee.3,
                    employee.4,
                    employee.5,
                    employee.6,
                    employee.7,
                    employee.8,
                    employee.9,
                    employee.10,
                    employee.11
                ])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    if !table_has_rows(&tx, "users")? {
        let mut insert_user = tx
            .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
            .map_err(|err| AppError::internal(err.to_string()))?;
        insert_user
            .execute(params!["admin", "admin123", "admin"])
            .map_err(|err| AppError::internal(err.to_string()))?;
        insert_user
            .execute(params!["viewer", "viewer123", "user"])
            .map_err(|err| AppError::internal(err.to_string()))?;
    }

    if !table_has_rows(&tx, "development_goals")? {
        let mut insert_goal = tx
            .prepare(
                "INSERT INTO development_goals
                (icon, title, desc, status, progress, due_date, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
        let goals = [
            (
                "code",
                "Оновлення матриці компетенцій",
                "Оновити матрицю навичок команди та зафіксувати прогалини розвитку.",
                "in-progress",
                60_i64,
                Some("2026-05-15"),
                1_i64,
            ),
            (
                "group",
                "Регулярні 1:1 зустрічі",
                "Провести щомісячні 1:1 зустрічі з ключовими членами команди.",
                "on-track",
                40,
                Some("2026-04-30"),
                2,
            ),
            (
                "psychology",
                "Адаптація нових працівників",
                "Завершити план адаптації для нових співробітників без прострочених задач.",
                "completed",
                100,
                None,
                3,
            ),
        ];

        for goal in goals {
            insert_goal
                .execute(params![goal.0, goal.1, goal.2, goal.3, goal.4, goal.5, goal.6])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    if !table_has_rows(&tx, "development_feedback")? {
        let author_ids = map_all(
            &tx,
            "
            SELECT id
            FROM employees
            WHERE status = 'active'
            ORDER BY id DESC
            LIMIT 2
            ",
            [],
            |row| row.get::<_, i64>("id"),
        )
        .map_err(|err| AppError::internal(err.to_string()))?;

        let mut insert_feedback = tx
            .prepare(
                "INSERT INTO development_feedback (employee_id, text, feedback_at, display_order) VALUES (?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
        let feedback_seed = [
            (
                author_ids.first().copied(),
                "Оновлення по вакансіях і статусах кандидатів були передані вчасно та без пропусків.",
                "2026-03-30",
                1_i64,
            ),
            (
                author_ids.get(1).copied(),
                "Команда швидко закрила onboarding-задачі нового співробітника, процес пройшов без блокерів.",
                "2026-03-28",
                2_i64,
            ),
        ];

        for feedback in feedback_seed {
            insert_feedback
                .execute(params![feedback.0, feedback.1, feedback.2, feedback.3])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    if !table_has_rows(&tx, "development_meetings")? {
        tx.execute(
            "
            INSERT INTO development_meetings (date, title, meeting_type, display_order)
            VALUES
                ('2026-04-07', 'Щотижнева 1:1 зустріч', 'Офіс', 1)
            ",
            [],
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    if !table_has_rows(&tx, "onboarding_tasks")? {
        let mut insert_task = tx
            .prepare(
                "INSERT INTO onboarding_tasks
                (status, icon, title, desc, is_priority, due_date, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
        let tasks = [
            (
                "completed",
                "badge",
                "Налаштування доступів",
                "Підтвердити робочі доступи до внутрішніх систем та корпоративної пошти.",
                true,
                Some("2026-03-25"),
                1_i64,
            ),
            (
                "active",
                "handshake",
                "Зустріч з наставником",
                "Провести першу зустріч для обговорення ролі, очікувань і робочих контактів.",
                true,
                Some("2026-04-03"),
                2_i64,
            ),
        ];

        for task in tasks {
            insert_task
                .execute(params![task.0, task.1, task.2, task.3, task.4, task.5, task.6])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    tx.commit()
        .map_err(|err| AppError::internal(err.to_string()))?;
    println!("Database seeded successfully.");
    Ok(())
}

fn table_has_rows(conn: &Connection, table_name: &str) -> AppResult<bool> {
    let sql = format!("SELECT EXISTS(SELECT 1 FROM {table_name} LIMIT 1)");
    conn.query_row(&sql, [], |row| row.get::<_, i64>(0))
        .map(|value| value > 0)
        .map_err(|err| AppError::internal(err.to_string()))
}

pub fn authenticate_user(
    conn: &Connection,
    username: &str,
    password: &str,
) -> rusqlite::Result<Option<User>> {
    conn.query_row(
        "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
        params![username, password],
        User::from_row,
    )
    .optional()
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
        SELECT u.id, u.username, u.role
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

pub fn fetch_stats(conn: &Connection) -> rusqlite::Result<StatsResponse> {
    let total_employees: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status != 'fired'",
        [],
        |row| row.get("c"),
    )?;
    let total_departments: i64 =
        conn.query_row("SELECT COUNT(*) as c FROM departments", [], |row| {
            row.get("c")
        })?;
    let total_positions: i64 =
        conn.query_row("SELECT COUNT(*) as c FROM positions", [], |row| {
            row.get("c")
        })?;
    let avg_salary: i64 = conn
        .query_row(
            "SELECT ROUND(AVG(salary),0) as avg FROM employees WHERE status='active'",
            [],
            |row| row.get::<_, Option<f64>>("avg"),
        )?
        .map(|value| value.round() as i64)
        .unwrap_or(0);
    let active_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='active'",
        [],
        |row| row.get("c"),
    )?;
    let on_leave_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='on_leave'",
        [],
        |row| row.get("c"),
    )?;
    let fired_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='fired'",
        [],
        |row| row.get("c"),
    )?;

    let dept_stats = map_all(
        conn,
        "
        SELECT d.name, COUNT(e.id) as count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status != 'fired'
        GROUP BY d.id ORDER BY count DESC
        ",
        [],
        DepartmentCountStat::from_row,
    )?;

    let recent_hires = map_all(
        conn,
        "
        SELECT e.first_name, e.last_name, e.hire_date, d.name as department, p.title as position
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.status = 'active'
        ORDER BY e.hire_date DESC LIMIT 5
        ",
        [],
        RecentHire::from_row,
    )?;

    let salary_by_dept = map_all(
        conn,
        "
        SELECT d.name, ROUND(AVG(e.salary),0) as avg_salary,
               MIN(e.salary) as min_salary, MAX(e.salary) as max_salary
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        GROUP BY d.id
        ORDER BY avg_salary DESC, d.name ASC
        ",
        [],
        SalaryByDeptStat::from_row,
    )?;

    Ok(StatsResponse {
        total_employees,
        total_departments,
        total_positions,
        avg_salary,
        active_count,
        on_leave_count,
        fired_count,
        dept_stats,
        recent_hires,
        salary_by_dept,
    })
}

pub fn fetch_development(conn: &Connection) -> rusqlite::Result<DevelopmentResponse> {
    let goals = map_all(
        conn,
        "
        SELECT id, icon, title, desc, status, progress, due_date, display_order
        FROM development_goals
        ORDER BY display_order, id
        ",
        [],
        DevelopmentGoal::from_row,
    )?;

    let feedback = map_all(
        conn,
        "
        SELECT
            df.id,
            df.text,
            df.feedback_at,
            df.display_order,
            e.id as employee_id,
            e.first_name as employee_first_name,
            e.last_name as employee_last_name
        FROM development_feedback df
        LEFT JOIN employees e ON df.employee_id = e.id
        ORDER BY df.display_order, df.id
        ",
        [],
        DevelopmentFeedback::from_row,
    )?;

    let meetings = map_all(
        conn,
        "
        SELECT id, date, title, meeting_type, display_order
        FROM development_meetings
        ORDER BY display_order, id
        ",
        [],
        DevelopmentMeeting::from_row,
    )?;

    Ok(DevelopmentResponse {
        goals,
        feedback,
        meetings,
    })
}

pub fn fetch_onboarding(conn: &Connection) -> rusqlite::Result<OnboardingResponse> {
    let avatars = map_all(
        conn,
        "
        SELECT id, first_name, last_name
        FROM employees
        WHERE status != 'fired'
        ORDER BY id DESC
        LIMIT 3
        ",
        [],
        OnboardingAvatar::from_row,
    )?;

    let total_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM employees WHERE status != 'fired'",
        [],
        |row| row.get(0),
    )?;

    let tasks = map_all(
        conn,
        "
        SELECT id, status, icon, title, desc, is_priority, due_date, display_order
        FROM onboarding_tasks
        ORDER BY display_order, id
        ",
        [],
        OnboardingTask::from_row,
    )?;

    let buddy = conn
        .query_row(
            "
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                COALESCE(p.title, d.name, 'Наставник') as role
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            WHERE e.status = 'active'
            ORDER BY e.id DESC
            LIMIT 1
            ",
            [],
            OnboardingBuddy::from_row,
        )
        .optional()?;
    let buddy = match buddy {
        Some(buddy) => Some(buddy),
        None => conn
            .query_row(
                "
                SELECT
                    e.id,
                    e.first_name,
                    e.last_name,
                    COALESCE(p.title, d.name, 'Наставник') as role
                FROM employees e
                LEFT JOIN departments d ON e.department_id = d.id
                LEFT JOIN positions p ON e.position_id = p.id
                WHERE e.status != 'fired'
                ORDER BY e.id DESC
                LIMIT 1
                ",
                [],
                OnboardingBuddy::from_row,
            )
            .optional()?,
    };

    let completed_count = tasks.iter().filter(|task| task.status == "completed").count() as i64;
    let total_task_count = tasks.len() as i64;
    let percent = if total_task_count == 0 {
        0
    } else {
        (completed_count * 100 + total_task_count / 2) / total_task_count
    };

    Ok(OnboardingResponse {
        team: crate::models::OnboardingTeam {
            avatars,
            total_count,
        },
        tasks,
        buddy,
        progress: OnboardingProgress {
            completed_count,
            total_count: total_task_count,
            percent,
        },
    })
}

pub fn get_development_goal(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentGoal>> {
    conn.query_row(
        "
        SELECT id, icon, title, desc, status, progress, due_date, display_order
        FROM development_goals
        WHERE id = ?
        ",
        params![id],
        DevelopmentGoal::from_row,
    )
    .optional()
}

pub fn create_development_goal(
    conn: &Connection,
    payload: &DevelopmentGoalPayload,
) -> rusqlite::Result<DevelopmentGoal> {
    conn.execute(
        "
        INSERT INTO development_goals
        (icon, title, desc, status, progress, due_date, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.icon,
            payload.title,
            payload.desc,
            payload.status,
            payload.progress.round() as i64,
            payload.due_date,
            payload.display_order.unwrap_or_default()
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_goal(conn, &id).map(|goal| goal.expect("goal exists after insert"))
}

pub fn update_development_goal(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentGoalPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_goals SET
        icon=?, title=?, desc=?, status=?, progress=?, due_date=?, display_order=?, updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.icon,
            payload.title,
            payload.desc,
            payload.status,
            payload.progress.round() as i64,
            payload.due_date,
            payload.display_order.unwrap_or_default(),
            id
        ],
    )
}

pub fn delete_development_goal(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_goals WHERE id = ?", params![id])
}

pub fn get_development_feedback(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentFeedback>> {
    conn.query_row(
        "
        SELECT
            df.id,
            df.text,
            df.feedback_at,
            df.display_order,
            e.id as employee_id,
            e.first_name as employee_first_name,
            e.last_name as employee_last_name
        FROM development_feedback df
        LEFT JOIN employees e ON df.employee_id = e.id
        WHERE df.id = ?
        ",
        params![id],
        DevelopmentFeedback::from_row,
    )
    .optional()
}

pub fn create_development_feedback(
    conn: &Connection,
    payload: &DevelopmentFeedbackPayload,
) -> rusqlite::Result<DevelopmentFeedback> {
    conn.execute(
        "
        INSERT INTO development_feedback
        (employee_id, text, feedback_at, display_order)
        VALUES (?, ?, ?, ?)
        ",
        params![
            payload.employee_id,
            payload.text,
            payload.feedback_at,
            payload.display_order.unwrap_or_default()
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_feedback(conn, &id).map(|feedback| feedback.expect("feedback exists after insert"))
}

pub fn update_development_feedback(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentFeedbackPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_feedback SET
        employee_id=?, text=?, feedback_at=?, display_order=?, updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.employee_id,
            payload.text,
            payload.feedback_at,
            payload.display_order.unwrap_or_default(),
            id
        ],
    )
}

pub fn delete_development_feedback(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_feedback WHERE id = ?", params![id])
}

pub fn get_development_meeting(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentMeeting>> {
    conn.query_row(
        "
        SELECT id, date, title, meeting_type, display_order
        FROM development_meetings
        WHERE id = ?
        ",
        params![id],
        DevelopmentMeeting::from_row,
    )
    .optional()
}

pub fn create_development_meeting(
    conn: &Connection,
    payload: &DevelopmentMeetingPayload,
) -> rusqlite::Result<DevelopmentMeeting> {
    conn.execute(
        "
        INSERT INTO development_meetings
        (date, title, meeting_type, display_order)
        VALUES (?, ?, ?, ?)
        ",
        params![
            payload.date,
            payload.title,
            payload.meeting_type,
            payload.display_order.unwrap_or_default()
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_meeting(conn, &id)
        .map(|meeting| meeting.expect("meeting exists after insert"))
}

pub fn update_development_meeting(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentMeetingPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_meetings SET
        date=?, title=?, meeting_type=?, display_order=?, updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.date,
            payload.title,
            payload.meeting_type,
            payload.display_order.unwrap_or_default(),
            id
        ],
    )
}

pub fn delete_development_meeting(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_meetings WHERE id = ?", params![id])
}

pub fn get_onboarding_task(conn: &Connection, id: &str) -> rusqlite::Result<Option<OnboardingTask>> {
    conn.query_row(
        "
        SELECT id, status, icon, title, desc, is_priority, due_date, display_order
        FROM onboarding_tasks
        WHERE id = ?
        ",
        params![id],
        OnboardingTask::from_row,
    )
    .optional()
}

pub fn create_onboarding_task(
    conn: &Connection,
    payload: &OnboardingTaskPayload,
) -> rusqlite::Result<OnboardingTask> {
    conn.execute(
        "
        INSERT INTO onboarding_tasks
        (status, icon, title, desc, is_priority, due_date, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.status,
            payload.icon,
            payload.title,
            payload.desc,
            payload.is_priority,
            payload.due_date,
            payload.display_order.unwrap_or_default()
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_onboarding_task(conn, &id).map(|task| task.expect("task exists after insert"))
}

pub fn update_onboarding_task(
    conn: &Connection,
    id: &str,
    payload: &OnboardingTaskPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE onboarding_tasks SET
        status=?, icon=?, title=?, desc=?, is_priority=?, due_date=?, display_order=?, updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.status,
            payload.icon,
            payload.title,
            payload.desc,
            payload.is_priority,
            payload.due_date,
            payload.display_order.unwrap_or_default(),
            id
        ],
    )
}

pub fn delete_onboarding_task(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM onboarding_tasks WHERE id = ?", params![id])
}

pub fn move_development_goal(
    conn: &Connection,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    move_display_order(conn, "development_goals", id, direction)
}

pub fn move_development_feedback(
    conn: &Connection,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    move_display_order(conn, "development_feedback", id, direction)
}

pub fn move_development_meeting(
    conn: &Connection,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    move_display_order(conn, "development_meetings", id, direction)
}

pub fn move_onboarding_task(conn: &Connection, id: &str, direction: &str) -> rusqlite::Result<()> {
    move_display_order(conn, "onboarding_tasks", id, direction)
}

pub fn list_employees(
    conn: &Connection,
    query: &EmployeesQuery,
) -> rusqlite::Result<Vec<EmployeeWithNames>> {
    let mut sql = String::from(
        "
        SELECT e.*, d.name as department_name, p.title as position_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE 1=1
        ",
    );
    let mut params: Vec<SqlValue> = Vec::new();

    if let Some(search) = &query.search {
        if !search.is_empty() {
            sql.push_str(" AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)");
            let pattern = format!("%{search}%");
            params.push(SqlValue::Text(pattern.clone()));
            params.push(SqlValue::Text(pattern.clone()));
            params.push(SqlValue::Text(pattern.clone()));
            params.push(SqlValue::Text(pattern));
        }
    }

    if let Some(department_id) = &query.department_id {
        if !department_id.is_empty() {
            sql.push_str(" AND e.department_id = ?");
            params.push(SqlValue::Text(department_id.clone()));
        }
    }

    if let Some(status) = &query.status {
        if !status.is_empty() {
            sql.push_str(" AND e.status = ?");
            params.push(SqlValue::Text(status.clone()));
        }
    }

    let valid_sorts = [
        "first_name",
        "last_name",
        "salary",
        "hire_date",
        "created_at",
    ];
    let sort_field = match query.sort_by.as_deref() {
        Some(value) if valid_sorts.contains(&value) => value,
        _ => "e.id",
    };
    let sort_direction = match query.sort_dir.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    sql.push_str(&format!(" ORDER BY {sort_field} {sort_direction}"));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), EmployeeWithNames::from_row)?;
    rows.collect()
}

pub fn get_employee_with_names(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<EmployeeWithNames>> {
    conn.query_row(
        "
        SELECT e.*, d.name as department_name, p.title as position_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.id = ?
        ",
        params![id],
        EmployeeWithNames::from_row,
    )
    .optional()
}

pub fn get_employee(conn: &Connection, id: i64) -> rusqlite::Result<Option<Employee>> {
    conn.query_row(
        "SELECT * FROM employees WHERE id = ?",
        params![id],
        Employee::from_row,
    )
    .optional()
}

pub fn create_employee(conn: &Connection, payload: &EmployeePayload) -> rusqlite::Result<Employee> {
    conn.execute(
        "
        INSERT INTO employees
        (first_name, last_name, middle_name, email, phone, birth_date, hire_date, salary, department_id, position_id, status, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.first_name,
            payload.last_name,
            payload.middle_name,
            payload.email,
            payload.phone,
            payload.birth_date,
            payload.hire_date,
            payload.salary,
            payload.department_id,
            payload.position_id,
            payload.status.as_deref().unwrap_or("active"),
            payload.address
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_employee(conn, id).map(|employee| employee.expect("employee exists after insert"))
}

pub fn update_employee(
    conn: &Connection,
    id: &str,
    payload: &EmployeePayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE employees SET
        first_name=?, last_name=?, middle_name=?, email=?, phone=?, birth_date=?,
        hire_date=?, salary=?, department_id=?, position_id=?, status=?, address=?,
        updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.first_name,
            payload.last_name,
            payload.middle_name,
            payload.email,
            payload.phone,
            payload.birth_date,
            payload.hire_date,
            payload.salary,
            payload.department_id,
            payload.position_id,
            payload.status.as_deref().unwrap_or("active"),
            payload.address,
            id
        ],
    )
}

pub fn delete_employee(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM employees WHERE id = ?", params![id])
}

pub fn list_departments(conn: &Connection) -> rusqlite::Result<Vec<DepartmentWithCount>> {
    map_all(
        conn,
        "
        SELECT d.*, COUNT(e.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status != 'fired'
        GROUP BY d.id ORDER BY d.name
        ",
        [],
        DepartmentWithCount::from_row,
    )
}

pub fn get_department(conn: &Connection, id: &str) -> rusqlite::Result<Option<Department>> {
    conn.query_row(
        "SELECT * FROM departments WHERE id = ?",
        params![id],
        Department::from_row,
    )
    .optional()
}

pub fn create_department(
    conn: &Connection,
    payload: &DepartmentPayload,
) -> rusqlite::Result<Department> {
    conn.execute(
        "INSERT INTO departments (name, description, head_name) VALUES (?, ?, ?)",
        params![payload.name, payload.description, payload.head_name],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_department(conn, &id).map(|department| department.expect("department exists after insert"))
}

pub fn update_department(
    conn: &Connection,
    id: &str,
    payload: &DepartmentPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE departments SET name=?, description=?, head_name=?, updated_at=datetime('now') WHERE id=?",
        params![payload.name, payload.description, payload.head_name, id],
    )
}

pub fn delete_department(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM departments WHERE id = ?", params![id])
}

pub fn list_positions(conn: &Connection) -> rusqlite::Result<Vec<PositionWithCount>> {
    map_all(
        conn,
        "
        SELECT p.*, COUNT(e.id) as employee_count
        FROM positions p
        LEFT JOIN employees e ON e.position_id = p.id AND e.status != 'fired'
        GROUP BY p.id ORDER BY p.title
        ",
        [],
        PositionWithCount::from_row,
    )
}

pub fn get_position(conn: &Connection, id: &str) -> rusqlite::Result<Option<Position>> {
    conn.query_row(
        "SELECT * FROM positions WHERE id = ?",
        params![id],
        Position::from_row,
    )
    .optional()
}

pub fn create_position(conn: &Connection, payload: &PositionPayload) -> rusqlite::Result<Position> {
    conn.execute(
        "INSERT INTO positions (title, min_salary, max_salary, description) VALUES (?, ?, ?, ?)",
        params![
            payload.title,
            payload.min_salary,
            payload.max_salary,
            payload.description
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_position(conn, &id).map(|position| position.expect("position exists after insert"))
}

pub fn update_position(
    conn: &Connection,
    id: &str,
    payload: &PositionPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "UPDATE positions SET title=?, min_salary=?, max_salary=?, description=?, updated_at=datetime('now') WHERE id=?",
        params![
            payload.title,
            payload.min_salary,
            payload.max_salary,
            payload.description,
            id
        ],
    )
}

pub fn delete_position(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM positions WHERE id = ?", params![id])
}

fn map_all<T, P, F>(conn: &Connection, sql: &str, params: P, mapper: F) -> rusqlite::Result<Vec<T>>
where
    P: rusqlite::Params,
    F: Fn(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params, mapper)?;
    rows.collect()
}

fn normalize_display_order(conn: &Connection, table_name: &str) -> rusqlite::Result<()> {
    let query = format!("SELECT id FROM {table_name} ORDER BY display_order, id");
    let ordered_ids = map_all(conn, &query, [], |row| row.get::<_, i64>("id"))?;

    let update_sql =
        format!("UPDATE {table_name} SET display_order = ? WHERE id = ? AND display_order != ?");
    for (index, entity_id) in ordered_ids.iter().enumerate() {
        let order = index as i64 + 1;
        conn.execute(&update_sql, params![order, entity_id, order])?;
    }

    Ok(())
}

fn move_display_order(conn: &Connection, table_name: &str, id: &str, direction: &str) -> rusqlite::Result<()> {
    normalize_display_order(conn, table_name)?;

    let query = format!("SELECT id FROM {table_name} ORDER BY display_order, id");
    let ordered_ids = map_all(conn, &query, [], |row| row.get::<_, i64>("id"))?;
    let Some(index) = ordered_ids.iter().position(|entity_id| entity_id.to_string() == id) else {
        return Ok(());
    };

    let target_index = match direction {
        "up" if index > 0 => Some(index - 1),
        "down" if index + 1 < ordered_ids.len() => Some(index + 1),
        _ => None,
    };

    let Some(target_index) = target_index else {
        return Ok(());
    };

    let current_order = index as i64 + 1;
    let target_order = target_index as i64 + 1;
    let target_id = ordered_ids[target_index];

    let update_sql = format!("UPDATE {table_name} SET display_order = ? WHERE id = ?");
    conn.execute(&update_sql, params![target_order, id])?;
    conn.execute(&update_sql, params![current_order, target_id])?;

    Ok(())
}

fn resolve_runtime_path(env_key: &str, candidates: &[&str]) -> PathBuf {
    if let Ok(path) = std::env::var(env_key) {
        return PathBuf::from(path);
    }

    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for candidate in candidates {
        let candidate_path = current_dir.join(candidate);
        if candidate_path.exists() {
            return candidate_path;
        }
    }

    for candidate in candidates {
        let candidate_path = current_dir.join(candidate);
        if candidate_path.parent().is_some_and(Path::exists) {
            return candidate_path;
        }
    }

    current_dir.join(candidates[0])
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

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
}
