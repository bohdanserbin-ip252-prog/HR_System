use rusqlite::Row;
use serde::Serialize;

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
