use crate::{
    AppState, auth, db,
    error::{AppError, AppResult},
    models::{DevelopmentResponse, OnboardingResponse, StatsResponse},
};
use axum::{Json, extract::State};
use axum_extra::extract::cookie::CookieJar;

pub async fn stats(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<StatsResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let stats = state
        .run_db(|conn| db::fetch_stats(conn).map_err(|err| AppError::internal(err.to_string())))
        .await?;
    Ok(Json(stats))
}

pub async fn development(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<DevelopmentResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let response = state
        .run_db(|conn| {
            db::fetch_development(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(response))
}

pub async fn onboarding(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<OnboardingResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let response = state
        .run_db(|conn| {
            db::fetch_onboarding(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(response))
}
