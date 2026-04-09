use crate::{
    AppError, AppResult, AppState, db,
    models::User,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};

pub const SESSION_COOKIE_NAME: &str = "hr_system_session";

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
    cookie.set_same_site(SameSite::Lax);
    cookie.set_path("/");
    cookie
}

pub fn build_logout_cookie() -> Cookie<'static> {
    let mut cookie = Cookie::new(SESSION_COOKIE_NAME, "");
    cookie.set_http_only(true);
    cookie.set_same_site(SameSite::Lax);
    cookie.set_path("/");
    cookie.make_removal();
    cookie
}

pub fn session_token_from_jar(jar: &CookieJar) -> Option<String> {
    jar.get(SESSION_COOKIE_NAME).map(|cookie| cookie.value().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_session_cookie_sets_expected_contract_attributes() {
        let cookie = build_session_cookie("session-token".to_string());

        assert_eq!(cookie.name(), SESSION_COOKIE_NAME);
        assert_eq!(cookie.value(), "session-token");
        assert_eq!(cookie.http_only(), Some(true));
        assert_eq!(cookie.same_site(), Some(SameSite::Lax));
        assert_eq!(cookie.path(), Some("/"));
    }

    #[test]
    fn build_logout_cookie_marks_cookie_for_removal() {
        let cookie = build_logout_cookie();
        let rendered = cookie.to_string();

        assert_eq!(cookie.name(), SESSION_COOKIE_NAME);
        assert_eq!(cookie.value(), "");
        assert_eq!(cookie.http_only(), Some(true));
        assert_eq!(cookie.same_site(), Some(SameSite::Lax));
        assert_eq!(cookie.path(), Some("/"));
        assert!(rendered.contains("Max-Age=0"));
    }

    #[test]
    fn session_token_from_jar_reads_token_and_handles_missing_cookie() {
        let jar = CookieJar::new().add(Cookie::new(SESSION_COOKIE_NAME, "abc123"));

        assert_eq!(session_token_from_jar(&jar).as_deref(), Some("abc123"));
        assert_eq!(session_token_from_jar(&CookieJar::new()), None);
    }
}
