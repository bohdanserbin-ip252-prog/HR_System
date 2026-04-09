use anyhow::Result;
use hr_system_backend::{
    AppState, build_app, default_db_path, default_frontend_dist_dir, initialize_database,
};
use tokio::net::TcpListener;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("hr_system_backend=info,tower_http=info")),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(3000);

    let db_path = default_db_path();
    initialize_database(&db_path)?;

    let state = AppState::new(db_path, default_frontend_dist_dir());
    let app = build_app(state);
    let listener = TcpListener::bind(("0.0.0.0", port)).await?;

    println!("\n🏢 HR System running at http://localhost:{port}\n");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};

        if let Ok(mut stream) = signal(SignalKind::terminate()) {
            stream.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
