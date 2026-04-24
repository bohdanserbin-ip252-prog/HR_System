use crate::db::feature_flags::FEATURE_FLAGS_SCHEMA_SQL;
use crate::db::fts::FTS5_SCHEMA_SQL;
use crate::db::migrations::Migration;
use crate::db::rbac::RBAC_SCHEMA_SQL;
use crate::db::schema::SCHEMA_SQL;

pub static MIGRATIONS: &[Migration] = &[
    Migration {
        name: "0001_initial",
        sql: SCHEMA_SQL,
    },
    Migration {
        name: "0002_rbac",
        sql: RBAC_SCHEMA_SQL,
    },
    Migration {
        name: "0003_fts5",
        sql: FTS5_SCHEMA_SQL,
    },
    Migration {
        name: "0004_feature_flags",
        sql: FEATURE_FLAGS_SCHEMA_SQL,
    },
];
