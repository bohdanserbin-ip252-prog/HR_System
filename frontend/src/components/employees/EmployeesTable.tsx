import { formatDate, formatMoney, getAvatarColor, statusLabel } from '../../uiUtils.ts';

function SortableHeader({ title, active, sortDir, onToggle }) {
  const ariaSort = active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none';

  return (
    <th aria-sort={ariaSort} className="sortable">
      <button className="data-table-sort-button" onClick={onToggle} type="button">
        {title}{' '}
        <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
          unfold_more
        </span>
      </button>
    </th>
  );
}

export function getEmployeeDisplayName(employee) {
  return `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
}

export function getEmployeeDeleteName(employee) {
  return `${employee.last_name} ${employee.first_name}`.trim();
}

export function EmployeePrimaryInfo({ employee, openProfile }) {
  return (
    <div className="employee-cell">
      <div className="avatar" style={{ background: getAvatarColor(employee.last_name) }}>
        {employee.first_name?.[0] || ''}
        {employee.last_name?.[0] || ''}
      </div>
      <div>
        <button className="employee-name-button" onClick={() => openProfile(employee.id)} type="button">
          {getEmployeeDisplayName(employee)}
        </button>
        <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{employee.email || ''}</div>
      </div>
    </div>
  );
}

export function EmployeeStatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className={`status-dot ${status}`}></span> {statusLabel(status)}
    </span>
  );
}

export function EmployeeActions({ employee, isAdmin, openProfile, editEmployee, confirmDelete }) {
  return (
    <div className="actions-cell">
      <button
        aria-label="Профіль"
        className="btn-icon"
        onClick={() => openProfile(employee.id)}
        title="Профіль"
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          open_in_new
        </span>
      </button>
      {isAdmin ? (
        <>
          <button
            aria-label="Редагувати"
            className="btn-icon"
            onClick={() => editEmployee(employee.id)}
            title="Редагувати"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              edit
            </span>
          </button>
          <button
            aria-label="Видалити"
            className="btn-icon"
            onClick={() => confirmDelete('employee', employee.id, getEmployeeDeleteName(employee))}
            title="Видалити"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              delete
            </span>
          </button>
        </>
      ) : null}
    </div>
  );
}

export default function EmployeesTable({
  employees,
  isAdmin,
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  openProfile,
  editEmployee,
  confirmDelete
}) {
  const toggleSort = field => {
    if (sortBy === field) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortDir('asc');
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <SortableHeader
            title="Працівник"
            active={sortBy === 'last_name'}
            sortDir={sortDir}
            onToggle={() => toggleSort('last_name')}
          />
          <SortableHeader
            title="Зарплата"
            active={sortBy === 'salary'}
            sortDir={sortDir}
            onToggle={() => toggleSort('salary')}
          />
          <th>Відділ</th>
          <th>Посада</th>
          <th>Статус</th>
          <SortableHeader
            title="Дата прийому"
            active={sortBy === 'hire_date'}
            sortDir={sortDir}
            onToggle={() => toggleSort('hire_date')}
          />
          <th>Дії</th>
        </tr>
      </thead>
      <tbody>
        {employees.map(employee => (
          <tr key={employee.id}>
            <td>
              <EmployeePrimaryInfo employee={employee} openProfile={openProfile} />
            </td>
            <td style={{ fontWeight: 700, fontFamily: 'var(--font-headline)' }}>{formatMoney(employee.salary)} ₴</td>
            <td>{employee.department_name || '—'}</td>
            <td>{employee.position_title || '—'}</td>
            <td>
              <EmployeeStatusBadge status={employee.status} />
            </td>
            <td style={{ color: 'var(--on-surface-variant)' }}>{formatDate(employee.hire_date)}</td>
            <td>
              <EmployeeActions
                employee={employee}
                isAdmin={isAdmin}
                openProfile={openProfile}
                editEmployee={editEmployee}
                confirmDelete={confirmDelete}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
