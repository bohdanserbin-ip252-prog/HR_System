use std::path::{Path, PathBuf};

pub fn default_db_path() -> PathBuf {
    resolve_runtime_path(
        "HR_SYSTEM_DB_PATH",
        &[
            "backend/hr_system.db",
            "HR_System/backend/hr_system.db",
            "hr_system.db",
        ],
    )
}

pub fn default_frontend_dist_dir() -> PathBuf {
    resolve_runtime_path(
        "HR_SYSTEM_FRONTEND_DIST",
        &[
            "frontend/dist",
            "HR_System/frontend/dist",
            "../frontend/dist",
        ],
    )
}

fn resolve_runtime_path(env_key: &str, candidates: &[&str]) -> PathBuf {
    if let Ok(path) = std::env::var(env_key) {
        return PathBuf::from(path);
    }

    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for candidate in candidates {
        let candidate_path = current_dir.join(candidate);
        if candidate_path.exists() {
            return candidate_path;
        }
    }

    for candidate in candidates {
        let candidate_path = current_dir.join(candidate);
        if candidate_path.parent().is_some_and(Path::exists) {
            return candidate_path;
        }
    }

    current_dir.join(candidates[0])
}
