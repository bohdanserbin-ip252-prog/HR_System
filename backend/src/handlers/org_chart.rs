use crate::{
    AppState, auth,
    error::{AppError, AppResult},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use serde_json::{Value, json};

pub async fn org_chart(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let chart = state.run_db(|conn| {
        let mut stmt = conn.prepare(
            "
            SELECT d.id, d.name, d.head_name, h.id, h.first_name, h.last_name
            FROM departments d
            LEFT JOIN employees h ON h.id = d.head_employee_id
            ORDER BY d.name
            ",
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let deps = stmt.query_map([], |row| Ok((
            row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<i64>>(3)?, row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?
        ))).map_err(|err| AppError::internal(err.to_string()))?;
        let mut items = Vec::new();
        for dep in deps {
            let (id, name, stored_head_name, head_id, first, last) = dep.map_err(|err| AppError::internal(err.to_string()))?;
            let employees = employees_for_department(conn, id)?;
            items.push(json!({
                "id": id,
                "name": name,
                "headName": stored_head_name,
                "head": head_id.map(|head_id| json!({ "id": head_id, "firstName": first, "lastName": last })),
                "employees": employees
            }));
        }
        Ok(items)
    }).await?;
    Ok(Json(json!(chart)))
}

fn employees_for_department(
    conn: &rusqlite::Connection,
    department_id: i64,
) -> AppResult<Vec<Value>> {
    let mut stmt = conn.prepare(
        "SELECT id, first_name, last_name, status FROM employees WHERE department_id=? ORDER BY last_name"
    ).map_err(|err| AppError::internal(err.to_string()))?;
    let rows = stmt
        .query_map([department_id], |row| {
            Ok(json!({
                "id": row.get::<_, i64>(0)?, "firstName": row.get::<_, String>(1)?,
                "lastName": row.get::<_, String>(2)?, "status": row.get::<_, String>(3)?
            }))
        })
        .map_err(|err| AppError::internal(err.to_string()))?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|err| AppError::internal(err.to_string()))
}
