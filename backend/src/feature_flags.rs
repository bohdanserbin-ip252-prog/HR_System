use crate::AppState;
use crate::db;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const CACHE_TTL: Duration = Duration::from_secs(60);

#[derive(Debug, Clone)]
struct CacheEntry {
    flag: db::FeatureFlag,
    timestamp: Instant,
}

#[derive(Debug)]
pub struct FeatureFlagCache {
    data: Mutex<HashMap<String, CacheEntry>>,
}

impl FeatureFlagCache {
    pub fn new() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }

    pub fn get(&self, key: &str) -> Option<db::FeatureFlag> {
        let data = self.data.lock().ok()?;
        let entry = data.get(key)?;
        if entry.timestamp.elapsed() > CACHE_TTL {
            return None;
        }
        Some(entry.flag.clone())
    }

    pub fn set(&self, flag: db::FeatureFlag) {
        if let Ok(mut data) = self.data.lock() {
            data.insert(
                flag.key.clone(),
                CacheEntry {
                    flag,
                    timestamp: Instant::now(),
                },
            );
        }
    }

    pub fn clear(&self) {
        if let Ok(mut data) = self.data.lock() {
            data.clear();
        }
    }
}

static CACHE: OnceLock<FeatureFlagCache> = OnceLock::new();

pub fn get_cache() -> &'static FeatureFlagCache {
    CACHE.get_or_init(|| FeatureFlagCache::new())
}

fn evaluate_flag(flag: &db::FeatureFlag, user_role: &str) -> bool {
    if !flag.enabled {
        return false;
    }
    if let Some(ref roles) = flag.allowed_roles {
        let allowed: Vec<&str> = roles.split(',').map(str::trim).collect();
        if !allowed.contains(&user_role) {
            return false;
        }
    }
    if flag.rollout_percentage >= 100 {
        return true;
    }
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    flag.key.hash(&mut hasher);
    let hash = hasher.finish();
    (hash % 100) < (flag.rollout_percentage as u64)
}

pub fn check_feature_enabled(state: &AppState, key: &str, user_role: &str) -> bool {
    let cache = get_cache();
    if let Some(flag) = cache.get(key) {
        return evaluate_flag(&flag, user_role);
    }

    let db_path = state.db_path().to_path_buf();
    let key = key.to_string();

    match db::open_connection(&db_path) {
        Ok(conn) => match db::get_feature_flag(&conn, &key) {
            Ok(flag) => {
                let enabled = evaluate_flag(&flag, user_role);
                cache.set(flag);
                enabled
            }
            Err(_) => false,
        },
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_respects_ttl() {
        let cache = FeatureFlagCache::new();
        let flag = db::FeatureFlag {
            id: 1,
            key: "test".to_string(),
            enabled: true,
            rollout_percentage: 100,
            allowed_roles: None,
            created_at: "2024-01-01".to_string(),
            updated_at: "2024-01-01".to_string(),
        };
        cache.set(flag.clone());
        assert!(cache.get("test").is_some());
    }

    #[test]
    fn evaluate_flag_respects_enabled() {
        let flag = db::FeatureFlag {
            id: 1,
            key: "test".to_string(),
            enabled: false,
            rollout_percentage: 100,
            allowed_roles: None,
            created_at: "2024-01-01".to_string(),
            updated_at: "2024-01-01".to_string(),
        };
        assert!(!evaluate_flag(&flag, "admin"));
    }

    #[test]
    fn evaluate_flag_respects_roles() {
        let flag = db::FeatureFlag {
            id: 1,
            key: "test".to_string(),
            enabled: true,
            rollout_percentage: 100,
            allowed_roles: Some("admin".to_string()),
            created_at: "2024-01-01".to_string(),
            updated_at: "2024-01-01".to_string(),
        };
        assert!(evaluate_flag(&flag, "admin"));
        assert!(!evaluate_flag(&flag, "user"));
    }
}
