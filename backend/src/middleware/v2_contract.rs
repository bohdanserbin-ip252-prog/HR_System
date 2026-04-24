use axum::{
    body::{Body, to_bytes},
    http::{
        HeaderValue, Request, StatusCode, Uri,
        header::{CONTENT_LENGTH, CONTENT_TYPE},
    },
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::{Map, Value, json};

const MAX_JSON_BODY_BYTES: usize = 2 * 1024 * 1024;

pub async fn v2_contract_middleware(mut req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    if !path.starts_with("/api/v2/") {
        return next.run(req).await;
    }

    if let Some(normalized_uri) = normalize_query_uri(req.uri()) {
        *req.uri_mut() = normalized_uri;
    }

    let should_transform_request_body = req
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|content_type| content_type.contains("application/json"));

    if should_transform_request_body {
        let (parts, body) = req.into_parts();
        let body_bytes = match to_bytes(body, MAX_JSON_BODY_BYTES).await {
            Ok(bytes) => bytes,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    axum::Json(json!({ "error": "JSON payload is too large" })),
                )
                    .into_response();
            }
        };

        let transformed_body = if body_bytes.is_empty() {
            body_bytes.to_vec()
        } else if let Ok(value) = serde_json::from_slice::<Value>(&body_bytes) {
            serde_json::to_vec(&to_snake_case_keys(value)).unwrap_or_else(|_| body_bytes.to_vec())
        } else {
            body_bytes.to_vec()
        };

        let mut rebuilt = Request::from_parts(parts, Body::from(transformed_body.clone()));
        if let Ok(content_length) = HeaderValue::from_str(&transformed_body.len().to_string()) {
            rebuilt.headers_mut().insert(CONTENT_LENGTH, content_length);
        }
        req = rebuilt;
    }

    let response = next.run(req).await;
    transform_v2_response(path.as_str(), response).await
}

fn normalize_query_uri(uri: &Uri) -> Option<Uri> {
    let query = uri.query()?;
    if query.is_empty() {
        return None;
    }

    let normalized_pairs = query.split('&').map(|pair| {
        let mut parts = pair.splitn(2, '=');
        let raw_key = parts.next().unwrap_or_default();
        let value = parts.next();
        let normalized_key = camel_to_snake(raw_key);
        match value {
            Some(value) => format!("{normalized_key}={value}"),
            None => normalized_key,
        }
    });

    let mut uri_string = uri.path().to_string();
    uri_string.push('?');
    uri_string.push_str(&normalized_pairs.collect::<Vec<_>>().join("&"));
    uri_string.parse::<Uri>().ok()
}

async fn transform_v2_response(path: &str, response: Response) -> Response {
    if path.ends_with("/openapi.json") {
        return response;
    }

    let is_json = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|content_type| content_type.contains("application/json"));

    if !is_json {
        return response;
    }

    let status = response.status();
    let (mut parts, body) = response.into_parts();
    let body_bytes = match to_bytes(body, MAX_JSON_BODY_BYTES).await {
        Ok(bytes) => bytes,
        Err(_) => return Response::from_parts(parts, Body::empty()),
    };

    if body_bytes.is_empty() {
        return Response::from_parts(parts, Body::from(body_bytes));
    }

    let parsed = match serde_json::from_slice::<Value>(&body_bytes) {
        Ok(value) => value,
        Err(_) => return Response::from_parts(parts, Body::from(body_bytes)),
    };

    let transformed = if status.is_success() {
        wrap_success_response(to_camel_case_keys(parsed))
    } else {
        to_camel_case_keys(parsed)
    };

    let encoded = match serde_json::to_vec(&transformed) {
        Ok(bytes) => bytes,
        Err(_) => return Response::from_parts(parts, Body::from(body_bytes)),
    };

    if let Ok(content_length) = HeaderValue::from_str(&encoded.len().to_string()) {
        parts.headers.insert(CONTENT_LENGTH, content_length);
    }

    Response::from_parts(parts, Body::from(encoded))
}

fn wrap_success_response(value: Value) -> Value {
    if value
        .as_object()
        .is_some_and(|object| object.contains_key("data") && object.contains_key("meta"))
    {
        return value;
    }

    if let Some(object) = value.as_object() {
        let has_paginated_fields = object.contains_key("data")
            && object.contains_key("page")
            && object.contains_key("perPage");

        if has_paginated_fields {
            let mut meta = Map::new();
            if let Some(page) = object.get("page") {
                meta.insert("page".to_string(), page.clone());
            }
            if let Some(per_page) = object.get("perPage") {
                meta.insert("perPage".to_string(), per_page.clone());
            }
            if let Some(total) = object.get("total") {
                meta.insert("total".to_string(), total.clone());
            }
            return json!({
                "data": object.get("data").cloned().unwrap_or(Value::Null),
                "meta": Value::Object(meta)
            });
        }
    }

    let mut meta = Map::new();
    if let Some(items) = value.as_array() {
        meta.insert("count".to_string(), json!(items.len()));
    }

    json!({
        "data": value,
        "meta": Value::Object(meta)
    })
}

fn to_camel_case_keys(value: Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut next = Map::new();
            for (key, value) in object {
                next.insert(snake_to_camel(&key), to_camel_case_keys(value));
            }
            Value::Object(next)
        }
        Value::Array(items) => Value::Array(items.into_iter().map(to_camel_case_keys).collect()),
        _ => value,
    }
}

fn to_snake_case_keys(value: Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut next = Map::new();
            for (key, value) in object {
                next.insert(camel_to_snake(&key), to_snake_case_keys(value));
            }
            Value::Object(next)
        }
        Value::Array(items) => Value::Array(items.into_iter().map(to_snake_case_keys).collect()),
        _ => value,
    }
}

fn snake_to_camel(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut uppercase_next = false;

    for ch in input.chars() {
        if ch == '_' || ch == '-' {
            uppercase_next = true;
            continue;
        }
        if uppercase_next {
            output.extend(ch.to_uppercase());
            uppercase_next = false;
        } else {
            output.push(ch);
        }
    }

    output
}

fn camel_to_snake(input: &str) -> String {
    let mut output = String::with_capacity(input.len() + 4);
    for (index, ch) in input.chars().enumerate() {
        if ch.is_ascii_uppercase() {
            if index > 0 {
                output.push('_');
            }
            output.push(ch.to_ascii_lowercase());
        } else if ch == '-' {
            output.push('_');
        } else {
            output.push(ch);
        }
    }
    output
}

#[cfg(test)]
#[path = "v2_contract_tests.rs"]
mod tests;
