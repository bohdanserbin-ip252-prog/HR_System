use crate::db::table_has_rows;
use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};

pub fn seed_onboarding_tasks(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "onboarding_tasks")? {
        let mut insert_task = conn
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
                .execute(params![
                    task.0, task.1, task.2, task.3, task.4, task.5, task.6
                ])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }
    }

    Ok(())
}
