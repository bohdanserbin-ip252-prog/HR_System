use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};
#[cfg(test)]
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};

pub const FEATURE_FLAGS_SCHEMA_SQL: &str = r#"
    CREATE TABLE IF NOT EXISTS feature_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 0,
        rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK(rollout_percentage >= 0 AND rollout_percentage <= 100),
        allowed_roles TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

    INSERT OR IGNORE INTO feature_flags (key, enabled, rollout_percentage, allowed_roles) VALUES
        ('payroll_module', 0, 0, 'admin,hr_manager'),
        ('advanced_reports', 0, 0, 'admin'),
        ('bulk_operations', 0, 0, 'admin');
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlag {
    pub id: i64,
    pub key: String,
    pub enabled: bool,
    pub rollout_percentage: i64,
    pub allowed_roles: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl FeatureFlag {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            key: row.get(1)?,
            enabled: row.get::<_, i64>(2)? != 0,
            rollout_percentage: row.get(3)?,
            allowed_roles: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }
}

#[cfg(test)]
pub fn is_feature_enabled(conn: &Connection, key: &str, user_role: &str) -> AppResult<bool> {
    let row: Option<(i64, i64, Option<String>)> = conn
        .query_row(
            "SELECT enabled, rollout_percentage, allowed_roles FROM feature_flags WHERE key = ?",
            params![key],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|err| AppError::internal(err.to_string()))?;

    let Some((enabled, rollout_percentage, allowed_roles)) = row else {
        return Ok(false);
    };

    if enabled == 0 {
        return Ok(false);
    }

    if let Some(roles) = allowed_roles {
        let allowed: Vec<&str> = roles.split(',').map(|s: &str| s.trim()).collect();
        if !allowed.contains(&user_role) {
            return Ok(false);
        }
    }

    if rollout_percentage >= 100 {
        return Ok(true);
    }

    // Deterministic rollout based on key hash
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    let hash = hasher.finish();
    Ok((hash % 100) < (rollout_percentage as u64))
}

pub fn get_feature_flag(conn: &Connection, key: &str) -> AppResult<FeatureFlag> {
    conn.query_row(
        "SELECT id, key, enabled, rollout_percentage, allowed_roles, created_at, updated_at FROM feature_flags WHERE key = ?",
        params![key],
        FeatureFlag::from_row,
    )
    .map_err(|err| AppError::internal(err.to_string()))
}

pub fn list_feature_flags(conn: &Connection) -> AppResult<Vec<FeatureFlag>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, key, enabled, rollout_percentage, allowed_roles, created_at, updated_at FROM feature_flags ORDER BY key",
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    let rows = stmt
        .query_map([], FeatureFlag::from_row)
        .map_err(|err| AppError::internal(err.to_string()))?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|err| AppError::internal(err.to_string()))
}

pub fn update_feature_flag(
    conn: &Connection,
    key: &str,
    enabled: bool,
    rollout_percentage: i64,
    allowed_roles: Option<&str>,
) -> AppResult<usize> {
    conn.execute(
        "UPDATE feature_flags SET enabled = ?, rollout_percentage = ?, allowed_roles = ?, updated_at = datetime('now') WHERE key = ?",
        params![enabled as i64, rollout_percentage, allowed_roles, key],
    )
    .map_err(|err| AppError::internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(FEATURE_FLAGS_SCHEMA_SQL).unwrap();
        conn
    }

    #[test]
    fn feature_flag_defaults_to_disabled() {
        let conn = setup_conn();
        assert!(!is_feature_enabled(&conn, "payroll_module", "admin").unwrap());
    }

    #[test]
    fn feature_flag_respects_allowed_roles() {
        let conn = setup_conn();
        update_feature_flag(&conn, "payroll_module", true, 100, Some("admin,hr_manager")).unwrap();
        assert!(is_feature_enabled(&conn, "payroll_module", "admin").unwrap());
        assert!(is_feature_enabled(&conn, "payroll_module", "hr_manager").unwrap());
        assert!(!is_feature_enabled(&conn, "payroll_module", "employee").unwrap());
    }

    #[test]
    fn feature_flag_rollout_is_deterministic() {
        let conn = setup_conn();
        // Deterministic: key hash modulo 100
        update_feature_flag(&conn, "advanced_reports", true, 100, None).unwrap();
        assert!(is_feature_enabled(&conn, "advanced_reports", "admin").unwrap());

        update_feature_flag(&conn, "advanced_reports", true, 0, None).unwrap();
        assert!(!is_feature_enabled(&conn, "advanced_reports", "admin").unwrap());
    }

    #[test]
    fn list_and_get_feature_flags() {
        let conn = setup_conn();
        let flags = list_feature_flags(&conn).unwrap();
        assert_eq!(flags.len(), 3);

        let flag = get_feature_flag(&conn, "bulk_operations").unwrap();
        assert_eq!(flag.key, "bulk_operations");
        assert!(!flag.enabled);
    }
}
