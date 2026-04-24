#[cfg(test)]
use crate::json_schemas;
#[cfg(test)]
use serde_json::Value;

#[cfg(test)]
fn validate_with_schema(schema_str: &str, value: &Value) -> Result<(), String> {
    let schema: Value = serde_json::from_str(schema_str).map_err(|e| e.to_string())?;

    if schema.get("type").and_then(Value::as_str) != Some("object") {
        return Err("Schema root type must be object".to_string());
    }

    if !value.is_object() {
        return Err("Value must be an object".to_string());
    }

    let obj = value.as_object().unwrap();

    if let Some(required) = schema.get("required").and_then(Value::as_array) {
        for req in required {
            if let Some(key) = req.as_str() {
                if !obj.contains_key(key) {
                    return Err(format!("Missing required field: {}", key));
                }
            }
        }
    }

    if let Some(properties) = schema.get("properties").and_then(Value::as_object) {
        for (key, prop) in properties {
            if let Some(val) = obj.get(key) {
                if let Some(prop_type) = prop.get("type").and_then(Value::as_str) {
                    let valid = match prop_type {
                        "string" => val.is_string(),
                        "integer" => val.is_i64() || val.is_u64(),
                        "number" => val.is_number(),
                        "boolean" => val.is_boolean(),
                        "array" => val.is_array(),
                        "object" => val.is_object(),
                        _ => true,
                    };
                    if !valid {
                        return Err(format!(
                            "Invalid type for field '{}': expected {}",
                            key, prop_type
                        ));
                    }
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
pub fn validate_employee_schema(value: &Value) -> Result<(), String> {
    validate_with_schema(json_schemas::EMPLOYEE_SCHEMA, value)
}

#[cfg(test)]
pub fn validate_complaint_schema(value: &Value) -> Result<(), String> {
    validate_with_schema(json_schemas::COMPLAINT_SCHEMA, value)
}

#[cfg(test)]
pub fn validate_department_schema(value: &Value) -> Result<(), String> {
    validate_with_schema(json_schemas::DEPARTMENT_SCHEMA, value)
}

#[cfg(test)]
pub fn validate_position_schema(value: &Value) -> Result<(), String> {
    validate_with_schema(json_schemas::POSITION_SCHEMA, value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_validate_employee_valid() {
        let value = json!({
            "first_name": "John",
            "last_name": "Doe",
            "hire_date": "2020-01-01",
            "salary": 50000.0,
            "email": "john@example.com"
        });
        assert!(validate_employee_schema(&value).is_ok());
    }

    #[test]
    fn test_validate_employee_missing_field() {
        let value = json!({
            "first_name": "John",
            "hire_date": "2020-01-01",
            "salary": 50000.0
        });
        let result = validate_employee_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("last_name"));
    }

    #[test]
    fn test_validate_employee_wrong_type() {
        let value = json!({
            "first_name": "John",
            "last_name": "Doe",
            "hire_date": "2020-01-01",
            "salary": "not_a_number"
        });
        let result = validate_employee_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("salary"));
    }

    #[test]
    fn test_validate_complaint_valid() {
        let value = json!({
            "title": "Issue",
            "description": "Details",
            "severity": "high",
            "complaint_date": "2023-01-01"
        });
        assert!(validate_complaint_schema(&value).is_ok());
    }

    #[test]
    fn test_validate_complaint_missing_field() {
        let value = json!({
            "title": "Issue",
            "description": "Details",
            "severity": "high"
        });
        let result = validate_complaint_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("complaint_date"));
    }

    #[test]
    fn test_validate_complaint_wrong_type() {
        let value = json!({
            "title": "Issue",
            "description": "Details",
            "severity": "high",
            "complaint_date": 12345
        });
        let result = validate_complaint_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("complaint_date"));
    }

    #[test]
    fn test_validate_department_valid() {
        let value = json!({
            "name": "Engineering",
            "description": "Tech team"
        });
        assert!(validate_department_schema(&value).is_ok());
    }

    #[test]
    fn test_validate_department_missing_field() {
        let value = json!({
            "description": "Tech team"
        });
        let result = validate_department_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("name"));
    }

    #[test]
    fn test_validate_department_wrong_type() {
        let value = json!({
            "name": 123
        });
        let result = validate_department_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("name"));
    }

    #[test]
    fn test_validate_position_valid() {
        let value = json!({
            "title": "Manager",
            "min_salary": 1000.0,
            "max_salary": 2000.0
        });
        assert!(validate_position_schema(&value).is_ok());
    }

    #[test]
    fn test_validate_position_missing_field() {
        let value = json!({
            "title": "Manager",
            "max_salary": 2000.0
        });
        let result = validate_position_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("min_salary"));
    }

    #[test]
    fn test_validate_position_wrong_type() {
        let value = json!({
            "title": "Manager",
            "min_salary": "low",
            "max_salary": 2000.0
        });
        let result = validate_position_schema(&value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("min_salary"));
    }
}
