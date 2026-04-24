use crate::{AppError, AppResult};
use chrono::NaiveDate;
use regex::Regex;
use serde_json::Value;
use std::sync::OnceLock;

fn object_field<'a>(payload: &'a Value, key: &str) -> Option<&'a Value> {
    payload.as_object().and_then(|map| map.get(key))
}

fn string_field(payload: &Value, key: &str) -> String {
    object_field(payload, key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn trimmed_string_field(payload: &Value, key: &str) -> String {
    string_field(payload, key).trim().to_string()
}

pub fn normalize_required_string(payload: &Value, key: &str) -> String {
    trimmed_string_field(payload, key)
}

pub fn normalize_optional_string(payload: &Value, key: &str) -> Option<String> {
    let normalized = trimmed_string_field(payload, key);
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

pub fn normalize_optional_email(payload: &Value, key: &str) -> Option<String> {
    normalize_optional_string(payload, key).map(|email| email.to_lowercase())
}

pub fn normalize_optional_i64(payload: &Value, key: &str) -> AppResult<Option<i64>> {
    match object_field(payload, key) {
        Some(Value::Number(number)) => number
            .as_i64()
            .map(Some)
            .ok_or_else(|| AppError::bad_request(format!("Поле {key} має бути цілим числом"))),
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else {
                trimmed
                    .parse::<i64>()
                    .map(Some)
                    .map_err(|_| AppError::bad_request(format!("Поле {key} має бути цілим числом")))
            }
        }
        Some(Value::Null) | None => Ok(None),
        _ => Err(AppError::bad_request(format!(
            "Поле {key} має бути цілим числом"
        ))),
    }
}

pub fn normalize_optional_non_negative_i64(payload: &Value, key: &str) -> AppResult<Option<i64>> {
    let value = normalize_optional_i64(payload, key)?;
    if value.is_some_and(|value| value < 0) {
        Err(AppError::bad_request(format!(
            "Поле {key} не може бути від’ємним"
        )))
    } else {
        Ok(value)
    }
}

pub fn normalize_bool(payload: &Value, key: &str) -> AppResult<bool> {
    match object_field(payload, key) {
        Some(Value::Bool(value)) => Ok(*value),
        Some(Value::Null) | None => Ok(false),
        _ => Err(AppError::bad_request(format!(
            "Поле {key} має бути булевим значенням"
        ))),
    }
}

pub fn normalize_non_negative_number(payload: &Value, key: &str) -> AppResult<f64> {
    let numeric = match object_field(payload, key) {
        Some(Value::Number(number)) => number
            .as_f64()
            .ok_or_else(|| AppError::bad_request(format!("Поле {key} має бути числом")))?,
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                0.0
            } else {
                trimmed
                    .parse::<f64>()
                    .map_err(|_| AppError::bad_request(format!("Поле {key} має бути числом")))?
            }
        }
        Some(Value::Null) | None => 0.0,
        _ => return Err(AppError::bad_request(format!("Поле {key} має бути числом"))),
    };

    if !numeric.is_finite() {
        Err(AppError::bad_request(format!("Поле {key} має бути числом")))
    } else {
        Ok(numeric)
    }
}

pub fn is_valid_email(value: Option<&str>) -> bool {
    static EMAIL_RE: OnceLock<Regex> = OnceLock::new();
    let re = EMAIL_RE
        .get_or_init(|| Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").expect("valid email regex"));

    match value {
        None => true,
        Some(value) => re.is_match(value),
    }
}

pub fn is_valid_date(value: Option<&str>) -> bool {
    static DATE_RE: OnceLock<Regex> = OnceLock::new();
    let re = DATE_RE.get_or_init(|| Regex::new(r"^\d{4}-\d{2}-\d{2}$").expect("valid date regex"));

    match value {
        None => true,
        Some(value) => re.is_match(value) && NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok(),
    }
}
