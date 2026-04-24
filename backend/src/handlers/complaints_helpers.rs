use crate::{
    db,
    error::{AppError, AppResult},
    models::{ComplaintPayload, EmployeeComplaint},
};

pub fn audit_complaint(
    conn: &rusqlite::Connection,
    user: &crate::models::User,
    action: &str,
    complaint: &EmployeeComplaint,
    details: &str,
) -> rusqlite::Result<()> {
    db::record_audit_event(
        conn,
        db::AuditEventInput {
            actor_user_id: Some(user.id),
            actor_username: Some(&user.username),
            action,
            entity_type: "complaint",
            entity_id: Some(complaint.id),
            entity_name: Some(&complaint.title),
            details: Some(details),
        },
    )
}

pub fn validate_complaint_employee(
    conn: &rusqlite::Connection,
    complaint: &ComplaintPayload,
) -> AppResult<()> {
    let Some(employee_id) = complaint.employee_id else {
        return Ok(());
    };

    if db::get_employee(conn, employee_id)
        .map_err(|err| AppError::internal(err.to_string()))?
        .is_none()
    {
        return Err(AppError::bad_request("Працівника не знайдено"));
    }

    Ok(())
}
