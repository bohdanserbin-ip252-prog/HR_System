use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub employee_id: Option<i64>,
}

impl User {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            username: row.get("username")?,
            role: row.get("role")?,
            employee_id: row.get("employee_id")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: User,
}
