use serde_json::{Value, json};

macro_rules! employee_properties_schema_json {
    () => {
        r#"{
        "first_name": { "type": "string" },
        "last_name": { "type": "string" },
        "middle_name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "birth_date": { "type": "string", "format": "date" },
        "hire_date": { "type": "string", "format": "date" },
        "salary": { "type": "number" },
        "department_id": { "type": "integer" },
        "position_id": { "type": "integer" },
        "status": { "type": "string" },
        "address": { "type": "string" }
    }"#
    };
}

pub const EMPLOYEE_SCHEMA: &str = concat!(
    r#"
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["first_name", "last_name", "hire_date", "salary"],
    "properties": "#,
    employee_properties_schema_json!(),
    r#"
}
"#
);

fn parse_schema(schema_name: &str, schema: &str) -> Value {
    serde_json::from_str(schema)
        .unwrap_or_else(|_| panic!("{} JSON schema must be valid", schema_name))
}

fn employee_properties_schema() -> Value {
    parse_schema(
        "EMPLOYEE_PROPERTIES_SCHEMA",
        employee_properties_schema_json!(),
    )
}

fn object_schema(required: &[&str], properties: Value) -> Value {
    json!({
        "type": "object",
        "required": required,
        "properties": properties
    })
}

pub fn employee_payload_schema() -> Value {
    parse_schema("EMPLOYEE_SCHEMA", EMPLOYEE_SCHEMA)
}

pub fn complaint_payload_schema() -> Value {
    parse_schema("COMPLAINT_SCHEMA", COMPLAINT_SCHEMA)
}

pub fn department_payload_schema() -> Value {
    parse_schema("DEPARTMENT_SCHEMA", DEPARTMENT_SCHEMA)
}

pub fn position_payload_schema() -> Value {
    parse_schema("POSITION_SCHEMA", POSITION_SCHEMA)
}

pub fn employee_response_schema() -> Value {
    let mut properties = employee_properties_schema();
    let property_map = properties
        .as_object_mut()
        .expect("EMPLOYEE_PROPERTIES_SCHEMA must be a JSON object");
    property_map.insert("id".to_string(), json!({ "type": "integer" }));
    property_map.insert("photo_url".to_string(), json!({ "type": "string" }));
    property_map.insert("created_at".to_string(), json!({ "type": "string" }));
    property_map.insert("updated_at".to_string(), json!({ "type": "string" }));
    object_schema(
        &[
            "id",
            "first_name",
            "last_name",
            "hire_date",
            "salary",
            "status",
            "created_at",
            "updated_at",
        ],
        properties,
    )
}

pub fn login_payload_schema() -> Value {
    json!({
        "type": "object",
        "required": ["username", "password"],
        "properties": {
            "username": { "type": "string" },
            "password": { "type": "string" }
        }
    })
}

pub fn user_response_schema() -> Value {
    json!({
        "type": "object",
        "required": ["id", "username", "role"],
        "properties": {
            "id": { "type": "integer" },
            "username": { "type": "string" },
            "role": { "type": "string" },
            "employee_id": { "type": "integer" }
        }
    })
}

pub fn audit_event_schema() -> Value {
    json!({
        "type": "object",
        "required": ["id", "action", "entity_type", "created_at"],
        "properties": {
            "id": { "type": "integer" },
            "actor_user_id": { "type": "integer" },
            "actor_username": { "type": "string" },
            "action": { "type": "string" },
            "entity_type": { "type": "string" },
            "entity_id": { "type": "integer" },
            "entity_name": { "type": "string" },
            "details": { "type": "string" },
            "created_at": { "type": "string" }
        }
    })
}

pub fn success_response_schema() -> Value {
    json!({
        "type": "object",
        "required": ["success"],
        "properties": {
            "success": { "type": "boolean" }
        }
    })
}

pub const COMPLAINT_SCHEMA: &str = r#"
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["title", "description", "severity", "complaint_date"],
    "properties": {
        "employee_id": { "type": "integer" },
        "reporter_name": { "type": "string" },
        "title": { "type": "string" },
        "description": { "type": "string" },
        "severity": { "type": "string" },
        "status": { "type": "string" },
        "complaint_date": { "type": "string", "format": "date" },
        "resolution_notes": { "type": "string" },
        "assigned_user_id": { "type": "integer" },
        "due_date": { "type": "string", "format": "date" },
        "priority": { "type": "string" },
        "case_stage": { "type": "string" }
    }
}
"#;

pub const DEPARTMENT_SCHEMA: &str = r#"
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["name"],
    "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "head_name": { "type": "string" }
    }
}
"#;

pub const POSITION_SCHEMA: &str = r#"
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["title", "min_salary", "max_salary"],
    "properties": {
        "title": { "type": "string" },
        "min_salary": { "type": "number" },
        "max_salary": { "type": "number" },
        "description": { "type": "string" }
    }
}
"#;
