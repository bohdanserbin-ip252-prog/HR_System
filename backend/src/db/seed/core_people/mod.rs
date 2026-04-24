mod complaints;
mod employees;

use crate::db::{AuditEventInput, hash_password, record_audit_event, table_has_rows};
use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};

pub fn seed_departments(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "departments")? {
        let mut insert_dept = conn
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
                "Шевченко М.І.",
            ),
            (
                "Бухгалтерія",
                "Фінансовий облік та звітність",
                "Бондаренко Т.О.",
            ),
            (
                "Відділ продажів",
                "Робота з клієнтами та виконання плану продажів",
                "Петренко А.В.",
            ),
            (
                "Виробництво",
                "Виробничі процеси та контроль якості",
                "Ткаченко С.Д.",
            ),
        ];

        for department in departments {
            insert_dept
                .execute(params![department.0, department.1, department.2])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }

        record_audit_event(
            conn,
            AuditEventInput {
                actor_user_id: None,
                actor_username: Some("system"),
                action: "seed",
                entity_type: "department",
                entity_id: None,
                entity_name: Some("departments"),
                details: Some("seeded 5 departments"),
            },
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    Ok(())
}

pub fn seed_positions(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "positions")? {
        let mut insert_position = conn
            .prepare(
                "INSERT INTO positions (title, min_salary, max_salary, description) VALUES (?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;

        let positions = [
            (
                "Директор",
                60000.0,
                100000.0,
                "Керівництво компанією та стратегічне планування",
            ),
            (
                "Team Lead",
                55000.0,
                85000.0,
                "Координація роботи команди та пріоритезація задач",
            ),
            (
                "Розробник",
                25000.0,
                60000.0,
                "Розробка програмного забезпечення",
            ),
            (
                "HR-спеціаліст",
                20000.0,
                45000.0,
                "Супровід найму, адаптації та розвитку працівників",
            ),
            (
                "Бухгалтер",
                18000.0,
                40000.0,
                "Фінансовий облік та звітність",
            ),
            (
                "Менеджер з продажів",
                15000.0,
                50000.0,
                "Продаж та робота з клієнтами",
            ),
            (
                "Інженер з виробництва",
                20000.0,
                45000.0,
                "Технічна підтримка виробництва",
            ),
            ("Аналітик", 22000.0, 50000.0, "Аналіз даних та процесів"),
        ];

        for position in positions {
            insert_position
                .execute(params![position.0, position.1, position.2, position.3])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }

        record_audit_event(
            conn,
            AuditEventInput {
                actor_user_id: None,
                actor_username: Some("system"),
                action: "seed",
                entity_type: "position",
                entity_id: None,
                entity_name: Some("positions"),
                details: Some("seeded 8 positions"),
            },
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    Ok(())
}

pub fn seed_employees(conn: &Connection) -> AppResult<()> {
    employees::seed_employees(conn)
}

pub fn seed_users(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "users")? {
        let mut insert_user = conn
            .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
            .map_err(|err| AppError::internal(err.to_string()))?;

        let admin_password =
            hash_password("admin123").map_err(|err| AppError::internal(err.to_string()))?;
        let viewer_password =
            hash_password("viewer123").map_err(|err| AppError::internal(err.to_string()))?;

        insert_user
            .execute(params!["admin", admin_password, "admin"])
            .map_err(|err| AppError::internal(err.to_string()))?;
        insert_user
            .execute(params!["viewer", viewer_password, "user"])
            .map_err(|err| AppError::internal(err.to_string()))?;
    }

    Ok(())
}
