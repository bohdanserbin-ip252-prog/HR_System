import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmployeesResults from '../components/employees/EmployeesResults.tsx';
import EmployeesToolbar from '../components/employees/EmployeesToolbar.tsx';
import { useEmployeesPageData } from '../components/employees/useEmployeesPageData.ts';

const EMPLOYEES_FIXTURE = [
  {
    id: 21,
    first_name: 'Анна',
    last_name: 'Андрійчук',
    middle_name: 'Ігорівна',
    email: 'anna.andriychuk@example.com',
    salary: 22000,
    department_name: 'HR',
    position_title: 'HR Manager',
    status: 'on_leave',
    hire_date: '2022-02-01'
  },
  {
    id: 11,
    first_name: 'Іван',
    last_name: 'Петренко',
    middle_name: 'Олексійович',
    email: 'ivan.petrenko@example.com',
    salary: 25000,
    department_name: 'IT',
    position_title: 'Frontend Developer',
    status: 'active',
    hire_date: '2024-01-15'
  },
  {
    id: 39,
    first_name: 'Юлія',
    last_name: 'Шевченко',
    middle_name: 'Сергіївна',
    email: 'yuliia.shevchenko@example.com',
    salary: 28000,
    department_name: 'Finance',
    position_title: 'Accountant',
    status: 'fired',
    hire_date: '2021-10-12'
  }
];

