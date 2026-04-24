use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use std::fmt::{Display, Formatter};

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    MethodNotAllowed(String),
    UnsupportedMediaType(String),
    Internal(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl AppError {
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::BadRequest(message.into())
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Unauthorized(message.into())
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::Forbidden(message.into())
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    pub fn method_not_allowed(message: impl Into<String>) -> Self {
        Self::MethodNotAllowed(message.into())
    }

    pub fn unsupported_media_type(message: impl Into<String>) -> Self {
        Self::UnsupportedMediaType(message.into())
    }

    pub fn internal(message: impl Into<String>) -> Self {
        let message = message.into();
        sentry::capture_message(&message, sentry::Level::Error);
        Self::Internal(message)
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::BadRequest(message)
            | Self::Unauthorized(message)
            | Self::Forbidden(message)
            | Self::NotFound(message)
            | Self::MethodNotAllowed(message)
            | Self::UnsupportedMediaType(message)
            | Self::Internal(message) => f.write_str(message),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::Unauthorized(message) => (StatusCode::UNAUTHORIZED, message),
            Self::Forbidden(message) => (StatusCode::FORBIDDEN, message),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, message),
            Self::MethodNotAllowed(message) => (StatusCode::METHOD_NOT_ALLOWED, message),
            Self::UnsupportedMediaType(message) => (StatusCode::UNSUPPORTED_MEDIA_TYPE, message),
            Self::Internal(message) => {
                tracing::error!(error = %message, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Внутрішня помилка сервера".to_string(),
                )
            }
        };

        (status, Json(ErrorResponse { error: message })).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt;
    use serde_json::Value;

    async fn assert_error_response(
        error: AppError,
        expected_status: StatusCode,
        expected_message: &str,
    ) {
        let response = error.into_response();
        assert_eq!(response.status(), expected_status);

        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes();
        let body: Value = serde_json::from_slice(&bytes).expect("json body");

        assert_eq!(body["error"], expected_message);
    }

    #[tokio::test]
    async fn bad_request_maps_to_400_json_response() {
        assert_error_response(
            AppError::bad_request("Помилка валідації"),
            StatusCode::BAD_REQUEST,
            "Помилка валідації",
        )
        .await;
    }

    #[tokio::test]
    async fn unauthorized_maps_to_401_json_response() {
        assert_error_response(
            AppError::unauthorized("Потрібна авторизація"),
            StatusCode::UNAUTHORIZED,
            "Потрібна авторизація",
        )
        .await;
    }

    #[tokio::test]
    async fn forbidden_maps_to_403_json_response() {
        assert_error_response(
            AppError::forbidden("Немає доступу"),
            StatusCode::FORBIDDEN,
            "Немає доступу",
        )
        .await;
    }

    #[tokio::test]
    async fn not_found_maps_to_404_json_response() {
        assert_error_response(
            AppError::not_found("Запис не знайдено"),
            StatusCode::NOT_FOUND,
            "Запис не знайдено",
        )
        .await;
    }

    #[tokio::test]
    async fn method_not_allowed_maps_to_405_json_response() {
        assert_error_response(
            AppError::method_not_allowed("Метод не дозволено"),
            StatusCode::METHOD_NOT_ALLOWED,
            "Метод не дозволено",
        )
        .await;
    }

    #[tokio::test]
    async fn unsupported_media_type_maps_to_415_json_response() {
        assert_error_response(
            AppError::unsupported_media_type("Очікується JSON"),
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "Очікується JSON",
        )
        .await;
    }

    #[tokio::test]
    async fn internal_maps_to_sanitized_500_json_response() {
        assert_error_response(
            AppError::internal("raw database details"),
            StatusCode::INTERNAL_SERVER_ERROR,
            "Внутрішня помилка сервера",
        )
        .await;
    }
}
