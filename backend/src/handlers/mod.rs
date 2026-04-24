mod activity;
mod admin_payload_crud;
mod audit;
mod auth_handlers;
mod bulk;
mod candidates;
mod case_comments;
mod complaints;
mod complaints_helpers;
mod crud_helpers;
mod crud_route_support;
mod dashboard;
mod db_errors;
mod departments;
mod development_feedback;
mod development_goals;
mod development_meetings;
mod documents;
mod employees;
mod enterprise;
mod enterprise_utils;
mod export;
mod feature_flags;
mod health;
mod json_payload;
mod notifications;
mod notifications_email;
mod notifications_extra;
mod onboarding_tasks;
mod openapi;
mod openapi_paths;
mod openapi_schemas;
mod org_chart;
mod payload_route_support;
mod platform;
mod positions;
mod profile;
mod profile_support;
mod rbac;
mod reviews;
mod search;
mod sse;
mod surveys;
mod tickets;
mod time_off;
mod validation;

pub use activity::activity;
pub use audit::list_audit_events;
pub use auth_handlers::{change_password, login, logout, me};
pub use bulk::{
    bulk_delete_complaints, bulk_delete_employees, bulk_update_complaints, bulk_update_employees,
};
pub use candidates::candidates_routes;
pub use case_comments::add_complaint_comment;
pub use complaints::{
    complaint_timeline, create_complaint, delete_complaint, get_complaint, list_complaints,
    update_complaint,
};
pub use dashboard::{development, onboarding, stats};
pub use departments::{
    create_department, delete_department, get_department, list_departments, update_department,
};
pub use development_feedback::{
    create_development_feedback, delete_development_feedback, move_development_feedback,
    update_development_feedback,
};
pub use development_goals::{
    create_development_goal, delete_development_goal, move_development_goal,
    update_development_goal,
};
pub use development_meetings::{
    create_development_meeting, delete_development_meeting, move_development_meeting,
    update_development_meeting,
};
pub use documents::{create_document, delete_document, download_document, list_documents};
pub use employees::{
    create_employee, delete_employee, get_employee, list_employees, update_employee,
};
pub use enterprise::enterprise_routes;
pub use export::{export_complaints, export_employees};
pub use feature_flags::{check_feature_flag, list_feature_flags, update_feature_flag};
pub use health::health_check;
pub use json_payload::{api_method_not_allowed, api_not_found};
pub use notifications::{list_notifications, mark_notification_read};
pub use notifications_email::test_email;
pub use notifications_extra::{mark_all_notifications_read, notification_unread_count};
pub use onboarding_tasks::{
    create_onboarding_task, delete_onboarding_task, move_onboarding_task, update_onboarding_task,
};
pub use openapi::openapi_spec;
pub use org_chart::org_chart;
pub use platform::platform_routes;
pub use positions::{
    create_position, delete_position, get_position, list_positions, update_position,
};
pub use profile::{profile_by_employee_id, profile_me};
pub use rbac::rbac_routes;
pub use reviews::{create_review, list_reviews};
pub use search::search;
pub use sse::events_stream;
pub use surveys::surveys_routes;
pub use tickets::tickets_routes;
pub use time_off::{create_time_off, decide_time_off, list_time_off};
