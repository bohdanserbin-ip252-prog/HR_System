use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    transport::smtp::authentication::Credentials,
    transport::smtp::client::{Tls, TlsParameters},
};

pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub from_address: String,
}

impl EmailConfig {
    pub fn from_env() -> Option<Self> {
        let smtp_host = std::env::var("SMTP_HOST").ok()?;
        let smtp_port = std::env::var("SMTP_PORT").ok()?.parse().ok()?;
        let smtp_user = std::env::var("SMTP_USER").ok()?;
        let smtp_password = std::env::var("SMTP_PASSWORD").ok()?;
        let from_address = std::env::var("SMTP_FROM").ok()?;
        Some(Self {
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_password,
            from_address,
        })
    }

    pub fn is_configured(&self) -> bool {
        !self.smtp_host.is_empty() && !self.smtp_user.is_empty() && !self.from_address.is_empty()
    }
}

pub async fn send_email(to: &str, subject: &str, body: &str) -> Result<(), String> {
    let config = match EmailConfig::from_env() {
        Some(c) if c.is_configured() => c,
        _ => {
            tracing::warn!("SMTP not configured, skipping email to {}", to);
            return Ok(());
        }
    };

    let email = Message::builder()
        .from(
            config
                .from_address
                .parse()
                .map_err(|e| format!("Invalid from address: {}", e))?,
        )
        .to(to
            .parse()
            .map_err(|e| format!("Invalid to address: {}", e))?)
        .subject(subject)
        .body(body.to_string())
        .map_err(|e| format!("Failed to build email: {}", e))?;

    let creds = Credentials::new(config.smtp_user, config.smtp_password);

    let mut builder = AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&config.smtp_host)
        .port(config.smtp_port)
        .credentials(creds);

    if config.smtp_port == 465 {
        let tls = TlsParameters::new(config.smtp_host.clone())
            .map_err(|e| format!("TLS error: {}", e))?;
        builder = builder.tls(Tls::Wrapper(tls));
    }

    let mailer = builder.build();

    mailer
        .send(email)
        .await
        .map_err(|e| format!("Failed to send email: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn send_email_skips_when_smtp_not_configured() {
        // Ensure no SMTP env vars are set for this test
        for key in [
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USER",
            "SMTP_PASSWORD",
            "SMTP_FROM",
        ] {
            unsafe {
                std::env::remove_var(key);
            }
        }
        let result = send_email("test@example.com", "Subject", "Body").await;
        assert!(result.is_ok());
    }
}
