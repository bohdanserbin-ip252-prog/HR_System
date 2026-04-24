use axum::http::{
    HeaderValue, Method,
    header::{ACCEPT, CONTENT_TYPE},
};
use tower_http::cors::{AllowOrigin, CorsLayer};

const CORS_ORIGIN_ENV: &str = "HR_SYSTEM_CORS_ORIGIN";

pub fn cors_layer_from_env() -> CorsLayer {
    let Some(origin) = std::env::var(CORS_ORIGIN_ENV)
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
    else {
        return CorsLayer::new();
    };

    let Ok(origin) = HeaderValue::from_str(&origin) else {
        return CorsLayer::new();
    };

    CorsLayer::new()
        .allow_origin(AllowOrigin::exact(origin))
        .allow_credentials(true)
        .allow_headers([ACCEPT, CONTENT_TYPE])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
}
