use crate::AppResult;
use crate::models::{
    normalize_bool, normalize_non_negative_number, normalize_optional_email,
    normalize_optional_i64, normalize_optional_non_negative_i64, normalize_optional_string,
    normalize_required_string,
};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Clone)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

impl LoginPayload {
    pub fn from_json(payload: &Value) -> Self {
        Self {
            username: normalize_required_string(payload, "username"),
            password: payload
                .as_object()
                .and_then(|map| map.get("password"))
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct EmployeePayload {
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birth_date: Option<String>,
    pub hire_date: String,
    pub salary: f64,
    pub department_id: Option<i64>,
    pub position_id: Option<i64>,
    pub status: Option<String>,
    pub address: Option<String>,
}

impl EmployeePayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            first_name: normalize_required_string(payload, "first_name"),
            last_name: normalize_required_string(payload, "last_name"),
            middle_name: normalize_optional_string(payload, "middle_name"),
            email: normalize_optional_email(payload, "email"),
            phone: normalize_optional_string(payload, "phone"),
            birth_date: normalize_optional_string(payload, "birth_date"),
            hire_date: normalize_required_string(payload, "hire_date"),
            salary: normalize_non_negative_number(payload, "salary")?,
            department_id: normalize_optional_i64(payload, "department_id")?,
            position_id: normalize_optional_i64(payload, "position_id")?,
            status: normalize_optional_string(payload, "status"),
            address: normalize_optional_string(payload, "address"),
        })
    }
}

#[derive(Debug, Clone)]
pub struct DepartmentPayload {
    pub name: String,
    pub description: Option<String>,
    pub head_name: Option<String>,
}

impl DepartmentPayload {
    pub fn from_json(payload: &Value) -> Self {
        Self {
            name: normalize_required_string(payload, "name"),
            description: normalize_optional_string(payload, "description"),
            head_name: normalize_optional_string(payload, "head_name"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct PositionPayload {
    pub title: String,
    pub min_salary: f64,
    pub max_salary: f64,
    pub description: Option<String>,
}

impl PositionPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            title: normalize_required_string(payload, "title"),
            min_salary: normalize_non_negative_number(payload, "min_salary")?,
            max_salary: normalize_non_negative_number(payload, "max_salary")?,
            description: normalize_optional_string(payload, "description"),
        })
    }
}

#[derive(Debug, Clone)]
pub struct DevelopmentGoalPayload {
    pub icon: String,
    pub title: String,
    pub desc: String,
    pub status: String,
    pub progress: f64,
    pub due_date: Option<String>,
    pub display_order: Option<i64>,
}

impl DevelopmentGoalPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            icon: normalize_required_string(payload, "icon"),
            title: normalize_required_string(payload, "title"),
            desc: normalize_required_string(payload, "desc"),
            status: normalize_required_string(payload, "status"),
            progress: normalize_non_negative_number(payload, "progress")?,
            due_date: normalize_optional_string(payload, "due_date"),
            display_order: normalize_optional_non_negative_i64(payload, "display_order")?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct DevelopmentFeedbackPayload {
    pub employee_id: Option<i64>,
    pub text: String,
    pub feedback_at: String,
    pub display_order: Option<i64>,
}

impl DevelopmentFeedbackPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            employee_id: normalize_optional_i64(payload, "employee_id")?,
            text: normalize_required_string(payload, "text"),
            feedback_at: normalize_required_string(payload, "feedback_at"),
            display_order: normalize_optional_non_negative_i64(payload, "display_order")?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct DevelopmentMeetingPayload {
    pub date: String,
    pub title: String,
    pub meeting_type: String,
    pub display_order: Option<i64>,
}

impl DevelopmentMeetingPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            date: normalize_required_string(payload, "date"),
            title: normalize_required_string(payload, "title"),
            meeting_type: normalize_required_string(payload, "meeting_type"),
            display_order: normalize_optional_non_negative_i64(payload, "display_order")?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct OnboardingTaskPayload {
    pub status: String,
    pub icon: String,
    pub title: String,
    pub desc: String,
    pub is_priority: bool,
    pub due_date: Option<String>,
    pub display_order: Option<i64>,
}

impl OnboardingTaskPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            status: normalize_required_string(payload, "status"),
            icon: normalize_required_string(payload, "icon"),
            title: normalize_required_string(payload, "title"),
            desc: normalize_required_string(payload, "desc"),
            is_priority: normalize_bool(payload, "is_priority")?,
            due_date: normalize_optional_string(payload, "due_date"),
            display_order: normalize_optional_non_negative_i64(payload, "display_order")?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct MovePayload {
    pub direction: String,
}

impl MovePayload {
    pub fn from_json(payload: &Value) -> Self {
        Self {
            direction: normalize_required_string(payload, "direction"),
        }
    }
}
