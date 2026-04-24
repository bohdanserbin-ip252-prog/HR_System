use super::crud_route_support::*;

pub fn surveys_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v2/surveys", get(list_surveys).post(create_survey))
        .route("/api/v2/surveys/{id}/vote", post(vote_survey))
        .route("/api/v2/surveys/{id}/toggle", post(toggle_survey))
        .route("/api/v2/surveys/{id}", axum::routing::delete(delete_survey))
}

async fn list_surveys(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    crud_helpers::list_entities_value(&state, &jar, AccessRequirement::Authenticated, |conn| {
        db::surveys::list_surveys(conn).map_err(|err| AppError::internal(err.to_string()))
    })
    .await
}

async fn create_survey(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<db::surveys::SurveyPayload>,
) -> AppResult<(axum::http::StatusCode, Json<Value>)> {
    crud_helpers::create_entity_value(
        &state,
        &jar,
        AccessRequirement::Admin,
        payload,
        |conn, payload| {
            db::surveys::create_survey(conn, payload)
                .map_err(|err| AppError::internal(err.to_string()))
        },
    )
    .await
}

async fn vote_survey(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
    Json(payload): Json<db::surveys::SurveyVotePayload>,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let ok = state
        .run_db(move |conn| {
            db::surveys::vote_survey(conn, id, &payload)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    if !ok {
        return Err(AppError::bad_request("Невалідний варіант відповіді"));
    }
    Ok(Json(json!({ "success": true })))
}

async fn toggle_survey(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let items = state
        .run_db(move |conn| {
            db::surveys::list_surveys(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    let survey = items
        .into_iter()
        .find(|s| s.id == id)
        .ok_or_else(|| AppError::not_found("Опитування не знайдено"))?;
    let ok = state
        .run_db(move |conn| {
            db::surveys::toggle_survey(conn, id, !survey.active)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    if !ok {
        return Err(AppError::internal("Не вдалося оновити статус"));
    }
    Ok(Json(json!({ "success": true, "active": !survey.active })))
}

async fn delete_survey(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    crud_helpers::delete_entity(&state, &jar, AccessRequirement::Admin, move |conn| {
        db::surveys::delete_survey(conn, id)
            .map_err(|err| AppError::internal(err.to_string()))
            .map(|_| ())
    })
    .await
}
