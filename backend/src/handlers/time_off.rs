use super::payload_route_support::*;
use super::notifications_email;

pub async fn create_time_off(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_authenticated(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let employee_id = normalize_optional_i64(&payload, "employee_id")?
        .or(user.employee_id)
        .ok_or_else(|| AppError::bad_request("Працівник обов'язковий"))?;
    if user.role != "admin" && Some(employee_id) != user.employee_id {
        return Err(AppError::forbidden("Недостатньо прав для виконання дії"));
    }
    let start_date = normalize_required_string(&payload, "start_date");
    let end_date = normalize_required_string(&payload, "end_date");
    let request_type = normalize_required_string(&payload, "request_type");
    let reason = normalize_optional_string(&payload, "reason");
    if request_type.is_empty()
        || !is_valid_date(Some(&start_date))
        || !is_valid_date(Some(&end_date))
    {
        return Err(AppError::bad_request("Некоректні дані заявки"));
    }
    let employee_id_for_email = employee_id;
    let request_type_for_email = request_type.clone();
    let item = state.run_db(move |conn| {
        conn.execute(
            "INSERT INTO time_off_requests (employee_id, start_date, end_date, request_type, reason) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![employee_id, start_date, end_date, request_type, reason],
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let id = conn.last_insert_rowid();
        db::record_audit_event(conn, db::AuditEventInput {
            actor_user_id: Some(user.id),
            actor_username: Some(&user.username),
            action: "time_off.created",
            entity_type: "time_off",
            entity_id: Some(id),
            entity_name: Some(&request_type),
            details: Some("Заявку на відсутність створено"),
        }).map_err(|err| AppError::internal(err.to_string()))?;
        Ok(json!({ "id": id, "employeeId": employee_id, "startDate": start_date, "endDate": end_date, "requestType": request_type, "reason": reason, "status": "pending" }))
    }).await?;

    notifications_email::send_time_off_created_email(
        &state,
        employee_id_for_email,
        &request_type_for_email,
    )
    .await;

    Ok((StatusCode::CREATED, Json(item)))
}

pub async fn list_time_off(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let rows = state.run_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, employee_id, start_date, end_date, request_type, reason, status, created_at FROM time_off_requests ORDER BY id DESC"
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let rows = stmt.query_map([], |row| Ok(json!({
            "id": row.get::<_, i64>(0)?, "employeeId": row.get::<_, i64>(1)?,
            "startDate": row.get::<_, String>(2)?, "endDate": row.get::<_, String>(3)?,
            "requestType": row.get::<_, String>(4)?, "reason": row.get::<_, Option<String>>(5)?,
            "status": row.get::<_, String>(6)?, "createdAt": row.get::<_, String>(7)?
        }))).map_err(|err| AppError::internal(err.to_string()))?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|err| AppError::internal(err.to_string()))
    }).await?;
    Ok(Json(json!(rows)))
}

pub async fn decide_time_off(
    State(state): State<AppState>,
    jar: CookieJar,
    Path((id, decision)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    let user = auth::require_admin(&state, &jar).await?;
    if !matches!(decision.as_str(), "approve" | "reject" | "cancel") {
        return Err(AppError::bad_request("Некоректне рішення"));
    }
    let status = match decision.as_str() {
        "approve" => "approved",
        "reject" => "rejected",
        _ => "cancelled",
    };
    state.run_db(move |conn| conn.execute(
        "UPDATE time_off_requests SET status=?, decided_by=?, decided_at=datetime('now'), updated_at=datetime('now') WHERE id=?",
        rusqlite::params![status, user.id, id],
    ).map(|_| ()).map_err(|err| AppError::internal(err.to_string()))).await?;
    Ok(Json(json!({ "success": true, "status": status })))
}
