use crate::{AppError, AppResult, AppState, db, models::User};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};

pub const SESSION_COOKIE_NAME: &str = "hr_system_session";
pub const COOKIE_SECURE_ENV: &str = "HR_SYSTEM_COOKIE_SECURE";
pub const COOKIE_SAMESITE_ENV: &str = "HR_SYSTEM_COOKIE_SAMESITE";

pub async fn require_authenticated(state: &AppState, jar: &CookieJar) -> AppResult<User> {
    let token = session_token_from_jar(jar)
        .ok_or_else(|| AppError::unauthorized("Необхідно увійти в систему"))?;

    let user = state
        .run_db(move |conn| {
            db::find_user_by_session_token(conn, &token)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    user.ok_or_else(|| AppError::unauthorized("Сесію не знайдено або термін дії минув"))
}

pub async fn require_admin(state: &AppState, jar: &CookieJar) -> AppResult<User> {
    let user = require_authenticated(state, jar).await?;
    if user.role == "admin" {
        Ok(user)
    } else {
        Err(AppError::forbidden("Недостатньо прав для виконання дії"))
    }
}

pub fn build_session_cookie(token: String) -> Cookie<'static> {
    let mut cookie = Cookie::new(SESSION_COOKIE_NAME, token);
    cookie.set_http_only(true);
    let same_site = cookie_same_site();
    cookie.set_same_site(same_site);
    cookie.set_path("/");
    if secure_cookie_enabled() || same_site == SameSite::None {
        cookie.set_secure(true);
    }
    cookie
}

pub fn build_logout_cookie() -> Cookie<'static> {
    let mut cookie = Cookie::new(SESSION_COOKIE_NAME, "");
    cookie.set_http_only(true);
    let same_site = cookie_same_site();
    cookie.set_same_site(same_site);
    cookie.set_path("/");
    if secure_cookie_enabled() || same_site == SameSite::None {
        cookie.set_secure(true);
    }
    cookie.make_removal();
    cookie
}

pub fn session_token_from_jar(jar: &CookieJar) -> Option<String> {
    jar.get(SESSION_COOKIE_NAME)
        .map(|cookie| cookie.value().to_string())
}

fn secure_cookie_enabled() -> bool {
    std::env::var(COOKIE_SECURE_ENV).ok().is_some_and(|value| {
        matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        )
    })
}

fn cookie_same_site() -> SameSite {
    match std::env::var(COOKIE_SAMESITE_ENV)
        .ok()
        .map(|value| value.trim().to_ascii_lowercase())
        .as_deref()
    {
        Some("none") => SameSite::None,
        Some("strict") => SameSite::Strict,
        _ => SameSite::Lax,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, MutexGuard};

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn env_lock() -> MutexGuard<'static, ()> {
        ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    #[test]
    fn build_session_cookie_sets_expected_contract_attributes() {
        let _guard = env_lock();
        unsafe {
            std::env::remove_var("HR_SYSTEM_COOKIE_SECURE");
        }
        let cookie = build_session_cookie("session-token".to_string());

        assert_eq!(cookie.name(), SESSION_COOKIE_NAME);
        assert_eq!(cookie.value(), "session-token");
        assert_eq!(cookie.http_only(), Some(true));
        assert_eq!(cookie.same_site(), Some(SameSite::Lax));
        assert_eq!(cookie.path(), Some("/"));
        assert_eq!(cookie.secure(), None);
    }

    #[test]
    fn build_session_cookie_can_enable_secure_attribute_from_env() {
        let _guard = env_lock();
        unsafe {
            std::env::set_var("HR_SYSTEM_COOKIE_SECURE", "true");
        }

        let cookie = build_session_cookie("session-token".to_string());

        assert_eq!(cookie.secure(), Some(true));

        unsafe {
            std::env::remove_var("HR_SYSTEM_COOKIE_SECURE");
        }
    }

    #[test]
    fn build_logout_cookie_marks_cookie_for_removal() {
        let _guard = env_lock();
        unsafe {
            std::env::remove_var("HR_SYSTEM_COOKIE_SECURE");
        }
        let cookie = build_logout_cookie();
        let rendered = cookie.to_string();

        assert_eq!(cookie.name(), SESSION_COOKIE_NAME);
        assert_eq!(cookie.value(), "");
        assert_eq!(cookie.http_only(), Some(true));
        assert_eq!(cookie.same_site(), Some(SameSite::Lax));
        assert_eq!(cookie.path(), Some("/"));
        assert_eq!(cookie.secure(), None);
        assert!(rendered.contains("Max-Age=0"));
    }

    #[test]
    fn session_token_from_jar_reads_token_and_handles_missing_cookie() {
        let jar = CookieJar::new().add(Cookie::new(SESSION_COOKIE_NAME, "abc123"));

        assert_eq!(session_token_from_jar(&jar).as_deref(), Some("abc123"));
        assert_eq!(session_token_from_jar(&CookieJar::new()), None);
    }
}
