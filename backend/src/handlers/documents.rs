use super::payload_route_support::*;

const MAX_DOCUMENT_BYTES: usize = 5 * 1024 * 1024;

fn validate_mime(mime: &str) -> bool {
    matches!(
        mime,
        "application/pdf" | "image/png" | "image/jpeg" | "text/plain"
    )
}

pub async fn create_document(
    State(state): State<AppState>,
    jar: CookieJar,
    payload: JsonPayload,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth::require_admin(&state, &jar).await?;
    let payload = parse_json_payload(payload)?;
    let title = normalize_required_string(&payload, "title");
    let document_type = normalize_required_string(&payload, "document_type");
    let filename = normalize_required_string(&payload, "filename");
    let mime_type = normalize_required_string(&payload, "mime_type");
    let employee_id = normalize_optional_i64(&payload, "employee_id")?;
    let complaint_id = normalize_optional_i64(&payload, "complaint_id")?;
    let expires_at = normalize_optional_string(&payload, "expires_at");
    let content = payload["content_base64"].as_str().unwrap_or_default();
    if title.is_empty() || filename.is_empty() || !validate_mime(&mime_type) {
        return Err(AppError::bad_request("Некоректні дані документа"));
    }
    if !is_valid_date(expires_at.as_deref()) {
        return Err(AppError::bad_request(
            "Дата документа має бути у форматі YYYY-MM-DD",
        ));
    }
    let bytes = content.as_bytes().to_vec();
    if bytes.is_empty() || bytes.len() > MAX_DOCUMENT_BYTES {
        return Err(AppError::bad_request("Розмір документа має бути до 5 MB"));
    }

    let doc = state
        .run_db(move |conn| {
            conn.execute(
                "
            INSERT INTO employee_documents
            (employee_id, complaint_id, title, document_type, filename, mime_type,
             content_blob, expires_at, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ",
                rusqlite::params![
                    employee_id,
                    complaint_id,
                    title,
                    document_type,
                    filename,
                    mime_type,
                    bytes,
                    expires_at,
                    user.id
                ],
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            let id = conn.last_insert_rowid();
            db::record_audit_event(
                conn,
                db::AuditEventInput {
                    actor_user_id: Some(user.id),
                    actor_username: Some(&user.username),
                    action: "document.created",
                    entity_type: "document",
                    entity_id: Some(id),
                    entity_name: Some(&title),
                    details: Some("Документ завантажено"),
                },
            )
            .map_err(|err| AppError::internal(err.to_string()))?;
            Ok(json!({ "id": id, "title": title, "filename": filename, "mimeType": mime_type }))
        })
        .await?;
    Ok((StatusCode::CREATED, Json(doc)))
}

pub async fn list_documents(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let docs = state.run_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, employee_id, complaint_id, title, document_type, filename, mime_type, expires_at, created_at FROM employee_documents ORDER BY id DESC"
        ).map_err(|err| AppError::internal(err.to_string()))?;
        let rows = stmt.query_map([], |row| Ok(json!({
            "id": row.get::<_, i64>(0)?, "employeeId": row.get::<_, Option<i64>>(1)?,
            "complaintId": row.get::<_, Option<i64>>(2)?, "title": row.get::<_, String>(3)?,
            "documentType": row.get::<_, String>(4)?, "filename": row.get::<_, String>(5)?,
            "mimeType": row.get::<_, String>(6)?, "expiresAt": row.get::<_, Option<String>>(7)?,
            "createdAt": row.get::<_, String>(8)?
        }))).map_err(|err| AppError::internal(err.to_string()))?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|err| AppError::internal(err.to_string()))
    }).await?;
    Ok(Json(json!(docs)))
}

pub async fn delete_document(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<Value>> {
    auth::require_admin(&state, &jar).await?;
    state
        .run_db(move |conn| {
            conn.execute("DELETE FROM employee_documents WHERE id = ?", [id])
                .map(|_| ())
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(json!({ "success": true })))
}

pub async fn download_document(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<Value>> {
    auth::require_authenticated(&state, &jar).await?;
    let doc = state
        .run_db(move |conn| {
            conn.query_row(
            "SELECT title, filename, mime_type, content_blob FROM employee_documents WHERE id=?",
            [id],
            |row| {
                let bytes: Vec<u8> = row.get(3)?;
                Ok(json!({
                    "title": row.get::<_, String>(0)?,
                    "filename": row.get::<_, String>(1)?,
                    "mimeType": row.get::<_, String>(2)?,
                    "contentBase64": String::from_utf8_lossy(&bytes)
                }))
            },
        )
        .map_err(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Документ не знайдено"),
            other => AppError::internal(other.to_string()),
        })
        })
        .await?;
    Ok(Json(doc))
}
