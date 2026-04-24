use crate::models::JsonNumber;
use rusqlite::Row;
use serde::Serialize;

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
    #[serde(rename = "riskMetrics")]
    pub risk_metrics: RiskMetrics,
    #[serde(rename = "departmentHealth")]
    pub department_health: Vec<DepartmentHealthStat>,
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

#[derive(Debug, Serialize)]
pub struct RiskMetrics {
    #[serde(rename = "openComplaints")]
    pub open_complaints: i64,
    #[serde(rename = "criticalComplaints")]
    pub critical_complaints: i64,
    #[serde(rename = "repeatComplaintEmployees")]
    pub repeat_complaint_employees: i64,
    #[serde(rename = "overdueCases")]
    pub overdue_cases: i64,
    #[serde(rename = "pendingTimeOff")]
    pub pending_time_off: i64,
    #[serde(rename = "overdueReviews")]
    pub overdue_reviews: i64,
}

#[derive(Debug, Serialize)]
pub struct DepartmentHealthStat {
    pub name: String,
    #[serde(rename = "activeEmployees")]
    pub active_employees: i64,
    #[serde(rename = "openCases")]
    pub open_cases: i64,
}

impl DepartmentHealthStat {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            name: row.get("name")?,
            active_employees: row.get("active_employees")?,
            open_cases: row.get("open_cases")?,
        })
    }
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
