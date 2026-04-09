use regex::Regex;
use rusqlite::Row;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::Value;
use std::sync::OnceLock;

#[derive(Debug, Clone)]
pub struct JsonNumber(pub f64);

impl Serialize for JsonNumber {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if self.0.is_finite()
            && self.0.fract() == 0.0
            && self.0 >= i64::MIN as f64
            && self.0 <= i64::MAX as f64
        {
            serializer.serialize_i64(self.0 as i64)
        } else {
            serializer.serialize_f64(self.0)
        }
    }
}

impl From<f64> for JsonNumber {
    fn from(value: f64) -> Self {
        Self(value)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub role: String,
}

impl User {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            username: row.get("username")?,
            role: row.get("role")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: User,
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    #[serde(rename = "totalEmployees")]
    pub total_employees: i64,
    #[serde(rename = "totalDepartments")]
    pub total_departments: i64,
    #[serde(rename = "totalPositions")]
    pub total_positions: i64,
    #[serde(rename = "avgSalary")]
    pub avg_salary: i64,
    #[serde(rename = "activeCount")]
    pub active_count: i64,
    #[serde(rename = "onLeaveCount")]
    pub on_leave_count: i64,
    #[serde(rename = "firedCount")]
    pub fired_count: i64,
    #[serde(rename = "deptStats")]
    pub dept_stats: Vec<DepartmentCountStat>,
    #[serde(rename = "recentHires")]
    pub recent_hires: Vec<RecentHire>,
    #[serde(rename = "salaryByDept")]
    pub salary_by_dept: Vec<SalaryByDeptStat>,
}

#[derive(Debug, Serialize)]
pub struct DepartmentCountStat {
    pub name: String,
    pub count: i64,
}

impl DepartmentCountStat {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            name: row.get("name")?,
            count: row.get("count")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct RecentHire {
    pub first_name: String,
    pub last_name: String,
    pub hire_date: String,
    pub department: Option<String>,
    pub position: Option<String>,
}

impl RecentHire {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            first_name: row.get("first_name")?,
            last_name: row.get("last_name")?,
            hire_date: row.get("hire_date")?,
            department: row.get("department")?,
            position: row.get("position")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct SalaryByDeptStat {
    pub name: String,
    pub avg_salary: Option<JsonNumber>,
    pub min_salary: Option<JsonNumber>,
    pub max_salary: Option<JsonNumber>,
}

impl SalaryByDeptStat {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            name: row.get("name")?,
            avg_salary: row
                .get::<_, Option<f64>>("avg_salary")?
                .map(JsonNumber::from),
            min_salary: row
                .get::<_, Option<f64>>("min_salary")?
                .map(JsonNumber::from),
            max_salary: row
                .get::<_, Option<f64>>("max_salary")?
                .map(JsonNumber::from),
        })
    }
}

