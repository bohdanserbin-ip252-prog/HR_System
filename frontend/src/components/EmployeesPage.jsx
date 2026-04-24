import { useAppActions } from '../appContext.jsx';
import ExportCsvButton from './ExportCsvButton.jsx';
import EmployeesResults from './employees/EmployeesResults.jsx';
import EmployeesToolbar from './employees/EmployeesToolbar.jsx';
import { useEmployeesPageData } from './employees/useEmployeesPageData.js';

const EMPLOYEE_EXPORT_COLUMNS = [
  { label: 'Імʼя', value: item => item.first_name },
  { label: 'Прізвище', value: item => item.last_name },
  { label: 'Email', value: item => item.email || '' },
  { label: 'Відділ', value: item => item.department_name || '' },
  { label: 'Посада', value: item => item.position_title || '' },
  { label: 'Статус', value: item => item.status }
];

export default function EmployeesPage({ currentUser, isActive, refreshKey = 0 }) {
  const { confirmDelete, editEmployee, handleUnauthorized, openEmployeeCreate, openProfile } =
    useAppActions();

  const {
    employees,
    activeDepartment,
    departmentOptions,
    searchInput,
    setSearchInput,
    departmentId,
    setDepartmentId,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    openDropdown,
    setOpenDropdown,
    errorMessage,
    isLoading
  } = useEmployeesPageData({
    currentUser,
    isActive,
    refreshKey,
    handleUnauthorized
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <>
      <div className="page-header">
        <h1>Кадровий склад</h1>
        <p>Реєстр працівників підприємства та управління персоналом.</p>
      </div>

      <div className="card">
        <div className="card-header-bar">
          <h2>Реєстр працівників</h2>
          <div className="header-actions">
            <ExportCsvButton columns={EMPLOYEE_EXPORT_COLUMNS} filename="employees.csv" rows={employees} />
            {isAdmin ? (
              <button className="btn btn-primary" onClick={openEmployeeCreate} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>{' '}
                Додати
              </button>
            ) : null}
          </div>
        </div>

        <EmployeesToolbar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          activeDepartment={activeDepartment}
          departmentOptions={departmentOptions}
          departmentId={departmentId}
          setDepartmentId={setDepartmentId}
          status={status}
          setStatus={setStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDir={sortDir}
          setSortDir={setSortDir}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />

        <EmployeesResults
          employees={employees}
          isLoading={isLoading}
          errorMessage={errorMessage}
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
    </>
  );
}
