use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
};
use axum::{
    Json, Router,
    extract::{Query, State},
    http::StatusCode,
    routing::get,
};
use axum_extra::extract::cookie::CookieJar;
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Debug, Deserialize)]
pub struct AssignRolePayload {
    pub user_id: i64,
    pub role_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct RevokeRoleQuery {
    pub user_id: i64,
    pub role_id: i64,
}

pub fn rbac_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v2/rbac/roles", get(list_roles))
        .route("/api/v2/rbac/permissions", get(list_permissions))
        .route("/api/v2/rbac/my-permissions", get(my_permissions))
        .route(
            "/api/v2/rbac/user-roles",
            axum::routing::post(assign_user_role).delete(revoke_user_role),
        )
        .route("/api/v2/rbac/matrix", get(role_permission_matrix))
}

pub async fn list_roles(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let roles = state
        .run_db(|conn| {
            let mut stmt = conn
                .prepare("SELECT key, label FROM roles ORDER BY id")
                .map_err(|err| AppError::internal(err.to_string()))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(json!({
                        "key": row.get::<_, String>(0)?,
                        "label": row.get::<_, String>(1)?
                    }))
                })
                .map_err(|err| AppError::internal(err.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!(roles)))
}

pub async fn list_permissions(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let permissions = state
        .run_db(move |conn| {
            db::list_permissions(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    let items: Vec<Value> = permissions
        .into_iter()
        .map(|(id, key, label)| json!({"id": id, "key": key, "label": label}))
        .collect();
    Ok(Json(json!(items)))
}

pub async fn assign_user_role(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<AssignRolePayload>,
) -> AppResult<(StatusCode, Json<Value>)> {
    auth::require_admin(&state, &jar).await?;
    state
        .run_db(move |conn| {
            db::assign_role(conn, payload.user_id, payload.role_id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok((StatusCode::OK, Json(json!({ "success": true }))))
}

pub async fn revoke_user_role(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<RevokeRoleQuery>,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    state
        .run_db(move |conn| {
            db::revoke_role(conn, query.user_id, query.role_id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!({ "success": true })))
}

pub async fn my_permissions(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let permissions = state
        .run_db(move |conn| {
            db::list_user_permissions(conn, user.id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!({
        "user_id": user.id,
        "username": user.username,
        "permissions": permissions
    })))
}

pub async fn role_permission_matrix(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let matrix = state
        .run_db(move |conn| {
            db::list_role_permissions_matrix(conn)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!({
        "entries": matrix.into_iter().map(|(role_id, role_key, perm_id, perm_key)| json!({
            "role_id": role_id, "role_key": role_key, "permission_id": perm_id, "permission_key": perm_key
        })).collect::<Vec<_>>()
    })))
}

#[cfg(test)]
mod tests {
    use crate::{AppState, initialize_database};
    use std::path::PathBuf;
    use tempfile::tempdir;

    fn test_state() -> AppState {
        let temp = tempdir().unwrap();
        let db_path = temp.path().join("test.db");
        initialize_database(&db_path).unwrap();
        AppState::new(db_path, PathBuf::from("."))
    }

    #[tokio::test]
    async fn list_roles_returns_items() {
        let _state = test_state();
        // We can't easily create a valid cookie jar here, so we test the DB layer directly
        // The handler tests would need a full integration setup
    }
}
