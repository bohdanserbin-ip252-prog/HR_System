use crate::error::AppError;

fn sqlite_message(err: &rusqlite::Error) -> String {
    err.to_string()
}

pub fn department_write_error(err: rusqlite::Error) -> AppError {
    let message = sqlite_message(&err);
    if message.contains("UNIQUE constraint failed: departments.name") {
        return AppError::bad_request("Відділ з такою назвою вже існує");
    }

    generic_write_error(err)
}

pub fn employee_write_error(err: rusqlite::Error) -> AppError {
    let message = sqlite_message(&err);
    if message.contains("UNIQUE constraint failed: employees.email")
        || message.contains("idx_employees_email_ci")
    {
        return AppError::bad_request("Працівник з таким email вже існує");
    }

    generic_write_error(err)
}

pub fn position_write_error(err: rusqlite::Error) -> AppError {
    let message = sqlite_message(&err);
    if message.contains("UNIQUE constraint failed: positions.title") {
        return AppError::bad_request("Посада з такою назвою вже існує");
    }

    generic_write_error(err)
}

pub fn generic_write_error(err: rusqlite::Error) -> AppError {
    let message = sqlite_message(&err);
    if message.contains("FOREIGN KEY constraint failed") {
        return AppError::bad_request("Пов'язаний запис не знайдено");
    }

    if message.contains("constraint")
        || message.contains("CHECK")
        || message.contains("UNIQUE")
        || message.contains("invalid employee status")
        || message.contains("invalid user role")
        || message.contains("invalid development goal state")
        || message.contains("invalid onboarding task state")
        || message.contains("display_order must be non-negative")
    {
        return AppError::bad_request("Некоректні дані");
    }

    AppError::bad_request("Не вдалося зберегти дані")
}
