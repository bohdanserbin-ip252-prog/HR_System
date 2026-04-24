import CustomSelect from './CustomSelect.jsx';
import { STATUS_OPTIONS } from './useEmployeesPageData.js';

const MOBILE_SORT_OPTIONS = [
  { value: 'id:desc', label: 'За замовчуванням' },
  { value: 'last_name:asc', label: 'Прізвище (А-Я)' },
  { value: 'last_name:desc', label: 'Прізвище (Я-А)' },
  { value: 'salary:asc', label: 'Зарплата (зростання)' },
  { value: 'salary:desc', label: 'Зарплата (спадання)' },
  { value: 'hire_date:asc', label: 'Дата прийому (спочатку старі)' },
  { value: 'hire_date:desc', label: 'Дата прийому (спочатку нові)' }
];

export default function EmployeesToolbar({
  searchInput,
  setSearchInput,
  activeDepartment,
  departmentOptions,
  departmentId,
  setDepartmentId,
  status,
  setStatus,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  openDropdown,
  setOpenDropdown
}) {
  const mobileSortValue = `${sortBy}:${sortDir}`;

  return (
    <div className="toolbar employees-toolbar">
      <div className="search-bar">
        <span className="material-symbols-outlined">search</span>
        <input
          aria-label="Пошук працівників"
          type="text"
          value={searchInput}
          placeholder="Пошук працівників..."
          onChange={event => setSearchInput(event.target.value)}
        />
      </div>
      <CustomSelect
        wrapperId="filterDeptWrap"
        icon="apartment"
        label={activeDepartment?.name || 'Усі відділи'}
        options={departmentOptions}
        value={departmentId}
        isOpen={openDropdown === 'department'}
        onToggle={() => setOpenDropdown(current => (current === 'department' ? '' : 'department'))}
        onSelect={value => {
          setDepartmentId(String(value ?? ''));
          setOpenDropdown('');
        }}
      />
      <CustomSelect
        wrapperId="filterStatusWrap"
        icon="filter_list"
        label={STATUS_OPTIONS.find(option => option.value === status)?.label || 'Усі статуси'}
        options={STATUS_OPTIONS}
        value={status}
        isOpen={openDropdown === 'status'}
        onToggle={() => setOpenDropdown(current => (current === 'status' ? '' : 'status'))}
        onSelect={value => {
          setStatus(String(value ?? ''));
          setOpenDropdown('');
        }}
      />
      <label className="employees-mobile-sort">
        <span className="employees-mobile-sort-label">Сортування</span>
        <select
          aria-label="Сортування працівників"
          onChange={event => {
            const [nextSortBy, nextSortDir] = String(event.target.value || '').split(':');
            if (!nextSortBy || !nextSortDir) return;
            setSortBy(nextSortBy);
            setSortDir(nextSortDir);
          }}
          value={mobileSortValue}
        >
          {MOBILE_SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
