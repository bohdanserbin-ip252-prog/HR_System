use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Candidate {
    pub id: i64,
    pub full_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position_applied: String,
    pub stage: String,
    pub source: Option<String>,
    pub rating: i64,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CandidatePayload {
    pub full_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position_applied: String,
    pub source: Option<String>,
    pub rating: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStagePayload {
    pub stage: String,
}

impl Candidate {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            full_name: row.get("full_name")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            position_applied: row.get("position_applied")?,
            stage: row.get("stage")?,
            source: row.get("source")?,
            rating: row.get("rating")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

pub fn list_candidates(conn: &Connection) -> rusqlite::Result<Vec<Candidate>> {
    let mut stmt = conn.prepare("SELECT * FROM candidates ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], Candidate::from_row)?;
    rows.collect()
}

pub fn create_candidate(
    conn: &Connection,
    payload: &CandidatePayload,
) -> rusqlite::Result<Candidate> {
    let rating = payload.rating.unwrap_or(0).clamp(0, 5);
    conn.execute(
        "INSERT INTO candidates (full_name, email, phone, position_applied, source, rating, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![
            payload.full_name,
            payload.email,
            payload.phone,
            payload.position_applied,
            payload.source,
            rating,
            payload.notes
        ],
    )?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT * FROM candidates WHERE id = ?",
        params![id],
        Candidate::from_row,
    )
}

pub fn update_candidate_stage(conn: &Connection, id: i64, stage: &str) -> rusqlite::Result<bool> {
    let valid = [
        "new",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
    ];
    if !valid.contains(&stage) {
        return Ok(false);
    }
    let affected = conn.execute(
        "UPDATE candidates SET stage = ?, updated_at = datetime('now') WHERE id = ?",
        params![stage, id],
    )?;
    Ok(affected > 0)
}

pub fn delete_candidate(conn: &Connection, id: i64) -> rusqlite::Result<bool> {
    let affected = conn.execute("DELETE FROM candidates WHERE id = ?", params![id])?;
    Ok(affected > 0)
}
