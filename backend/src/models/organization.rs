use crate::models::JsonNumber;
use rusqlite::Row;
use serde::Serialize;

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
    fn from_department(department: Department, employee_count: i64) -> Self {
        Self {
            id: department.id,
            name: department.name,
            description: department.description,
            head_name: department.head_name,
            created_at: department.created_at,
            updated_at: department.updated_at,
            employee_count,
        }
    }

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let department = Department::from_row(row)?;
        Ok(Self::from_department(
            department,
            row.get("employee_count")?,
        ))
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
    fn from_position(position: Position, employee_count: i64) -> Self {
        Self {
            id: position.id,
            title: position.title,
            min_salary: position.min_salary,
            max_salary: position.max_salary,
            description: position.description,
            created_at: position.created_at,
            updated_at: position.updated_at,
            employee_count,
        }
    }

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let position = Position::from_row(row)?;
        Ok(Self::from_position(position, row.get("employee_count")?))
    }
}
