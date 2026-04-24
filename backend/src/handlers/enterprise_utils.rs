use crate::{
    db,
    error::{AppError, AppResult},
};
use serde_json::{Value, json};

pub fn seed_payroll_items(conn: &rusqlite::Connection, run_id: i64) -> AppResult<Vec<Value>> {
    let mut stmt = conn
        .prepare("SELECT id, salary FROM employees WHERE status != 'fired'")
        .map_err(|err| AppError::internal(err.to_string()))?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?)))
        .map_err(|err| AppError::internal(err.to_string()))?;
    let mut items = Vec::new();
    for row in rows {
        let (employee_id, salary) = row.map_err(|err| AppError::internal(err.to_string()))?;
        conn.execute(
            "INSERT INTO payroll_items (run_id, employee_id, gross, net) VALUES (?, ?, ?, ?)",
            rusqlite::params![run_id, employee_id, salary, salary],
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
        items.push(json!({ "id": conn.last_insert_rowid(), "employeeId": employee_id, "gross": salary, "bonuses": 0, "deductions": 0, "net": salary }));
    }
    Ok(items)
}

pub fn audit(
    conn: &rusqlite::Connection,
    user: &crate::models::User,
    action: &str,
    entity_type: &str,
    entity_id: i64,
    name: &str,
) -> AppResult<()> {
    db::record_audit_event(
        conn,
        db::AuditEventInput {
            actor_user_id: Some(user.id),
            actor_username: Some(&user.username),
            action,
            entity_type,
            entity_id: Some(entity_id),
            entity_name: Some(name),
            details: Some(name),
        },
    )
    .map_err(|err| AppError::internal(err.to_string()))
}

pub fn str_field(payload: &Value, key: &str) -> String {
    payload[key].as_str().unwrap_or_default().trim().to_string()
}

pub fn opt_str(payload: &Value, key: &str) -> Option<String> {
    payload[key]
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub fn int_field(payload: &Value, key: &str) -> AppResult<i64> {
    payload[key]
        .as_i64()
        .ok_or_else(|| AppError::bad_request(format!("{key} обов'язковий")))
}

pub fn collect_rows(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<Value>>,
) -> AppResult<Vec<Value>> {
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|err| AppError::internal(err.to_string()))
}

pub fn simple_rows<const N: usize>(
    conn: &rusqlite::Connection,
    sql: &str,
    keys: [&str; N],
) -> AppResult<Vec<Value>> {
    let mut stmt = conn
        .prepare(sql)
        .map_err(|err| AppError::internal(err.to_string()))?;
    let rows = stmt
        .query_map([], |row| row_json(row, &keys))
        .map_err(|err| AppError::internal(err.to_string()))?;
    collect_rows(rows)
}

fn row_json(row: &rusqlite::Row<'_>, keys: &[&str]) -> rusqlite::Result<Value> {
    let mut map = serde_json::Map::new();
    for (index, key) in keys.iter().enumerate() {
        let value = match row.get_ref(index)? {
            rusqlite::types::ValueRef::Null => Value::Null,
            rusqlite::types::ValueRef::Integer(value) => json!(value),
            rusqlite::types::ValueRef::Real(value) => json!(value),
            rusqlite::types::ValueRef::Text(value) => json!(String::from_utf8_lossy(value)),
            rusqlite::types::ValueRef::Blob(_) => json!("[blob]"),
        };
        map.insert((*key).to_string(), value);
    }
    Ok(Value::Object(map))
}
