use crate::{
    AppState,
    auth::{self, build_logout_cookie, build_session_cookie},
    db,
    error::{AppError, AppResult},
    models::{LoginPayload, LoginResponse, SuccessResponse},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;

use super::json_payload::{JsonPayload, parse_json_payload};

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(CookieJar, Json<LoginResponse>)> {
    let payload = parse_json_payload(payload)?;
    let login = LoginPayload::from_json(&payload);
    let username = login.username;
    let password = login.password;
    let user = state
        .run_db(move |conn| {
            db::authenticate_user(conn, &username, &password)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match user {
        Some(user) => {
            let user_id = user.id;
            let token = state
                .run_db(move |conn| {
                    db::create_session(conn, user_id)
                        .map_err(|err| AppError::internal(err.to_string()))
                })
                .await?;
            let cookie = build_session_cookie(token);
            Ok((
                jar.add(cookie),
                Json(LoginResponse {
                    success: true,
                    user,
                }),
            ))
        }
        None => Err(AppError::unauthorized("Невірний логін або пароль")),
    }
}

pub async fn me(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<crate::models::User>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    Ok(Json(user))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<SuccessResponse>)> {
    if let Some(token) = auth::session_token_from_jar(&jar) {
        state
            .run_db(move |conn| {
                db::delete_session(conn, &token)
                    .map(|_| ())
                    .map_err(|err| AppError::internal(err.to_string()))
            })
            .await?;
    }

    Ok((
        jar.add(build_logout_cookie()),
        Json(SuccessResponse { success: true }),
    ))
}

pub async fn change_password(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<Json<SuccessResponse>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let old_password = payload["old_password"].as_str().unwrap_or("").to_string();
    let new_password = payload["new_password"].as_str().unwrap_or("").to_string();

    if new_password.len() < 6 {
        return Err(AppError::bad_request("Пароль має бути не менше 6 символів"));
    }

    let username = user.username.clone();
    let user_id = user.id;
    state
        .run_db(move |conn| {
            let authenticated = db::authenticate_user(conn, &username, &old_password)
                .map_err(|err| AppError::internal(err.to_string()))?;
            if authenticated.is_none() {
                return Err(AppError::unauthorized("Невірний поточний пароль"));
            }
            let new_hash = db::hash_password(&new_password)
                .map_err(|err| AppError::internal(err.to_string()))?;
            conn.execute(
                "UPDATE users SET password = ? WHERE id = ?",
                rusqlite::params![new_hash, user_id],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            Ok(SuccessResponse { success: true })
        })
        .await?;

    Ok(Json(SuccessResponse { success: true }))
}
