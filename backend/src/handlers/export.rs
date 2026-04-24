use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::extract::State;
use axum_extra::extract::cookie::CookieJar;

pub async fn export_employees(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<axum::response::Response> {
    auth::require_authenticated(&state, &jar).await?;
    let csv = state
        .run_db(|conn| {
            let mut stmt = conn.prepare(
                "SELECT e.id, e.first_name, e.last_name, e.email, e.phone, e.hire_date, e.salary, e.status,
                        d.name as department, p.title as position
                 FROM employees e
                 LEFT JOIN departments d ON e.department_id = d.id
                 LEFT JOIN positions p ON e.position_id = p.id
                 ORDER BY e.last_name, e.first_name"
            ).map_err(|err| AppError::internal(err.to_string()))?;
            let rows = stmt.query_map([], |row| {
                Ok(format!(
                    "{},{},{},{},{},{},{},{},{},{}",
                    row.get::<_, i64>("id")?,
                    row.get::<_, String>("first_name")?,
                    row.get::<_, String>("last_name")?,
                    row.get::<_, Option<String>>("email")?.unwrap_or_default(),
                    row.get::<_, Option<String>>("phone")?.unwrap_or_default(),
                    row.get::<_, String>("hire_date")?,
                    row.get::<_, f64>("salary")?,
                    row.get::<_, String>("status")?,
                    row.get::<_, Option<String>>("department")?.unwrap_or_default(),
                    row.get::<_, Option<String>>("position")?.unwrap_or_default(),
                ))
            }).map_err(|err| AppError::internal(err.to_string()))?;
            let mut lines = vec![
                "id,first_name,last_name,email,phone,hire_date,salary,status,department,position".to_string(),
            ];
            for row in rows {
                if let Ok(line) = row {
                    lines.push(line);
                }
            }
            Ok::<String, AppError>(lines.join("\n"))
        })
        .await?;

    let response = axum::response::Response::builder()
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=employees.csv")
        .body(axum::body::Body::from(csv))
        .map_err(|err| AppError::internal(err.to_string()))?;

    Ok(response)
}

pub async fn export_complaints(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<axum::response::Response> {
    auth::require_authenticated(&state, &jar).await?;
    let csv = state
        .run_db(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT c.id, c.title, c.description, c.status, c.severity, c.created_at,
                        e.first_name || ' ' || e.last_name as employee_name
                 FROM employee_complaints c
                 LEFT JOIN employees e ON c.employee_id = e.id
                 ORDER BY c.created_at DESC",
                )
                .map_err(|err| AppError::internal(err.to_string()))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(format!(
                        "{},{},{},{},{},{},{}",
                        row.get::<_, i64>("id")?,
                        row.get::<_, String>("title")?,
                        row.get::<_, Option<String>>("description")?
                            .unwrap_or_default(),
                        row.get::<_, String>("status")?,
                        row.get::<_, Option<String>>("severity")?
                            .unwrap_or_default(),
                        row.get::<_, String>("created_at")?,
                        row.get::<_, Option<String>>("employee_name")?
                            .unwrap_or_default(),
                    ))
                })
                .map_err(|err| AppError::internal(err.to_string()))?;
            let mut lines =
                vec!["id,title,description,status,severity,created_at,employee_name".to_string()];
            for row in rows {
                if let Ok(line) = row {
                    lines.push(line);
                }
            }
            Ok::<String, AppError>(lines.join("\n"))
        })
        .await?;

    let response = axum::response::Response::builder()
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=complaints.csv")
        .body(axum::body::Body::from(csv))
        .map_err(|err| AppError::internal(err.to_string()))?;

    Ok(response)
}
