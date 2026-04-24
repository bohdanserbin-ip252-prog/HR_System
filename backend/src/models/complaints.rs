use super::normalize::{
    normalize_optional_i64, normalize_optional_string, normalize_required_string,
};
use crate::AppResult;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Clone, Default)]
pub struct ComplaintsQuery {
    pub search: Option<String>,
    pub employee_id: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ComplaintPayload {
    pub employee_id: Option<i64>,
    pub reporter_name: Option<String>,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub status: Option<String>,
    pub complaint_date: String,
    pub resolution_notes: Option<String>,
    pub assigned_user_id: Option<i64>,
    pub due_date: Option<String>,
    pub priority: Option<String>,
    pub case_stage: Option<String>,
}

impl ComplaintPayload {
    pub fn from_json(payload: &Value) -> AppResult<Self> {
        Ok(Self {
            employee_id: normalize_optional_i64(payload, "employee_id")?,
            reporter_name: normalize_optional_string(payload, "reporter_name"),
            title: normalize_required_string(payload, "title"),
            description: normalize_required_string(payload, "description"),
            severity: normalize_required_string(payload, "severity"),
            status: normalize_optional_string(payload, "status"),
            complaint_date: normalize_required_string(payload, "complaint_date"),
            resolution_notes: normalize_optional_string(payload, "resolution_notes"),
            assigned_user_id: normalize_optional_i64(payload, "assigned_user_id")?,
            due_date: normalize_optional_string(payload, "due_date"),
            priority: normalize_optional_string(payload, "priority"),
            case_stage: normalize_optional_string(payload, "case_stage"),
        })
    }

    pub fn force_open_status(&mut self) {
        self.status = None;
        self.resolution_notes = None;
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplaintEmployee {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub department_name: Option<String>,
    pub position_title: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeComplaint {
    pub id: i64,
    pub employee: Option<ComplaintEmployee>,
    pub reporter_name: Option<String>,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub status: String,
    pub complaint_date: String,
    pub resolution_notes: Option<String>,
    pub assigned_user_id: Option<i64>,
    pub due_date: Option<String>,
    pub priority: String,
    pub case_stage: String,
    pub closed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl EmployeeComplaint {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let employee_id: Option<i64> = row.get("employee_id")?;
        let first_name: Option<String> = row.get("employee_first_name")?;
        let last_name: Option<String> = row.get("employee_last_name")?;

        let employee = match (employee_id, first_name, last_name) {
            (Some(id), Some(first_name), Some(last_name)) => Some(ComplaintEmployee {
                id,
                first_name,
                last_name,
                department_name: row.get("employee_department_name")?,
                position_title: row.get("employee_position_title")?,
            }),
            _ => None,
        };

        Ok(Self {
            id: row.get("id")?,
            employee,
            reporter_name: row.get("reporter_name")?,
            title: row.get("title")?,
            description: row.get("description")?,
            severity: row.get("severity")?,
            status: row.get("status")?,
            complaint_date: row.get("complaint_date")?,
            resolution_notes: row.get("resolution_notes")?,
            assigned_user_id: row.get("assigned_user_id")?,
            due_date: row.get("due_date")?,
            priority: row.get("priority")?,
            case_stage: row.get("case_stage")?,
            closed_at: row.get("closed_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
