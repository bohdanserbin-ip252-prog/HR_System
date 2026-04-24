mod core_people;
mod development_data;
mod onboarding_data;
mod platform_data;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;

pub fn seed_database(conn: &mut Connection) -> AppResult<()> {
    let tx = conn
        .transaction()
        .map_err(|err| AppError::internal(err.to_string()))?;

    core_people::seed_departments(&tx)?;
    core_people::seed_positions(&tx)?;
    core_people::seed_users(&tx)?;
    core_people::seed_employees(&tx)?;

    development_data::seed_goals(&tx)?;
    development_data::seed_feedback(&tx)?;
    development_data::seed_meetings(&tx)?;

    onboarding_data::seed_onboarding_tasks(&tx)?;

    platform_data::seed_candidates(&tx).map_err(|err| AppError::internal(err.to_string()))?;
    platform_data::seed_tickets(&tx).map_err(|err| AppError::internal(err.to_string()))?;
    platform_data::seed_surveys(&tx).map_err(|err| AppError::internal(err.to_string()))?;

    tx.commit()
        .map_err(|err| AppError::internal(err.to_string()))?;
    println!("Database seeded successfully.");
    Ok(())
}
