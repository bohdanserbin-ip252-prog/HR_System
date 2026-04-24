use rusqlite::Row;
use serde::Serialize;

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
