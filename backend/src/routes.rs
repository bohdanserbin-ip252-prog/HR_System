use axum::{
    Router,
    routing::{any, get, post},
};

use crate::{AppState, handlers};

pub fn build_api_router(state: AppState) -> Router {
    Router::new()
        .route("/api/v2/health", get(handlers::health_check))
        .route("/api/v2/openapi.json", get(handlers::openapi_spec))
        .route("/api/v2/events", get(handlers::events_stream))
        .route("/api/v2/auth/login", post(handlers::login))
        .route("/api/v2/auth/me", get(handlers::me))
        .route("/api/v2/auth/logout", post(handlers::logout))
        .route(
            "/api/v2/auth/change-password",
            post(handlers::change_password),
        )
        .merge(handlers::enterprise_routes())
        .merge(handlers::platform_routes())
        .merge(handlers::rbac_routes())
        .merge(handlers::candidates_routes())
        .merge(handlers::tickets_routes())
        .merge(handlers::surveys_routes())
        .route("/api/v2/search", get(handlers::search))
        .route("/api/v2/stats", get(handlers::stats))
        .route("/api/v2/audit", get(handlers::list_audit_events))
        .route(
            "/api/v2/complaints",
            get(handlers::list_complaints).post(handlers::create_complaint),
        )
        .route(
            "/api/v2/complaints/bulk-delete",
            post(handlers::bulk_delete_complaints),
        )
        .route(
            "/api/v2/complaints/bulk-update",
            post(handlers::bulk_update_complaints),
        )
        .route(
            "/api/v2/complaints/{id}/timeline",
            get(handlers::complaint_timeline),
        )
        .route(
            "/api/v2/complaints/{id}/comments",
            post(handlers::add_complaint_comment),
        )
        .route(
            "/api/v2/complaints/{id}",
            get(handlers::get_complaint)
                .put(handlers::update_complaint)
                .delete(handlers::delete_complaint),
        )
        .route("/api/v2/development", get(handlers::development))
        .route(
            "/api/v2/development/goals",
            post(handlers::create_development_goal),
        )
        .route(
            "/api/v2/development/goals/{id}",
            axum::routing::put(handlers::update_development_goal)
                .delete(handlers::delete_development_goal),
        )
        .route(
            "/api/v2/development/goals/{id}/move",
            post(handlers::move_development_goal),
        )
        .route(
            "/api/v2/development/feedback",
            post(handlers::create_development_feedback),
        )
        .route(
            "/api/v2/development/feedback/{id}",
            axum::routing::put(handlers::update_development_feedback)
                .delete(handlers::delete_development_feedback),
        )
        .route(
            "/api/v2/development/feedback/{id}/move",
            post(handlers::move_development_feedback),
        )
        .route(
            "/api/v2/development/meetings",
            post(handlers::create_development_meeting),
        )
        .route(
            "/api/v2/development/meetings/{id}",
            axum::routing::put(handlers::update_development_meeting)
                .delete(handlers::delete_development_meeting),
        )
        .route(
            "/api/v2/development/meetings/{id}/move",
            post(handlers::move_development_meeting),
        )
        .route("/api/v2/onboarding", get(handlers::onboarding))
        .route("/api/v2/profile/me", get(handlers::profile_me))
        .route(
            "/api/v2/profile/{id}",
            get(handlers::profile_by_employee_id),
        )
        .route(
            "/api/v2/documents",
            get(handlers::list_documents).post(handlers::create_document),
        )
        .route(
            "/api/v2/documents/{id}/download",
            get(handlers::download_document),
        )
        .route(
            "/api/v2/documents/{id}",
            axum::routing::delete(handlers::delete_document),
        )
        .route(
            "/api/v2/reviews",
            get(handlers::list_reviews).post(handlers::create_review),
        )
        .route(
            "/api/v2/time-off-requests",
            get(handlers::list_time_off).post(handlers::create_time_off),
        )
        .route(
            "/api/v2/time-off-requests/{id}/{decision}",
            post(handlers::decide_time_off),
        )
        .route("/api/v2/organization/chart", get(handlers::org_chart))
        .route("/api/v2/notifications", get(handlers::list_notifications))
        .route(
            "/api/v2/notifications/{id}/read",
            post(handlers::mark_notification_read),
        )
        .route("/api/v2/admin/test-email", post(handlers::test_email))
        .route(
            "/api/v2/system/feature-flags",
            get(handlers::list_feature_flags),
        )
        .route(
            "/api/v2/system/feature-flags/{key}",
            get(handlers::check_feature_flag).put(handlers::update_feature_flag),
        )
        .route(
            "/api/v2/onboarding/tasks",
            post(handlers::create_onboarding_task),
        )
        .route(
            "/api/v2/onboarding/tasks/{id}",
            axum::routing::put(handlers::update_onboarding_task)
                .delete(handlers::delete_onboarding_task),
        )
        .route(
            "/api/v2/onboarding/tasks/{id}/move",
            post(handlers::move_onboarding_task),
        )
        .route(
            "/api/v2/employees",
            get(handlers::list_employees).post(handlers::create_employee),
        )
        .route(
            "/api/v2/employees/bulk-delete",
            post(handlers::bulk_delete_employees),
        )
        .route(
            "/api/v2/employees/bulk-update",
            post(handlers::bulk_update_employees),
        )
        .route(
            "/api/v2/employees/{id}",
            get(handlers::get_employee)
                .put(handlers::update_employee)
                .delete(handlers::delete_employee),
        )
        .route(
            "/api/v2/departments",
            get(handlers::list_departments).post(handlers::create_department),
        )
        .route(
            "/api/v2/departments/{id}",
            get(handlers::get_department)
                .put(handlers::update_department)
                .delete(handlers::delete_department),
        )
        .route(
            "/api/v2/positions",
            get(handlers::list_positions).post(handlers::create_position),
        )
        .route(
            "/api/v2/positions/{id}",
            get(handlers::get_position)
                .put(handlers::update_position)
                .delete(handlers::delete_position),
        )
        .route("/api", any(handlers::api_not_found))
        .route("/api/", any(handlers::api_not_found))
        .route("/api/{*path}", any(handlers::api_not_found))
        .route("/api/v2/", any(handlers::api_not_found))
        .route("/api/v2/{*path}", any(handlers::api_not_found))
        .method_not_allowed_fallback(handlers::api_method_not_allowed)
        .with_state(state)
}
