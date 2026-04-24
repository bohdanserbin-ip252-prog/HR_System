use crate::models::{
    DevelopmentFeedback, DevelopmentGoal, DevelopmentMeeting, DevelopmentResponse,
};
use rusqlite::{Connection, OptionalExtension, params};

use crate::db::map_all;

pub fn fetch_development(conn: &Connection) -> rusqlite::Result<DevelopmentResponse> {
    let goals = map_all(
        conn,
        "
        SELECT id, icon, title, desc, status, progress, due_date, display_order
        FROM development_goals
        ORDER BY display_order, id
        ",
        [],
        DevelopmentGoal::from_row,
    )?;

    let feedback = map_all(
        conn,
        "
        SELECT
            df.id,
            df.text,
            df.feedback_at,
            df.display_order,
            e.id as employee_id,
            e.first_name as employee_first_name,
            e.last_name as employee_last_name
        FROM development_feedback df
        LEFT JOIN employees e ON df.employee_id = e.id
        ORDER BY df.display_order, df.id
        ",
        [],
        DevelopmentFeedback::from_row,
    )?;

    let meetings = map_all(
        conn,
        "
        SELECT id, date, title, meeting_type, display_order
        FROM development_meetings
        ORDER BY display_order, id
        ",
        [],
        DevelopmentMeeting::from_row,
    )?;

    Ok(DevelopmentResponse {
        goals,
        feedback,
        meetings,
    })
}

pub fn get_development_goal(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentGoal>> {
    conn.query_row(
        "
        SELECT id, icon, title, desc, status, progress, due_date, display_order
        FROM development_goals
        WHERE id = ?
        ",
        params![id],
        DevelopmentGoal::from_row,
    )
    .optional()
}

pub fn get_development_feedback(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentFeedback>> {
    conn.query_row(
        "
        SELECT
            df.id,
            df.text,
            df.feedback_at,
            df.display_order,
            e.id as employee_id,
            e.first_name as employee_first_name,
            e.last_name as employee_last_name
        FROM development_feedback df
        LEFT JOIN employees e ON df.employee_id = e.id
        WHERE df.id = ?
        ",
        params![id],
        DevelopmentFeedback::from_row,
    )
    .optional()
}

pub fn get_development_meeting(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<Option<DevelopmentMeeting>> {
    conn.query_row(
        "
        SELECT id, date, title, meeting_type, display_order
        FROM development_meetings
        WHERE id = ?
        ",
        params![id],
        DevelopmentMeeting::from_row,
    )
    .optional()
}
