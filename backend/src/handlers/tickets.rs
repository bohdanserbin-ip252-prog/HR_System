use super::crud_route_support::*;

pub fn tickets_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v2/tickets", get(list_tickets).post(create_ticket))
        .route("/api/v2/tickets/{id}/status", post(update_status))
        .route("/api/v2/tickets/{id}", axum::routing::delete(delete_ticket))
}

async fn list_tickets(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<Value>> {
    crud_helpers::list_entities_value(&state, &jar, AccessRequirement::Authenticated, |conn| {
        db::tickets::list_tickets(conn).map_err(|err| AppError::internal(err.to_string()))
    })
    .await
}

async fn create_ticket(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<db::tickets::TicketPayload>,
) -> AppResult<(axum::http::StatusCode, Json<Value>)> {
    crud_helpers::create_entity_value(
        &state,
        &jar,
        AccessRequirement::Authenticated,
        payload,
        |conn, payload| {
            db::tickets::create_ticket(conn, payload)
                .map_err(|err| AppError::internal(err.to_string()))
        },
    )
    .await
}

async fn update_status(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
    Json(payload): Json<db::tickets::UpdateTicketStatusPayload>,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let ok = state
        .run_db(move |conn| {
            db::tickets::update_ticket_status(conn, id, &payload.status)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    if !ok {
        return Err(AppError::bad_request("Невалідний статус"));
    }
    Ok(Json(json!({ "success": true })))
}

async fn delete_ticket(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    crud_helpers::delete_entity(&state, &jar, AccessRequirement::Admin, move |conn| {
        db::tickets::delete_ticket(conn, id)
            .map_err(|err| AppError::internal(err.to_string()))
            .map(|_| ())
    })
    .await
}
