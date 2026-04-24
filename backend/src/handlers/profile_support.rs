use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params, types::ValueRef};
use serde_json::{Map, Value, json};

pub(super) fn empty_profile_response(
    user: &crate::models::User,
    employee_id: Option<i64>,
    is_self: bool,
) -> Value {
    json!({
        "viewer": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "employee_id": user.employee_id
        },
        "profile_employee_id": employee_id,
        "is_self": is_self,
        "identity": Value::Null,
        "employment": Value::Null,
        "documents": [],
        "complaints": [],
        "time_off": [],
        "reviews": [],
        "development": {
            "goals": [],
            "feedback": [],
            "meetings": []
        },
        "training": [],
        "payroll": [],
        "shifts": [],
        "activity": []
    })
}

pub(super) fn query_json_array(conn: &Connection, sql: &str, employee_id: i64) -> AppResult<Value> {
    let mut stmt = conn
        .prepare(sql)
        .map_err(|err| AppError::internal(err.to_string()))?;
    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|name| name.to_string())
        .collect();
    let rows = stmt
        .query_map(params![employee_id], |row| row_to_json_object(row, &column_names))
        .map_err(|err| AppError::internal(err.to_string()))?;
    let items = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(Value::Array(items))
}

pub(super) fn query_json_array_without_params(conn: &Connection, sql: &str) -> AppResult<Value> {
    let mut stmt = conn
        .prepare(sql)
        .map_err(|err| AppError::internal(err.to_string()))?;
    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|name| name.to_string())
        .collect();
    let rows = stmt
        .query_map([], |row| row_to_json_object(row, &column_names))
        .map_err(|err| AppError::internal(err.to_string()))?;
    let items = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(Value::Array(items))
}

fn row_to_json_object(row: &rusqlite::Row<'_>, column_names: &[String]) -> rusqlite::Result<Value> {
    let mut map = Map::new();
    for (index, name) in column_names.iter().enumerate() {
        map.insert(name.clone(), sql_value_to_json(row.get_ref(index)?));
    }
    Ok(Value::Object(map))
}

fn sql_value_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(number) => json!(number),
        ValueRef::Real(number) => json!(number),
        ValueRef::Text(bytes) => json!(String::from_utf8_lossy(bytes).to_string()),
        ValueRef::Blob(bytes) => json!(String::from_utf8_lossy(bytes).to_string()),
    }
}