function getDisplayName(employee) {
  return `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
}

function renderResults(overrides = {}) {
  const props = {
    employees: EMPLOYEES_FIXTURE,
    isLoading: false,
    errorMessage: '',
    isAdmin: true,
    sortBy: 'last_name',
    sortDir: 'asc',
    setSortBy: vi.fn(),
    setSortDir: vi.fn(),
    openProfile: vi.fn(),
    editEmployee: vi.fn(),
    confirmDelete: vi.fn(),
    ...overrides
  };

  const result = render(<EmployeesResults {...props} />);
  return { ...result, props };
}

function renderToolbar(overrides = {}) {
  const props = {
    searchInput: '',
    setSearchInput: vi.fn(),
    activeDepartment: null,
    departmentOptions: [{ value: '', label: 'Усі відділи', icon: 'category' }],
    departmentId: '',
    setDepartmentId: vi.fn(),
    status: '',
    setStatus: vi.fn(),
    sortBy: 'id',
    setSortBy: vi.fn(),
    sortDir: 'desc',
    setSortDir: vi.fn(),
    openDropdown: '',
    setOpenDropdown: vi.fn(),
    ...overrides
  };

  const result = render(<EmployeesToolbar {...props} />);
  return { ...result, props };
}

describe('EmployeesResults responsive hybrid view', () => {
  it('renders table shell and mobile card list from the same employee data', () => {
    const { container } = renderResults();

    expect(container.querySelector('.employees-table-shell')).toBeInTheDocument();
    expect(container.querySelector('.employees-table-view .data-table')).toBeInTheDocument();
    expect(container.querySelector('.employees-card-view')).toBeInTheDocument();
    expect(screen.getAllByText(/Андрійчук Анна Ігорівна/)).toHaveLength(2);
    expect(screen.getAllByText(/Петренко Іван Олексійович/)).toHaveLength(2);
    expect(screen.getAllByText(/Шевченко Юлія Сергіївна/)).toHaveLength(2);
    expect(screen.getAllByText('ivan.petrenko@example.com')).toHaveLength(2);
  });

  it('keeps table sort controls keyboard-focusable with header sort state', () => {
    const { props } = renderResults({ sortBy: 'salary', sortDir: 'desc' });

    expect(screen.getByRole('columnheader', { name: /Зарплата/i })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /Працівник/i })).toHaveAttribute('aria-sort', 'none');

    fireEvent.click(screen.getByRole('button', { name: /Зарплата/i }));
    expect(props.setSortDir).toHaveBeenCalledTimes(1);
    expect(typeof props.setSortDir.mock.calls[0][0]).toBe('function');
  });

  it('keeps equal employee ordering in table and card views for last_name ascending state', () => {
    const { container } = renderResults({ sortBy: 'last_name', sortDir: 'asc' });
    const tableView = container.querySelector('.employees-table-view');
    const cardView = container.querySelector('.employees-card-view');
    const expectedOrder = EMPLOYEES_FIXTURE.map(getDisplayName);

    const tableOrder = Array.from(tableView.querySelectorAll('.employee-name-button')).map(node =>
      node.textContent.trim()
    );
    const cardOrder = Array.from(cardView.querySelectorAll('.employee-name-button')).map(node =>
      node.textContent.trim()
    );

    expect(tableOrder).toEqual(expectedOrder);
    expect(cardOrder).toEqual(expectedOrder);
    expect(cardOrder).toEqual(tableOrder);
  });

  it('wires card-mode data and actions inside .employees-card-view', () => {
    const { container, props } = renderResults({ sortBy: 'last_name' });
    const cardView = container.querySelector('.employees-card-view');

    expect(cardView).toBeInTheDocument();
    const cardQueries = within(cardView);

    expect(cardQueries.getByText(/Петренко Іван Олексійович/)).toBeInTheDocument();
    expect(cardQueries.getByText('ivan.petrenko@example.com')).toBeInTheDocument();
    expect(cardQueries.getByText(/25\s?000 ₴/)).toBeInTheDocument();
    expect(cardQueries.getByText('IT')).toBeInTheDocument();
    expect(cardQueries.getByText('Frontend Developer')).toBeInTheDocument();

    fireEvent.click(cardQueries.getAllByRole('button', { name: 'Профіль' })[1]);
    fireEvent.click(cardQueries.getAllByRole('button', { name: 'Редагувати' })[1]);
    fireEvent.click(cardQueries.getAllByRole('button', { name: 'Видалити' })[1]);

    expect(props.openProfile).toHaveBeenCalledWith(11);
    expect(props.editEmployee).toHaveBeenCalledWith(11);
    expect(props.confirmDelete).toHaveBeenCalledWith('employee', 11, 'Петренко Іван');
  });

  it('wires mobile sort select to set sort state handlers', () => {
    const { props } = renderToolbar({ sortBy: 'id', sortDir: 'desc' });

    fireEvent.change(screen.getByLabelText('Сортування працівників'), {
      target: { value: 'salary:desc' }
    });

    expect(props.setSortBy).toHaveBeenCalledWith('salary');
    expect(props.setSortDir).toHaveBeenCalledWith('desc');
  });

  it('uses a single page-state boundary for loading/error/empty states', () => {
    const { container: loadingContainer } = renderResults({ employees: [], isLoading: true });
    expect(screen.getByLabelText('Завантаження таблиці')).toBeInTheDocument();
    expect(loadingContainer.querySelector('.employees-table-shell')).not.toBeInTheDocument();
    expect(loadingContainer.querySelector('.employees-card-view')).not.toBeInTheDocument();

    const { container: errorContainer } = renderResults({
      employees: [],
      isLoading: false,
      errorMessage: 'Network down'
    });
    expect(screen.getByText('Не вдалося завантажити працівників')).toBeInTheDocument();
    expect(errorContainer.querySelector('.employees-table-shell')).not.toBeInTheDocument();

    const { container: emptyContainer } = renderResults({
      employees: [],
      isLoading: false,
      errorMessage: ''
    });
    expect(screen.getByText('Працівників не знайдено')).toBeInTheDocument();
    expect(emptyContainer.querySelector('.employees-card-view')).not.toBeInTheDocument();
  });

  it('keeps current employee results visible while a filter-driven refetch is in progress', () => {
    const { container } = renderResults({ isLoading: true });

    expect(screen.getAllByText(/Петренко Іван Олексійович/)).toHaveLength(2);
    expect(container.querySelector('.employees-table-shell')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByLabelText('Завантаження таблиці')).not.toBeInTheDocument();
  });

  it('ignores outside-click targets that are not elements when closing custom selects', () => {
    const handleUnauthorized = vi.fn();
    const { result } = renderHook(() =>
      useEmployeesPageData({
        currentUser: null,
        isActive: false,
        refreshKey: 0,
        handleUnauthorized
      })
    );

    act(() => {
      result.current.setOpenDropdown('department');
    });

    expect(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }).not.toThrow();
  });
});
