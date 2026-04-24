mod audit;
mod auth_sessions;
mod bootstrap;
pub mod candidates;
mod complaints;
mod complaints_query;
mod development;
mod employees;
mod expansion_migrations;
mod expansion_schema;
mod feature_flags;
mod fts;
mod migration_registry;
pub mod migrations;
mod onboarding;
mod ordering;
mod organization;
mod paths;
mod rbac;
mod schema;
mod schema_fragments;
mod seed;
mod stats;
pub mod surveys;
pub mod tickets;
mod utils;

#[cfg(test)]
mod tests;

pub(crate) use audit::{AuditEventInput, record_audit_event};
pub use audit::{count_audit_events, list_audit_events, list_audit_events_paginated};
pub(crate) use auth_sessions::hash_password;
pub use auth_sessions::{
    authenticate_user, create_session, delete_session, find_user_by_session_token,
};
pub use bootstrap::{initialize_database, open_connection};
pub use complaints::{create_complaint, delete_complaint, get_complaint, update_complaint};
pub use complaints_query::{count_complaints, list_complaints, list_complaints_paginated};
pub use development::{
    create_development_feedback, create_development_goal, create_development_meeting,
    delete_development_feedback, delete_development_goal, delete_development_meeting,
    fetch_development, get_development_feedback, get_development_goal, get_development_meeting,
    move_development_feedback, move_development_goal, move_development_meeting,
    update_development_feedback, update_development_goal, update_development_meeting,
};
#[allow(unused_imports)]
pub use employees::{
    create_employee, delete_employee, get_employee, get_employee_with_names, list_employees,
    update_employee,
};
pub use feature_flags::{FeatureFlag, get_feature_flag, list_feature_flags, update_feature_flag};
pub use fts::{search_complaints, search_documents, search_employees};
pub use onboarding::{
    create_onboarding_task, delete_onboarding_task, fetch_onboarding, get_onboarding_task,
    move_onboarding_task, update_onboarding_task,
};
pub use organization::{
    create_department, create_position, delete_department, delete_position, get_department,
    get_position, list_departments, list_positions, update_department, update_position,
};
pub use paths::{default_db_path, default_frontend_dist_dir};
pub use rbac::{
    assign_role, list_permissions, list_role_permissions_matrix, list_user_permissions,
    revoke_role,
};
pub use stats::fetch_stats;

pub(crate) use ordering::move_display_order;
pub(crate) use seed::seed_database;
pub(crate) use utils::{map_all, table_has_column, table_has_rows};
