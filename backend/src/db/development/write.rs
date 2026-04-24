use crate::db::move_display_order;
use crate::models::{
    DevelopmentFeedback, DevelopmentFeedbackPayload, DevelopmentGoal, DevelopmentGoalPayload,
    DevelopmentMeeting, DevelopmentMeetingPayload,
};
use rusqlite::{Connection, params};

use super::read::{get_development_feedback, get_development_goal, get_development_meeting};

fn next_display_order(conn: &Connection, table_name: &str) -> rusqlite::Result<i64> {
    let sql = format!("SELECT COALESCE(MAX(display_order), 0) + 1 FROM {table_name}");
    conn.query_row(&sql, [], |row| row.get(0))
}

pub fn create_development_goal(
    conn: &Connection,
    payload: &DevelopmentGoalPayload,
) -> rusqlite::Result<DevelopmentGoal> {
    let display_order = match payload.display_order {
        Some(display_order) => display_order,
        None => next_display_order(conn, "development_goals")?,
    };

    conn.execute(
        "
        INSERT INTO development_goals
        (icon, title, desc, status, progress, due_date, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ",
        params![
            payload.icon,
            payload.title,
            payload.desc,
            payload.status,
            payload.progress.round() as i64,
            payload.due_date,
            display_order
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_goal(conn, &id).map(|goal| goal.expect("goal exists after insert"))
}

pub fn update_development_goal(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentGoalPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_goals SET
        icon=?, title=?, desc=?, status=?, progress=?, due_date=?, display_order=COALESCE(?, display_order), updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.icon,
            payload.title,
            payload.desc,
            payload.status,
            payload.progress.round() as i64,
            payload.due_date,
            payload.display_order,
            id
        ],
    )
}

pub fn delete_development_goal(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_goals WHERE id = ?", params![id])
}

pub fn create_development_feedback(
    conn: &Connection,
    payload: &DevelopmentFeedbackPayload,
) -> rusqlite::Result<DevelopmentFeedback> {
    let display_order = match payload.display_order {
        Some(display_order) => display_order,
        None => next_display_order(conn, "development_feedback")?,
    };

    conn.execute(
        "
        INSERT INTO development_feedback
        (employee_id, text, feedback_at, display_order)
        VALUES (?, ?, ?, ?)
        ",
        params![
            payload.employee_id,
            payload.text,
            payload.feedback_at,
            display_order
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_feedback(conn, &id)
        .map(|feedback| feedback.expect("feedback exists after insert"))
}

pub fn update_development_feedback(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentFeedbackPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_feedback SET
        employee_id=?, text=?, feedback_at=?, display_order=COALESCE(?, display_order), updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.employee_id,
            payload.text,
            payload.feedback_at,
            payload.display_order,
            id
        ],
    )
}

pub fn delete_development_feedback(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_feedback WHERE id = ?", params![id])
}

pub fn create_development_meeting(
    conn: &Connection,
    payload: &DevelopmentMeetingPayload,
) -> rusqlite::Result<DevelopmentMeeting> {
    let display_order = match payload.display_order {
        Some(display_order) => display_order,
        None => next_display_order(conn, "development_meetings")?,
    };

    conn.execute(
        "
        INSERT INTO development_meetings
        (date, title, meeting_type, display_order)
        VALUES (?, ?, ?, ?)
        ",
        params![
            payload.date,
            payload.title,
            payload.meeting_type,
            display_order
        ],
    )?;
    let id = conn.last_insert_rowid().to_string();
    get_development_meeting(conn, &id).map(|meeting| meeting.expect("meeting exists after insert"))
}

pub fn update_development_meeting(
    conn: &Connection,
    id: &str,
    payload: &DevelopmentMeetingPayload,
) -> rusqlite::Result<usize> {
    conn.execute(
        "
        UPDATE development_meetings SET
        date=?, title=?, meeting_type=?, display_order=COALESCE(?, display_order), updated_at=datetime('now')
        WHERE id=?
        ",
        params![
            payload.date,
            payload.title,
            payload.meeting_type,
            payload.display_order,
            id
        ],
    )
}

pub fn delete_development_meeting(conn: &Connection, id: &str) -> rusqlite::Result<usize> {
    conn.execute("DELETE FROM development_meetings WHERE id = ?", params![id])
}

pub fn move_development_goal(conn: &Connection, id: &str, direction: &str) -> rusqlite::Result<()> {
    move_display_order(conn, "development_goals", id, direction)
}

pub fn move_development_feedback(
    conn: &Connection,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    move_display_order(conn, "development_feedback", id, direction)
}

pub fn move_development_meeting(
    conn: &Connection,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    move_display_order(conn, "development_meetings", id, direction)
}
