use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::{EmployeePayload, EmployeesQuery, SuccessResponse},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;

use super::db_errors;
use super::json_payload::{JsonPayload, parse_json_payload};
use super::validation::validate_employee;

fn audit_employee(
    conn: &rusqlite::Connection,
    user: &crate::models::User,
    action: &str,
    employee: &crate::models::EmployeeWithNames,
    details: &str,
) -> rusqlite::Result<()> {
    db::record_audit_event(
        conn,
        db::AuditEventInput {
            actor_user_id: Some(user.id),
            actor_username: Some(&user.username),
            action,
            entity_type: "employee",
            entity_id: Some(employee.id),
            entity_name: Some(&format!("{} {}", employee.last_name, employee.first_name)),
            details: Some(details),
        },
    )
}

fn validate_employee_relations(
    conn: &rusqlite::Connection,
    employee: &EmployeePayload,
) -> AppResult<()> {
    if let Some(department_id) = employee.department_id
        && db::get_department(conn, &department_id.to_string())
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
    {
        return Err(AppError::bad_request("Відділ не знайдено"));
    }

    if let Some(position_id) = employee.position_id
        && db::get_position(conn, &position_id.to_string())
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
    {
        return Err(AppError::bad_request("Посаду не знайдено"));
    }

    Ok(())
}

pub async fn list_employees(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<EmployeesQuery>,
) -> AppResult<Json<Vec<crate::models::EmployeeWithNames>>> {
    auth::require_authenticated(&state, &jar).await?;
    let employees = state
        .run_db(move |conn| {
            db::list_employees(conn, &query).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(employees))
}

pub async fn get_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::EmployeeWithNames>> {
    auth::require_authenticated(&state, &jar).await?;
    let employee = state
        .run_db(move |conn| {
            db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match employee {
        Some(employee) => Ok(Json(employee)),
        None => Err(AppError::not_found("Працівника не знайдено")),
    }
}

pub async fn create_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<crate::models::Employee>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let employee = EmployeePayload::from_json(&payload)?;
    validate_employee(&employee)?;

    let created = state
        .run_db(move |conn| {
            validate_employee_relations(conn, &employee)?;
            let created =
                db::create_employee(conn, &employee).map_err(db_errors::employee_write_error)?;
            let named = db::get_employee_with_names(conn, &created.id.to_string())
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Працівника не знайдено"))?;
            audit_employee(
                conn,
                &user,
                "employee.created",
                &named,
                "Працівника створено",
            )
            .map_err(db_errors::generic_write_error)?;
            Ok(created)
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<crate::models::EmployeeWithNames>> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let employee = EmployeePayload::from_json(&payload)?;
    validate_employee(&employee)?;

    let updated = state
        .run_db(move |conn| {
            validate_employee_relations(conn, &employee)?;
            let previous = db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?;
            let changes = db::update_employee(conn, &id, &employee)
                .map_err(db_errors::employee_write_error)?;
            if changes == 0 {
                return Err(AppError::not_found("Працівника не знайдено"));
            }

            let updated = db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Працівника не знайдено"))?;
            audit_employee(
                conn,
                &user,
                "employee.updated",
                &updated,
                "Профіль оновлено",
            )
            .map_err(db_errors::generic_write_error)?;
            if previous.is_some_and(|item| item.salary.0 != updated.salary.0) {
                audit_employee(
                    conn,
                    &user,
                    "employee.salary_changed",
                    &updated,
                    "Зарплату змінено",
                )
                .map_err(db_errors::generic_write_error)?;
            }
            Ok(updated)
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    let user = auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            let previous = db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?;
            let deleted = db::delete_employee(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?;
            if let Some(employee) = previous.as_ref() {
                audit_employee(
                    conn,
                    &user,
                    "employee.deleted",
                    employee,
                    "Працівника видалено",
                )
                .map_err(db_errors::generic_write_error)?;
            }
            Ok(deleted)
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Працівника не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}
