use crate::{
    error::{AppError, AppResult},
    models::{
        ComplaintPayload, DepartmentPayload, DevelopmentFeedbackPayload, DevelopmentGoalPayload,
        DevelopmentMeetingPayload, EmployeePayload, MovePayload, OnboardingTaskPayload,
        PositionPayload, is_valid_date, is_valid_email,
    },
};

pub fn validate_employee(employee: &EmployeePayload) -> AppResult<()> {
    if employee.first_name.is_empty()
        || employee.last_name.is_empty()
        || employee.hire_date.is_empty()
    {
        return Err(AppError::bad_request(
            "Ім'я, прізвище та дата прийому обов'язкові",
        ));
    }

    if !is_valid_email(employee.email.as_deref()) {
        return Err(AppError::bad_request("Некоректний email"));
    }

    if !is_valid_date(employee.birth_date.as_deref()) {
        return Err(AppError::bad_request(
            "Дата народження має бути у форматі YYYY-MM-DD",
        ));
    }

    if !is_valid_date(Some(employee.hire_date.as_str())) {
        return Err(AppError::bad_request(
            "Дата прийому має бути у форматі YYYY-MM-DD",
        ));
    }

    if employee.salary < 0.0 {
        return Err(AppError::bad_request("Зарплата не може бути від’ємною"));
    }

    if let Some(status) = employee.status.as_deref()
        && !matches!(status, "active" | "on_leave" | "fired")
    {
        return Err(AppError::bad_request("Некоректний статус працівника"));
    }

    Ok(())
}

pub fn validate_department(department: &DepartmentPayload) -> AppResult<()> {
    if department.name.is_empty() {
        return Err(AppError::bad_request("Назва обов'язкова"));
    }

    Ok(())
}

pub fn validate_position(position: &PositionPayload) -> AppResult<()> {
    if position.title.is_empty() {
        return Err(AppError::bad_request("Назва обов'язкова"));
    }

    if position.min_salary < 0.0 || position.max_salary < 0.0 {
        return Err(AppError::bad_request("Зарплата не може бути від’ємною"));
    }

    if position.max_salary < position.min_salary {
        return Err(AppError::bad_request(
            "Максимальна зарплата не може бути меншою за мінімальну",
        ));
    }

    Ok(())
}

pub fn validate_development_goal(goal: &DevelopmentGoalPayload) -> AppResult<()> {
    if goal.icon.is_empty() || goal.title.is_empty() || goal.desc.is_empty() {
        return Err(AppError::bad_request(
            "Іконка, назва та опис цілі обов'язкові",
        ));
    }

    if !matches!(
        goal.status.as_str(),
        "in-progress" | "on-track" | "completed"
    ) {
        return Err(AppError::bad_request("Некоректний статус цілі"));
    }

    if goal.progress < 0.0 || goal.progress > 100.0 {
        return Err(AppError::bad_request(
            "Прогрес має бути в межах від 0 до 100",
        ));
    }

    if !is_valid_date(goal.due_date.as_deref()) {
        return Err(AppError::bad_request(
            "Дата дедлайну має бути у форматі YYYY-MM-DD",
        ));
    }

    Ok(())
}

pub fn validate_development_feedback(feedback: &DevelopmentFeedbackPayload) -> AppResult<()> {
    if feedback.text.is_empty() {
        return Err(AppError::bad_request("Текст відгуку обов'язковий"));
    }

    if !is_valid_date(Some(feedback.feedback_at.as_str())) {
        return Err(AppError::bad_request(
            "Дата відгуку має бути у форматі YYYY-MM-DD",
        ));
    }

    Ok(())
}

pub fn validate_development_meeting(meeting: &DevelopmentMeetingPayload) -> AppResult<()> {
    if meeting.title.is_empty() || meeting.meeting_type.is_empty() {
        return Err(AppError::bad_request("Назва та тип зустрічі обов'язкові"));
    }

    if !is_valid_date(Some(meeting.date.as_str())) {
        return Err(AppError::bad_request(
            "Дата зустрічі має бути у форматі YYYY-MM-DD",
        ));
    }

    Ok(())
}

pub fn validate_onboarding_task(task: &OnboardingTaskPayload) -> AppResult<()> {
    if task.icon.is_empty() || task.title.is_empty() || task.desc.is_empty() {
        return Err(AppError::bad_request(
            "Іконка, назва та опис onboarding-задачі обов'язкові",
        ));
    }

    if !matches!(task.status.as_str(), "completed" | "active" | "pending") {
        return Err(AppError::bad_request(
            "Некоректний статус onboarding-задачі",
        ));
    }

    if !is_valid_date(task.due_date.as_deref()) {
        return Err(AppError::bad_request(
            "Дата дедлайну має бути у форматі YYYY-MM-DD",
        ));
    }

    Ok(())
}

pub fn validate_complaint(complaint: &ComplaintPayload, require_employee: bool) -> AppResult<()> {
    if (require_employee && complaint.employee_id.is_none())
        || complaint.title.is_empty()
        || complaint.description.is_empty()
        || complaint.complaint_date.is_empty()
    {
        return Err(AppError::bad_request(
            "Працівник, назва, опис і дата скарги обов'язкові",
        ));
    }

    if !matches!(
        complaint.severity.as_str(),
        "low" | "medium" | "high" | "critical"
    ) {
        return Err(AppError::bad_request("Некоректна серйозність скарги"));
    }

    if let Some(status) = complaint.status.as_deref()
        && !matches!(status, "open" | "in_review" | "resolved" | "rejected")
    {
        return Err(AppError::bad_request("Некоректний статус скарги"));
    }

    if !is_valid_date(Some(complaint.complaint_date.as_str())) {
        return Err(AppError::bad_request(
            "Дата скарги має бути у форматі YYYY-MM-DD",
        ));
    }

    if !is_valid_date(complaint.due_date.as_deref()) {
        return Err(AppError::bad_request(
            "Дата дедлайну має бути у форматі YYYY-MM-DD",
        ));
    }

    if let Some(priority) = complaint.priority.as_deref()
        && !matches!(priority, "low" | "normal" | "high" | "urgent")
    {
        return Err(AppError::bad_request("Некоректний пріоритет скарги"));
    }

    if let Some(stage) = complaint.case_stage.as_deref()
        && !matches!(stage, "triage" | "investigation" | "decision" | "closed")
    {
        return Err(AppError::bad_request("Некоректний етап HR case"));
    }

    Ok(())
}

pub fn validate_move_payload(payload: &MovePayload) -> AppResult<()> {
    if !matches!(payload.direction.as_str(), "up" | "down") {
        return Err(AppError::bad_request(
            "Напрямок переміщення має бути up або down",
        ));
    }

    Ok(())
}
