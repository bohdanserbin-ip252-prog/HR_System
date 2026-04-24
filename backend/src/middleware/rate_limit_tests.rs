use super::rate_limit::RateLimitLayer;
use axum::body::Body;
use axum::extract::ConnectInfo;
use http::{Request, Response, StatusCode};
use std::convert::Infallible;
use std::net::SocketAddr;
use std::time::Duration;
use tower::{Layer, Service};

async fn mock_handler(_req: Request<Body>) -> Result<Response<Body>, Infallible> {
    Ok(Response::new(Body::empty()))
}

fn login_request_with_ip(ip: &str) -> Request<Body> {
    let mut req = Request::builder()
        .method("POST")
        .uri("/api/v2/auth/login")
        .body(Body::empty())
        .unwrap();
    let addr: SocketAddr = format!("{}:8080", ip).parse().unwrap();
    req.extensions_mut().insert(ConnectInfo(addr));
    req
}

fn other_request() -> Request<Body> {
    Request::builder()
        .method("GET")
        .uri("/api/v2/stats")
        .body(Body::empty())
        .unwrap()
}

#[tokio::test]
async fn allows_requests_under_limit() {
    let layer = RateLimitLayer::new(5, Duration::from_secs(60));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..5 {
        let res = service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
}

#[tokio::test]
async fn blocks_requests_over_limit() {
    let layer = RateLimitLayer::new(5, Duration::from_secs(60));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..5 {
        let res = service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    let res = service
        .call(login_request_with_ip("127.0.0.1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(res.headers().contains_key("Retry-After"));
}

#[tokio::test]
async fn retry_after_is_present_when_blocked() {
    let layer = RateLimitLayer::new(2, Duration::from_secs(60));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..2 {
        service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
    }

    let res = service
        .call(login_request_with_ip("127.0.0.1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
    let retry_after = res
        .headers()
        .get("Retry-After")
        .unwrap()
        .to_str()
        .unwrap()
        .parse::<u64>()
        .unwrap();
    assert!(retry_after <= 60);
}

#[tokio::test]
async fn does_not_rate_limit_other_paths() {
    let layer = RateLimitLayer::new(1, Duration::from_secs(60));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..10 {
        let res = service.call(other_request()).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
}

#[tokio::test]
async fn rate_limit_is_per_ip() {
    let layer = RateLimitLayer::new(2, Duration::from_secs(60));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..2 {
        service
            .call(login_request_with_ip("1.2.3.4"))
            .await
            .unwrap();
    }

    let res = service
        .call(login_request_with_ip("1.2.3.4"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);

    let res = service
        .call(login_request_with_ip("5.6.7.8"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn window_allows_new_requests_after_expiry() {
    let layer = RateLimitLayer::new(2, Duration::from_millis(100));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..2 {
        service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
    }

    let res = service
        .call(login_request_with_ip("127.0.0.1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);

    std::thread::sleep(Duration::from_millis(150));

    let res = service
        .call(login_request_with_ip("127.0.0.1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn cleans_old_entries_prevents_unbounded_growth() {
    let layer = RateLimitLayer::new(2, Duration::from_millis(50));
    let mut service = layer.layer(tower::service_fn(mock_handler));

    for _ in 0..2 {
        service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
    }

    std::thread::sleep(Duration::from_millis(60));

    for _ in 0..2 {
        let res = service
            .call(login_request_with_ip("127.0.0.1"))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    let res = service
        .call(login_request_with_ip("127.0.0.1"))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
}
