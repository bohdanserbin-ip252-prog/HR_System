use crate::db::{map_all, table_has_rows};
use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};

pub fn seed_goals(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "development_goals")? {
        let mut insert_goal = conn
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
                .execute(params![
                    goal.0, goal.1, goal.2, goal.3, goal.4, goal.5, goal.6
                ])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    Ok(())
}

pub fn seed_feedback(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "development_feedback")? {
        let author_ids = map_all(
            conn,
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

        let mut insert_feedback = conn
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

    Ok(())
}

pub fn seed_meetings(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "development_meetings")? {
        conn.execute(
            "
            INSERT INTO development_meetings (date, title, meeting_type, display_order)
            VALUES
                ('2026-04-07', 'Щотижнева 1:1 зустріч', 'Офіс', 1)
            ",
            [],
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    Ok(())
}
