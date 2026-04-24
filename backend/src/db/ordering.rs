use rusqlite::{Connection, params};

use super::map_all;

fn normalize_display_order(conn: &Connection, table_name: &str) -> rusqlite::Result<()> {
    let query = format!("SELECT id FROM {table_name} ORDER BY display_order, id");
    let ordered_ids = map_all(conn, &query, [], |row| row.get::<_, i64>("id"))?;

    let update_sql =
        format!("UPDATE {table_name} SET display_order = ? WHERE id = ? AND display_order != ?");
    for (index, entity_id) in ordered_ids.iter().enumerate() {
        let order = index as i64 + 1;
        conn.execute(&update_sql, params![order, entity_id, order])?;
    }

    Ok(())
}

pub fn move_display_order(
    conn: &Connection,
    table_name: &str,
    id: &str,
    direction: &str,
) -> rusqlite::Result<()> {
    normalize_display_order(conn, table_name)?;

    let query = format!("SELECT id FROM {table_name} ORDER BY display_order, id");
    let ordered_ids = map_all(conn, &query, [], |row| row.get::<_, i64>("id"))?;
    let Some(index) = ordered_ids
        .iter()
        .position(|entity_id| entity_id.to_string() == id)
    else {
        return Ok(());
    };

    let target_index = match direction {
        "up" if index > 0 => Some(index - 1),
        "down" if index + 1 < ordered_ids.len() => Some(index + 1),
        _ => None,
    };

    let Some(target_index) = target_index else {
        return Ok(());
    };

    let current_order = index as i64 + 1;
    let target_order = target_index as i64 + 1;
    let target_id = ordered_ids[target_index];

    let update_sql = format!("UPDATE {table_name} SET display_order = ? WHERE id = ?");
    conn.execute(&update_sql, params![target_order, id])?;
    conn.execute(&update_sql, params![current_order, target_id])?;

    Ok(())
}
