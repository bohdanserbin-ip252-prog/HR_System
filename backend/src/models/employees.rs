use crate::models::JsonNumber;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use std::ops::Deref;

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
    #[serde(flatten)]
    pub employee: Employee,
    pub department_name: Option<String>,
    pub position_title: Option<String>,
}

impl EmployeeWithNames {
    fn from_employee(
        employee: Employee,
        department_name: Option<String>,
        position_title: Option<String>,
    ) -> Self {
        Self {
            employee,
            department_name,
            position_title,
        }
    }

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let employee = Employee::from_row(row)?;
        Ok(Self::from_employee(
            employee,
            row.get("department_name")?,
            row.get("position_title")?,
        ))
    }
}

impl Deref for EmployeeWithNames {
    type Target = Employee;

    fn deref(&self) -> &Self::Target {
        &self.employee
    }
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct EmployeesQuery {
    pub search: Option<String>,
    pub department_id: Option<String>,
    pub status: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}
