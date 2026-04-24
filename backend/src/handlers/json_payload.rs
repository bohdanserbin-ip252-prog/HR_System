use crate::{
    error::{AppError, AppResult},
    models::SuccessResponse,
};
use axum::{Json, extract::rejection::JsonRejection, http::StatusCode};
use serde_json::Value;

pub type JsonPayload = Result<Json<Value>, JsonRejection>;

pub fn parse_json_payload(payload: JsonPayload) -> AppResult<Value> {
    match payload {
        Ok(Json(value)) => Ok(value),
        Err(rejection) if rejection.status() == StatusCode::UNSUPPORTED_MEDIA_TYPE => Err(
            AppError::unsupported_media_type("Очікується запит із Content-Type application/json"),
        ),
        Err(_) => Err(AppError::bad_request("Некоректний JSON у запиті")),
    }
}

pub async fn api_not_found() -> AppResult<Json<SuccessResponse>> {
    Err(AppError::not_found("API маршрут не знайдено"))
}

pub async fn api_method_not_allowed() -> AppResult<Json<SuccessResponse>> {
    Err(AppError::method_not_allowed(
        "Метод не дозволено для цього API маршруту",
    ))
}
