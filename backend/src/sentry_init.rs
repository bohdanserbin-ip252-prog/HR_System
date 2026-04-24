pub fn init_sentry() -> Option<sentry::ClientInitGuard> {
    let dsn = std::env::var("SENTRY_DSN").ok()?;
    if dsn.is_empty() {
        return None;
    }
    let guard = sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    ));
    Some(guard)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, MutexGuard};

    static SENTRY_TEST_LOCK: Mutex<()> = Mutex::new(());

    fn lock() -> MutexGuard<'static, ()> {
        SENTRY_TEST_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    #[test]
    fn init_sentry_returns_none_without_dsn() {
        let _guard = lock();
        unsafe { std::env::remove_var("SENTRY_DSN") };
        let sentry_guard = init_sentry();
        assert!(sentry_guard.is_none());
    }

    #[test]
    fn init_sentry_returns_some_with_valid_dsn() {
        let _guard = lock();
        unsafe {
            std::env::set_var("SENTRY_DSN", "https://public@sentry.example.com/1");
        }
        let sentry_guard = init_sentry();
        assert!(sentry_guard.is_some());
        unsafe { std::env::remove_var("SENTRY_DSN") };
    }
}
