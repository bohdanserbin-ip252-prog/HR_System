pub(crate) type BoxResponseFuture<Response, Error> =
    std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, Error>> + Send>>;

pub(crate) fn box_response_future<F, Response, Error>(
    future: F,
) -> BoxResponseFuture<Response, Error>
where
    F: std::future::Future<Output = Result<Response, Error>> + Send + 'static,
{
    Box::pin(future)
}

macro_rules! impl_boxed_http_service {
    ($service:ident, |$this:ident, $req:ident| $body:block) => {
        impl<S> tower::Service<http::Request<axum::body::Body>> for $service<S>
        where
            S: tower::Service<
                    http::Request<axum::body::Body>,
                    Response = http::Response<axum::body::Body>,
                > + Clone
                + Send
                + 'static,
            S::Future: Send + 'static,
        {
            type Response = S::Response;
            type Error = S::Error;
            type Future =
                crate::middleware::service_utils::BoxResponseFuture<Self::Response, Self::Error>;

            fn poll_ready(
                &mut self,
                cx: &mut std::task::Context<'_>,
            ) -> std::task::Poll<Result<(), Self::Error>> {
                self.inner.poll_ready(cx)
            }

            fn call(&mut self, $req: http::Request<axum::body::Body>) -> Self::Future {
                let $this = self;
                $body
            }
        }
    };
}

pub(crate) use impl_boxed_http_service;
