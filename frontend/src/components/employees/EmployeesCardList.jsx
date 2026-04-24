import { formatDate, formatMoney } from '../../uiUtils.js';
import { EmployeeActions, EmployeePrimaryInfo, EmployeeStatusBadge } from './EmployeesTable.jsx';

export default function EmployeesCardList({ employees, isAdmin, openProfile, editEmployee, confirmDelete }) {
  return (
    <div className="employees-card-list">
      {employees.map(employee => (
        <article className="employee-card" key={employee.id}>
          <div className="employee-card-header">
            <EmployeePrimaryInfo employee={employee} openProfile={openProfile} />
            <EmployeeStatusBadge status={employee.status} />
          </div>

          <dl className="employee-card-meta">
            <div>
              <dt>Зарплата</dt>
              <dd>{formatMoney(employee.salary)} ₴</dd>
            </div>
            <div>
              <dt>Відділ</dt>
              <dd>{employee.department_name || '—'}</dd>
            </div>
            <div>
              <dt>Посада</dt>
              <dd>{employee.position_title || '—'}</dd>
            </div>
            <div>
              <dt>Дата прийому</dt>
              <dd>{formatDate(employee.hire_date)}</dd>
            </div>
          </dl>

          <div className="employee-card-actions">
            <EmployeeActions
              employee={employee}
              isAdmin={isAdmin}
              openProfile={openProfile}
              editEmployee={editEmployee}
              confirmDelete={confirmDelete}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
