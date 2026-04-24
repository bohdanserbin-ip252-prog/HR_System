use crate::json_schemas;
use serde_json::json;

pub fn schemas() -> serde_json::Value {
    json!({
        "Employee": json_schemas::employee_response_schema(),
        "EmployeePayload": json_schemas::employee_payload_schema(),
        "ComplaintPayload": json_schemas::complaint_payload_schema(),
        "DepartmentPayload": json_schemas::department_payload_schema(),
        "PositionPayload": json_schemas::position_payload_schema(),
        "LoginPayload": json_schemas::login_payload_schema(),
        "User": json_schemas::user_response_schema(),
        "AuditEvent": json_schemas::audit_event_schema(),
        "SuccessResponse": json_schemas::success_response_schema()
    })
}
