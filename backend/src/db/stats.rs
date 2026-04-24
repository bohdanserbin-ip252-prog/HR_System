use crate::models::{
    DepartmentCountStat, DepartmentHealthStat, RecentHire, RiskMetrics, SalaryByDeptStat,
    StatsResponse,
};
use rusqlite::Connection;

use super::map_all;

pub fn fetch_stats(conn: &Connection) -> rusqlite::Result<StatsResponse> {
    let total_employees: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status != 'fired'",
        [],
        |row| row.get("c"),
    )?;
    let total_departments: i64 =
        conn.query_row("SELECT COUNT(*) as c FROM departments", [], |row| {
            row.get("c")
        })?;
    let total_positions: i64 =
        conn.query_row("SELECT COUNT(*) as c FROM positions", [], |row| {
            row.get("c")
        })?;
    let avg_salary: i64 = conn
        .query_row(
            "SELECT ROUND(AVG(salary),0) as avg FROM employees WHERE status='active'",
            [],
            |row| row.get::<_, Option<f64>>("avg"),
        )?
        .map(|value| value.round() as i64)
        .unwrap_or(0);

    let active_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='active'",
        [],
        |row| row.get("c"),
    )?;
    let on_leave_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='on_leave'",
        [],
        |row| row.get("c"),
    )?;
    let fired_count: i64 = conn.query_row(
        "SELECT COUNT(*) as c FROM employees WHERE status='fired'",
        [],
        |row| row.get("c"),
    )?;

    let dept_stats = map_all(
        conn,
        "
        SELECT d.name, COUNT(e.id) as count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status != 'fired'
        GROUP BY d.id ORDER BY count DESC
        ",
        [],
        DepartmentCountStat::from_row,
    )?;

    let recent_hires = map_all(
        conn,
        "
        SELECT e.first_name, e.last_name, e.hire_date, d.name as department, p.title as position
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.status = 'active'
        ORDER BY e.hire_date DESC LIMIT 5
        ",
        [],
        RecentHire::from_row,
    )?;

    let salary_by_dept = map_all(
        conn,
        "
        SELECT d.name, ROUND(AVG(e.salary),0) as avg_salary,
               MIN(e.salary) as min_salary, MAX(e.salary) as max_salary
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        GROUP BY d.id
        ORDER BY avg_salary DESC, d.name ASC
        ",
        [],
        SalaryByDeptStat::from_row,
    )?;
    let risk_metrics = fetch_risk_metrics(conn)?;
    let department_health = fetch_department_health(conn)?;

    Ok(StatsResponse {
        total_employees,
        total_departments,
        total_positions,
        avg_salary,
        active_count,
        on_leave_count,
        fired_count,
        dept_stats,
        recent_hires,
        salary_by_dept,
        risk_metrics,
        department_health,
    })
}

fn fetch_risk_metrics(conn: &Connection) -> rusqlite::Result<RiskMetrics> {
    let open_complaints = conn.query_row(
        "SELECT COUNT(*) FROM employee_complaints WHERE status IN ('open', 'in_review')",
        [],
        |row| row.get(0),
    )?;
    let critical_complaints = conn.query_row(
        "
        SELECT COUNT(*) FROM employee_complaints
        WHERE severity = 'critical' AND status NOT IN ('resolved', 'rejected')
        ",
        [],
        |row| row.get(0),
    )?;
    let repeat_complaint_employees = conn.query_row(
        "
        SELECT COUNT(*) FROM (
            SELECT employee_id FROM employee_complaints
            WHERE employee_id IS NOT NULL AND status IN ('open', 'in_review')
            GROUP BY employee_id HAVING COUNT(*) > 1
        )
        ",
        [],
        |row| row.get(0),
    )?;
    let overdue_cases = conn.query_row(
        "SELECT COUNT(*) FROM employee_complaints WHERE due_date < date('now') AND status IN ('open','in_review')",
        [],
        |row| row.get(0),
    )?;
    let pending_time_off = conn.query_row(
        "SELECT COUNT(*) FROM time_off_requests WHERE status = 'pending'",
        [],
        |row| row.get(0),
    )?;
    let overdue_reviews = conn.query_row(
        "SELECT COUNT(*) FROM performance_reviews WHERE status != 'finalized' AND created_at < datetime('now', '-90 day')",
        [],
        |row| row.get(0),
    )?;

    Ok(RiskMetrics {
        open_complaints,
        critical_complaints,
        repeat_complaint_employees,
        overdue_cases,
        pending_time_off,
        overdue_reviews,
    })
}

fn fetch_department_health(conn: &Connection) -> rusqlite::Result<Vec<DepartmentHealthStat>> {
    map_all(
        conn,
        "
        SELECT d.name,
               COUNT(DISTINCT e.id) as active_employees,
               COUNT(DISTINCT c.id) as open_cases
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        LEFT JOIN employee_complaints c ON c.employee_id = e.id AND c.status IN ('open','in_review')
        GROUP BY d.id
        ORDER BY open_cases DESC, active_employees DESC, d.name ASC
        ",
        [],
        DepartmentHealthStat::from_row,
    )
}