#[derive(Debug, Serialize)]
pub struct Employee {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birth_date: Option<String>,
    pub hire_date: String,
    pub salary: JsonNumber,
    pub department_id: Option<i64>,
    pub position_id: Option<i64>,
    pub status: String,
    pub address: Option<String>,
    pub photo_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Employee {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            first_name: row.get("first_name")?,
            last_name: row.get("last_name")?,
            middle_name: row.get("middle_name")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            birth_date: row.get("birth_date")?,
            hire_date: row.get("hire_date")?,
            salary: JsonNumber(row.get::<_, f64>("salary")?),
            department_id: row.get("department_id")?,
            position_id: row.get("position_id")?,
            status: row.get("status")?,
            address: row.get("address")?,
            photo_url: row.get("photo_url")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct EmployeeWithNames {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birth_date: Option<String>,
    pub hire_date: String,
    pub salary: JsonNumber,
    pub department_id: Option<i64>,
    pub position_id: Option<i64>,
    pub status: String,
    pub address: Option<String>,
    pub photo_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub department_name: Option<String>,
    pub position_title: Option<String>,
}

impl EmployeeWithNames {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            first_name: row.get("first_name")?,
            last_name: row.get("last_name")?,
            middle_name: row.get("middle_name")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            birth_date: row.get("birth_date")?,
            hire_date: row.get("hire_date")?,
            salary: JsonNumber(row.get::<_, f64>("salary")?),
            department_id: row.get("department_id")?,
            position_id: row.get("position_id")?,
            status: row.get("status")?,
            address: row.get("address")?,
            photo_url: row.get("photo_url")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            department_name: row.get("department_name")?,
            position_title: row.get("position_title")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct Department {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub head_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Department {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            head_name: row.get("head_name")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct DepartmentWithCount {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub head_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub employee_count: i64,
}

impl DepartmentWithCount {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            head_name: row.get("head_name")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            employee_count: row.get("employee_count")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct Position {
    pub id: i64,
    pub title: String,
    pub min_salary: JsonNumber,
    pub max_salary: JsonNumber,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Position {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            min_salary: JsonNumber(row.get::<_, f64>("min_salary")?),
            max_salary: JsonNumber(row.get::<_, f64>("max_salary")?),
            description: row.get("description")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct PositionWithCount {
    pub id: i64,
    pub title: String,
    pub min_salary: JsonNumber,
    pub max_salary: JsonNumber,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub employee_count: i64,
}

impl PositionWithCount {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            min_salary: JsonNumber(row.get::<_, f64>("min_salary")?),
            max_salary: JsonNumber(row.get::<_, f64>("max_salary")?),
            description: row.get("description")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            employee_count: row.get("employee_count")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct DevelopmentResponse {
    pub goals: Vec<DevelopmentGoal>,
    pub feedback: Vec<DevelopmentFeedback>,
    pub meetings: Vec<DevelopmentMeeting>,
}

#[derive(Debug, Serialize)]
pub struct DevelopmentGoal {
    pub id: i64,
    pub icon: String,
    pub title: String,
    pub desc: String,
    pub status: String,
    pub progress: i64,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "displayOrder")]
    pub display_order: i64,
}

impl DevelopmentGoal {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            icon: row.get("icon")?,
            title: row.get("title")?,
            desc: row.get("desc")?,
            status: row.get("status")?,
            progress: row.get("progress")?,
            due_date: row.get("due_date")?,
            display_order: row.get("display_order")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct DevelopmentFeedbackAuthor {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
}

#[derive(Debug, Serialize)]
pub struct DevelopmentFeedback {
    pub id: i64,
    pub text: String,
    #[serde(rename = "feedbackAt")]
    pub feedback_at: String,
    pub employee: Option<DevelopmentFeedbackAuthor>,
    #[serde(rename = "displayOrder")]
    pub display_order: i64,
}

impl DevelopmentFeedback {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let employee_id: Option<i64> = row.get("employee_id")?;
        let employee_first_name: Option<String> = row.get("employee_first_name")?;
        let employee_last_name: Option<String> = row.get("employee_last_name")?;

        let employee = match (employee_id, employee_first_name, employee_last_name) {
            (Some(id), Some(first_name), Some(last_name)) => Some(DevelopmentFeedbackAuthor {
                id,
                first_name,
                last_name,
            }),
            _ => None,
        };

        Ok(Self {
            id: row.get("id")?,
            text: row.get("text")?,
            feedback_at: row.get("feedback_at")?,
            employee,
            display_order: row.get("display_order")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct DevelopmentMeeting {
    pub id: i64,
    pub date: String,
    pub title: String,
    #[serde(rename = "type")]
    pub meeting_type: String,
    #[serde(rename = "displayOrder")]
    pub display_order: i64,
}

impl DevelopmentMeeting {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            date: row.get("date")?,
            title: row.get("title")?,
            meeting_type: row.get("meeting_type")?,
            display_order: row.get("display_order")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct OnboardingResponse {
    pub team: OnboardingTeam,
    pub tasks: Vec<OnboardingTask>,
    pub buddy: Option<OnboardingBuddy>,
    pub progress: OnboardingProgress,
}

#[derive(Debug, Serialize)]
pub struct OnboardingTeam {
    pub avatars: Vec<OnboardingAvatar>,
    #[serde(rename = "totalCount")]
    pub total_count: i64,
}

#[derive(Debug, Serialize)]
pub struct OnboardingAvatar {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
}

impl OnboardingAvatar {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            first_name: row.get("first_name")?,
            last_name: row.get("last_name")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct OnboardingTask {
    pub id: i64,
    pub status: String,
    pub icon: String,
    pub title: String,
    pub desc: String,
    #[serde(rename = "priority")]
    pub is_priority: bool,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "displayOrder")]
    pub display_order: i64,
}

impl OnboardingTask {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            status: row.get("status")?,
            icon: row.get("icon")?,
            title: row.get("title")?,
            desc: row.get("desc")?,
            is_priority: row.get("is_priority")?,
            due_date: row.get("due_date")?,
            display_order: row.get("display_order")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct OnboardingBuddy {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
}

impl OnboardingBuddy {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            first_name: row.get("first_name")?,
            last_name: row.get("last_name")?,
            role: row.get("role")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct OnboardingProgress {
    #[serde(rename = "completedCount")]
    pub completed_count: i64,
    #[serde(rename = "totalCount")]
    pub total_count: i64,
    pub percent: i64,
}

#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct EmployeesQuery {
    pub search: Option<String>,
    pub department_id: Option<String>,
    pub status: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
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
            password: string_field(payload, "password"),
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            first_name: normalize_required_string(payload, "first_name"),
            last_name: normalize_required_string(payload, "last_name"),
            middle_name: normalize_optional_string(payload, "middle_name"),
            email: normalize_optional_string(payload, "email"),
            phone: normalize_optional_string(payload, "phone"),
            birth_date: normalize_optional_string(payload, "birth_date"),
            hire_date: normalize_required_string(payload, "hire_date"),
            salary: normalize_non_negative_number(payload, "salary"),
            department_id: normalize_optional_i64(payload, "department_id"),
            position_id: normalize_optional_i64(payload, "position_id"),
            status: normalize_optional_string(payload, "status"),
            address: normalize_optional_string(payload, "address"),
        }
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            title: normalize_required_string(payload, "title"),
            min_salary: normalize_non_negative_number(payload, "min_salary"),
            max_salary: normalize_non_negative_number(payload, "max_salary"),
            description: normalize_optional_string(payload, "description"),
        }
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            icon: normalize_required_string(payload, "icon"),
            title: normalize_required_string(payload, "title"),
            desc: normalize_required_string(payload, "desc"),
            status: normalize_required_string(payload, "status"),
            progress: normalize_non_negative_number(payload, "progress"),
            due_date: normalize_optional_string(payload, "due_date"),
            display_order: normalize_optional_i64(payload, "display_order"),
        }
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            employee_id: normalize_optional_i64(payload, "employee_id"),
            text: normalize_required_string(payload, "text"),
            feedback_at: normalize_required_string(payload, "feedback_at"),
            display_order: normalize_optional_i64(payload, "display_order"),
        }
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            date: normalize_required_string(payload, "date"),
            title: normalize_required_string(payload, "title"),
            meeting_type: normalize_required_string(payload, "meeting_type"),
            display_order: normalize_optional_i64(payload, "display_order"),
        }
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
    pub fn from_json(payload: &Value) -> Self {
        Self {
            status: normalize_required_string(payload, "status"),
            icon: normalize_required_string(payload, "icon"),
            title: normalize_required_string(payload, "title"),
            desc: normalize_required_string(payload, "desc"),
            is_priority: normalize_bool(payload, "is_priority"),
            due_date: normalize_optional_string(payload, "due_date"),
            display_order: normalize_optional_i64(payload, "display_order"),
        }
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

fn object_field<'a>(payload: &'a Value, key: &str) -> Option<&'a Value> {
    payload.as_object().and_then(|map| map.get(key))
}

fn string_field(payload: &Value, key: &str) -> String {
    object_field(payload, key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn trimmed_string_field(payload: &Value, key: &str) -> String {
    string_field(payload, key).trim().to_string()
}

pub fn normalize_required_string(payload: &Value, key: &str) -> String {
    trimmed_string_field(payload, key)
}

pub fn normalize_optional_string(payload: &Value, key: &str) -> Option<String> {
    let normalized = trimmed_string_field(payload, key);
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

pub fn normalize_optional_i64(payload: &Value, key: &str) -> Option<i64> {
    match object_field(payload, key) {
        Some(Value::Number(number)) => number.as_i64(),
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                trimmed.parse::<i64>().ok()
            }
        }
        _ => None,
    }
}

pub fn normalize_bool(payload: &Value, key: &str) -> bool {
    match object_field(payload, key) {
        Some(Value::Bool(value)) => *value,
        Some(Value::Number(number)) => number.as_i64().unwrap_or_default() != 0,
        Some(Value::String(text)) => matches!(text.trim(), "true" | "1" | "yes" | "on"),
        _ => false,
    }
}

pub fn normalize_non_negative_number(payload: &Value, key: &str) -> f64 {
    let numeric = match object_field(payload, key) {
        Some(Value::Number(number)) => number.as_f64().unwrap_or(0.0),
        Some(Value::String(text)) => text.trim().parse::<f64>().ok().unwrap_or(0.0),
        _ => 0.0,
    };

    if !numeric.is_finite() {
        0.0
    } else if numeric < 0.0 {
        -1.0
    } else {
        numeric
    }
}

pub fn is_valid_email(value: Option<&str>) -> bool {
    static EMAIL_RE: OnceLock<Regex> = OnceLock::new();
    let re = EMAIL_RE
        .get_or_init(|| Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").expect("valid email regex"));

    match value {
        None => true,
        Some(value) => re.is_match(value),
    }
}

pub fn is_valid_date(value: Option<&str>) -> bool {
    static DATE_RE: OnceLock<Regex> = OnceLock::new();
    let re =
        DATE_RE.get_or_init(|| Regex::new(r"^\d{4}-\d{2}-\d{2}$").expect("valid date regex"));

    match value {
        None => true,
        Some(value) => re.is_match(value),
    }
}
