use crate::db::schema_fragments::rbac_join_tables_schema_sql;

pub const EXPANSION_SCHEMA_SQL: &str = concat!(
    r#"
    CREATE TABLE IF NOT EXISTS complaint_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        author_user_id INTEGER,
        author_username TEXT,
        body TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (complaint_id) REFERENCES employee_complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS employee_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        complaint_id INTEGER,
        title TEXT NOT NULL,
        document_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        content_blob BLOB NOT NULL,
        expires_at TEXT,
        uploaded_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (complaint_id) REFERENCES employee_complaints(id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS performance_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        period TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft','self_review','manager_review','finalized')),
        summary TEXT,
        created_by INTEGER,
        finalized_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS performance_review_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        competency TEXT NOT NULL,
        score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
        note TEXT,
        FOREIGN KEY (review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_off_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        request_type TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
        decided_by INTEGER,
        decided_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        body TEXT,
        target_type TEXT,
        target_id INTEGER,
        read_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_employee ON employee_documents(employee_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id);
    CREATE INDEX IF NOT EXISTS idx_time_off_employee ON time_off_requests(employee_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL
    );
"#,
    rbac_join_tables_schema_sql!(),
    r#"
    CREATE TABLE IF NOT EXISTS payroll_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'draft',
        notes TEXT,
        finalized_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payroll_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        gross REAL NOT NULL DEFAULT 0,
        bonuses REAL NOT NULL DEFAULT 0,
        deductions REAL NOT NULL DEFAULT 0,
        net REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'assigned',
        progress INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        department_id INTEGER,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        role TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        conflict_note TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_key TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        current_step TEXT NOT NULL DEFAULT 'start',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        position_applied TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'new' CHECK(stage IN ('new','screening','interview','offer','hired','rejected')),
        source TEXT,
        rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
    CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_applied);

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general','it','hr','facilities','payroll')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
        requester_name TEXT,
        assignee_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

    CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL DEFAULT '["Так","Ні"]',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS survey_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER NOT NULL,
        choice_index INTEGER NOT NULL DEFAULT 0,
        voter_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_survey_votes_survey ON survey_votes(survey_id);

    INSERT OR IGNORE INTO roles (key, label) VALUES
        ('admin','Адміністратор'), ('hr_manager','HR Manager'),
        ('department_head','Керівник відділу'), ('employee','Працівник'), ('user','Користувач');
    INSERT OR IGNORE INTO permissions (key, label) VALUES
        ('payroll.manage','Payroll'), ('training.manage','Training'), ('scheduling.manage','Scheduling'),
        ('reports.view','Reports'), ('rbac.manage','RBAC'), ('workflow.manage','Workflows'),
        ('recruitment.manage','Recruitment'), ('helpdesk.manage','Help Desk'), ('surveys.manage','Surveys');
    INSERT OR IGNORE INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u JOIN roles r ON r.key = CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'employee' END;
"#
);
