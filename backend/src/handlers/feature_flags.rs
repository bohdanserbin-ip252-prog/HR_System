use crate::{
    AppState, auth,
    error::{AppError, AppResult},
    handlers::json_payload::{JsonPayload, parse_json_payload},
};
use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::Value;

#[path = "../feature_flags.rs"]
mod logic;
use logic::check_feature_enabled;

pub async fn list_feature_flags(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let flags = state
        .run_db(move |conn| {
            crate::db::list_feature_flags(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(serde_json::json!(flags)))
}

pub async fn update_feature_flag(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(key): Path<String>,
    payload: JsonPayload,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let enabled = payload
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let rollout_percentage = payload
        .get("rollout_percentage")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let allowed_roles = payload
        .get("allowed_roles")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    state
        .run_db(move |conn| {
            crate::db::update_feature_flag(
                conn,
                &key,
                enabled,
                rollout_percentage,
                allowed_roles.as_deref(),
            )
            .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    logic::get_cache().clear();

    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn check_feature_flag(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(key): Path<String>,
) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let enabled = check_feature_enabled(&state, &key, &user.role);
    Ok(Json(serde_json::json!({ "key": key, "enabled": enabled })))
}

#[cfg(test)]
mod tests {
    use super::logic::*;

    #[test]
    fn cache_clears_successfully() {
        let cache = get_cache();
        cache.clear();
        assert!(cache.get("anything").is_none());
    }
}
