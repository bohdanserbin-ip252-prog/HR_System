use crate::db::{map_all, move_display_order};
use crate::models::{
    OnboardingAvatar, OnboardingBuddy, OnboardingProgress, OnboardingResponse, OnboardingTask,
    OnboardingTaskPayload, OnboardingTeam,
};
use rusqlite::{Connection, OptionalExtension, params};

fn next_display_order(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row(
        "SELECT COALESCE(MAX(display_order), 0) + 1 FROM onboarding_tasks",
        [],
        |row| row.get(0),
    )
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

    let completed_count = tasks
        .iter()
        .filter(|task| task.status == "completed")
        .count() as i64;
    let total_task_count = tasks.len() as i64;
    let percent = if total_task_count == 0 {
        0
    } else {
        (completed_count * 100 + total_task_count / 2) / total_task_count
    };

    Ok(OnboardingResponse {
        team: OnboardingTeam {
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

pub fn get_onboarding_task(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<OnboardingTask>> {
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
    let display_order = match payload.display_order {
        Some(display_order) => display_order,
        None => next_display_order(conn)?,
    };

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
            display_order
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
        status=?, icon=?, title=?, desc=?, is_priority=?, due_date=?, display_order=COALESCE(?, display_order), updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.status,
            payload.icon,
            payload.title,
            payload.desc,
            payload.is_priority,
            payload.due_date,
            payload.display_order,
            id
        ],
    )
}

pub fn delete_onboarding_task(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM onboarding_tasks WHERE id = ?", params![id])
}

pub fn move_onboarding_task(conn: &Connection, id: &str, direction: &str) -> rusqlite::Result<()> {
    move_display_order(conn, "onboarding_tasks", id, direction)
}
