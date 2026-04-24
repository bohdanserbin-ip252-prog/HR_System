use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Survey {
    pub id: i64,
    pub title: String,
    pub question: String,
    pub options: String,
    pub active: bool,
    pub created_at: String,
    pub vote_counts: Vec<i64>,
    pub total_votes: i64,
}

#[derive(Debug, Deserialize)]
pub struct SurveyPayload {
    pub title: String,
    pub question: String,
    pub options: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SurveyVotePayload {
    pub choice_index: i64,
    pub voter_name: Option<String>,
}

pub fn list_surveys(conn: &Connection) -> rusqlite::Result<Vec<Survey>> {
    let mut stmt = conn.prepare("SELECT * FROM surveys ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        let id: i64 = row.get("id")?;
        let options_str: String = row.get("options")?;
        let options: Vec<String> = serde_json::from_str(&options_str).unwrap_or_default();
        let mut vote_counts = vec![0i64; options.len()];
        let total_votes: i64 = conn.query_row(
            "SELECT COUNT(*) FROM survey_votes WHERE survey_id = ?",
            params![id],
            |r| r.get(0),
        ).unwrap_or(0);
        let mut vote_stmt = conn.prepare("SELECT choice_index, COUNT(*) FROM survey_votes WHERE survey_id = ? GROUP BY choice_index")?;
        let vote_rows = vote_stmt.query_map(params![id], |r| {
            Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?))
        })?;
        for vote in vote_rows.flatten() {
            let idx = vote.0 as usize;
            if idx < vote_counts.len() {
                vote_counts[idx] = vote.1;
            }
        }
        Ok(Survey {
            id,
            title: row.get("title")?,
            question: row.get("question")?,
            options: options_str,
            active: row.get::<_, i64>("active")? != 0,
            created_at: row.get("created_at")?,
            vote_counts,
            total_votes,
        })
    })?;
    rows.collect()
}

pub fn create_survey(conn: &Connection, payload: &SurveyPayload) -> rusqlite::Result<Survey> {
    let options_json = serde_json::to_string(&payload.options).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO surveys (title, question, options) VALUES (?, ?, ?)",
        params![payload.title, payload.question, options_json],
    )?;
    let id = conn.last_insert_rowid();
    let options_str = serde_json::to_string(&payload.options).unwrap_or_else(|_| "[]".to_string());
    Ok(Survey {
        id,
        title: payload.title.clone(),
        question: payload.question.clone(),
        options: options_str,
        active: true,
        created_at: String::new(),
        vote_counts: vec![0; payload.options.len()],
        total_votes: 0,
    })
}

pub fn vote_survey(
    conn: &Connection,
    survey_id: i64,
    payload: &SurveyVotePayload,
) -> rusqlite::Result<bool> {
    let options_str: String = conn.query_row(
        "SELECT options FROM surveys WHERE id = ? AND active = 1",
        params![survey_id],
        |row| row.get(0),
    )?;
    let options: Vec<String> = serde_json::from_str(&options_str).unwrap_or_default();
    let idx = payload.choice_index as usize;
    if idx >= options.len() {
        return Ok(false);
    }
    conn.execute(
        "INSERT INTO survey_votes (survey_id, choice_index, voter_name) VALUES (?, ?, ?)",
        params![survey_id, payload.choice_index, payload.voter_name],
    )?;
    Ok(true)
}

pub fn delete_survey(conn: &Connection, id: i64) -> rusqlite::Result<bool> {
    let affected = conn.execute("DELETE FROM surveys WHERE id = ?", params![id])?;
    Ok(affected > 0)
}

pub fn toggle_survey(conn: &Connection, id: i64, active: bool) -> rusqlite::Result<bool> {
    let affected = conn.execute(
        "UPDATE surveys SET active = ? WHERE id = ?",
        params![if active { 1 } else { 0 }, id],
    )?;
    Ok(affected > 0)
}
