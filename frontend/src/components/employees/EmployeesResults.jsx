import PageStateBoundary from '../PageStateBoundary.jsx';
import EmployeesCardList from './EmployeesCardList.jsx';
import EmployeesTable from './EmployeesTable.jsx';

export default function EmployeesResults({
  employees,
  isLoading,
  errorMessage,
  isAdmin,
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  openProfile,
  editEmployee,
  confirmDelete
}) {
  const isRefreshingResults = isLoading && employees.length > 0;

  return (
    <PageStateBoundary
      pageName="employees"
      loading={
        isLoading && employees.length === 0
          ? {
              icon: 'hourglass_top',
              title: 'Завантаження працівників',
              description: 'Отримуємо актуальні записи з бази даних.'
            }
          : null
      }
      error={
        !isLoading && errorMessage
          ? {
              icon: 'error',
              title: 'Не вдалося завантажити працівників',
              description: errorMessage
            }
          : null
      }
      empty={
        !isLoading && !errorMessage && employees.length === 0
          ? {
              icon: 'group_off',
              title: 'Працівників не знайдено',
              description: 'Спробуйте змінити параметри пошуку або фільтрів.'
            }
          : null
      }
    >
      <div
        aria-busy={isRefreshingResults ? 'true' : 'false'}
        className={`employees-results-shell${isRefreshingResults ? ' employees-results-shell--refreshing' : ''}`}
      >
        {isRefreshingResults ? (
          <div className="employees-refreshing-indicator" role="status" aria-live="polite">
            <span className="material-symbols-outlined" aria-hidden="true">sync</span>
            <span>Оновлюємо список…</span>
          </div>
        ) : null}

        <div className="employees-table-view">
          <div className="employees-table-shell">
            <EmployeesTable
              employees={employees}
              isAdmin={isAdmin}
              sortBy={sortBy}
              sortDir={sortDir}
              setSortBy={setSortBy}
              setSortDir={setSortDir}
              openProfile={openProfile}
              editEmployee={editEmployee}
              confirmDelete={confirmDelete}
            />
          </div>
        </div>

        <div className="employees-card-view">
          <EmployeesCardList
            employees={employees}
            isAdmin={isAdmin}
            openProfile={openProfile}
            editEmployee={editEmployee}
            confirmDelete={confirmDelete}
          />
        </div>
      </div>
    </PageStateBoundary>
  );
}
