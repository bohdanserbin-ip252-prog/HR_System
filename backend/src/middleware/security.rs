use super::service_utils::{box_response_future, impl_boxed_http_service};

use tower::Layer;

#[derive(Clone, Debug)]
pub struct SecurityHeadersLayer;

impl SecurityHeadersLayer {
    pub fn new() -> Self {
        Self
    }
}

impl Default for SecurityHeadersLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl<S> Layer<S> for SecurityHeadersLayer {
    type Service = SecurityHeadersService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        SecurityHeadersService { inner }
    }
}

#[derive(Clone, Debug)]
pub struct SecurityHeadersService<S> {
    inner: S,
}

impl_boxed_http_service!(SecurityHeadersService, |service, req| {
    let future = service.inner.call(req);
    box_response_future(async move {
        let mut response = future.await?;
        let headers = response.headers_mut();
        headers.insert(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' unpkg.com; style-src 'self' 'unsafe-inline' unpkg.com; img-src 'self' data:; font-src 'self'; connect-src 'self'"
                .parse()
                .unwrap(),
        );
        headers.insert("X-Frame-Options", "DENY".parse().unwrap());
        headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());
        headers.insert(
            "Referrer-Policy",
            "strict-origin-when-cross-origin".parse().unwrap(),
        );
        headers.insert(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()".parse().unwrap(),
        );
        Ok(response)
    })
});

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http::{Request, Response, StatusCode};
    use std::convert::Infallible;
    use tower::{Layer, Service};

    async fn mock_handler(_req: Request<Body>) -> Result<Response<Body>, Infallible> {
        Ok(Response::new(Body::empty()))
    }

    #[tokio::test]
    async fn adds_security_headers() {
        let layer = SecurityHeadersLayer::new();
        let mut service = layer.layer(tower::service_fn(mock_handler));

        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let res = service.call(req).await.unwrap();

        assert_eq!(res.status(), StatusCode::OK);
        assert!(
            res.headers().contains_key("content-security-policy"),
            "CSP header missing"
        );
        assert!(
            res.headers().contains_key("x-frame-options"),
            "X-Frame-Options header missing"
        );
        assert!(
            res.headers().contains_key("x-content-type-options"),
            "X-Content-Type-Options header missing"
        );
        assert!(
            res.headers().contains_key("referrer-policy"),
            "Referrer-Policy header missing"
        );
        assert!(
            res.headers().contains_key("permissions-policy"),
            "Permissions-Policy header missing"
        );
    }

    #[tokio::test]
    async fn csp_value_is_correct() {
        let layer = SecurityHeadersLayer::new();
        let mut service = layer.layer(tower::service_fn(mock_handler));

        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let res = service.call(req).await.unwrap();

        let csp = res
            .headers()
            .get("content-security-policy")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(csp.contains("default-src 'self'"));
        assert!(csp.contains("script-src 'self' 'unsafe-inline' unpkg.com"));
        assert!(csp.contains("connect-src 'self'"));
    }

    #[tokio::test]
    async fn x_frame_options_is_deny() {
        let layer = SecurityHeadersLayer::new();
        let mut service = layer.layer(tower::service_fn(mock_handler));

        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let res = service.call(req).await.unwrap();

        let value = res
            .headers()
            .get("x-frame-options")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(value, "DENY");
    }
}
