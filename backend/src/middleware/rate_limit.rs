use super::service_utils::{box_response_future, impl_boxed_http_service};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::body::Body;
use http::{Response, StatusCode};
use tower::Layer;

const LOGIN_PATH: &str = "/api/v2/auth/login";
const RATE_LIMIT_DISABLED_ENV: &str = "HR_SYSTEM_RATE_LIMIT_DISABLED";

fn rate_limit_disabled() -> bool {
    std::env::var(RATE_LIMIT_DISABLED_ENV)
        .ok()
        .is_some_and(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
}

/// Tower layer that rate-limits `POST /api/auth/login` by source IP.
#[derive(Clone, Debug)]
pub struct RateLimitLayer {
    max_requests: usize,
    window: Duration,
}

impl RateLimitLayer {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            max_requests,
            window,
        }
    }
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitService {
            inner,
            state: Arc::new(Mutex::new(HashMap::new())),
            max_requests: self.max_requests,
            window: self.window,
        }
    }
}

/// Tower service that enforces per-IP rate limits.
#[derive(Clone, Debug)]
pub struct RateLimitService<S> {
    inner: S,
    state: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl_boxed_http_service!(RateLimitService, |service, req| {
    let is_login = req.method() == http::Method::POST && req.uri().path() == LOGIN_PATH;

    if !is_login || rate_limit_disabled() {
        return box_response_future(service.inner.call(req));
    }

    let ip = req
        .extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
        .map(|ci| ci.0.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let mut map = service.state.lock().unwrap();
    let now = Instant::now();
    let entries = map.entry(ip.clone()).or_default();

    // Clean old entries to prevent unbounded growth.
    entries.retain(|&t| now.duration_since(t) < service.window);

    if entries.len() >= service.max_requests {
        let retry_after = entries.first().map_or(service.window.as_secs(), |oldest| {
            service
                .window
                .as_secs()
                .saturating_sub(now.duration_since(*oldest).as_secs())
        });

        let response = Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Retry-After", retry_after.to_string())
            .body(Body::empty())
            .unwrap();

        return box_response_future(async move { Ok(response) });
    }

    entries.push(now);
    drop(map);

    box_response_future(service.inner.call(req))
});
