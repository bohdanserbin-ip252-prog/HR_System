use super::crud_route_support::*;

pub fn candidates_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v2/candidates",
            get(list_candidates).post(create_candidate),
        )
        .route("/api/v2/candidates/{id}/stage", post(update_stage))
        .route(
            "/api/v2/candidates/{id}",
            axum::routing::delete(delete_candidate),
        )
}

async fn list_candidates(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    crud_helpers::list_entities_value(&state, &jar, AccessRequirement::Authenticated, |conn| {
        db::candidates::list_candidates(conn).map_err(|err| AppError::internal(err.to_string()))
    })
    .await
}

async fn create_candidate(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<db::candidates::CandidatePayload>,
) -> AppResult<(axum::http::StatusCode, Json<Value>)> {
    crud_helpers::create_entity_value(
        &state,
        &jar,
        AccessRequirement::Admin,
        payload,
        |conn, payload| {
            db::candidates::create_candidate(conn, payload)
                .map_err(|err| AppError::internal(err.to_string()))
        },
    )
    .await
}

async fn update_stage(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
    Json(payload): Json<db::candidates::UpdateStagePayload>,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    let ok = state
        .run_db(move |conn| {
            db::candidates::update_candidate_stage(conn, id, &payload.stage)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    if !ok {
        return Err(AppError::bad_request("Невалідна стадія"));
    }
    Ok(Json(json!({ "success": true })))
}

async fn delete_candidate(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    crud_helpers::delete_entity(&state, &jar, AccessRequirement::Admin, move |conn| {
        db::candidates::delete_candidate(conn, id)
            .map_err(|err| AppError::internal(err.to_string()))
            .map(|_| ())
    })
    .await
}
