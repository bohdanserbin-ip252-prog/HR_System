import { useEffect, useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import { formatDate, formatMoney, getAvatarColor, statusLabel } from '../uiUtils.js';
import PageStateBoundary from './PageStateBoundary.jsx';

const STATUS_OPTIONS = [
    { value: '', label: 'Усі статуси', icon: 'checklist' },
    { value: 'active', label: 'Активний', icon: 'status-active' },
    { value: 'on_leave', label: 'У відпустці', icon: 'status-on_leave' },
    { value: 'fired', label: 'Звільнений', icon: 'status-fired' }
];

function CustomSelect({
    wrapperId,
    icon,
    label,
    options,
    value,
    isOpen,
    onToggle,
    onSelect
}) {
    return (
        <div className={`custom-select${isOpen ? ' open' : ''}`} id={wrapperId}>
            <button className="custom-select-trigger" onClick={onToggle} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>{icon}</span>
                <span className="custom-select-label">{label}</span>
                <span className="material-symbols-outlined custom-select-arrow">expand_more</span>
            </button>
            <ul className="custom-select-options">
                {options.map(option => (
                    <li
                        key={option.value || 'all'}
                        className={`custom-select-option${String(option.value) === String(value) ? ' selected' : ''}`}
                        data-value={option.value}
                        onClick={() => onSelect(option.value)}
                    >
                        {option.icon.startsWith('status-') ? (
                            <span className={`status-dot ${option.icon.replace('status-', '')}`} style={{ marginRight: '4px' }} />
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{option.icon}</span>
                        )}
                        {' '}
                        {option.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function EmployeesPage({ currentUser, isActive, refreshKey = 0 }) {
    const { confirmDelete, editEmployee, handleUnauthorized, openEmployeeCreate, openProfile } = useAppActions();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const {
        errorMessage,
        failWithError,
        finishLoading,
        isLoading,
        resetAsyncStatus,
        setErrorMessage,
        startLoading
    } = useAsyncStatus();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [status, setStatus] = useState('');
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('desc');
    const [openDropdown, setOpenDropdown] = useState('');

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [searchInput]);

    useEffect(() => {
        function handleDocumentClick(event) {
            if (!event.target.closest('.custom-select')) setOpenDropdown('');
        }

        if (!openDropdown) return undefined;
        document.addEventListener('click', handleDocumentClick);
        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [openDropdown]);

    useAbortableLoadEffect({
        enabled: Boolean(currentUser),
        deps: [currentUser, handleUnauthorized, refreshKey],
        onDisabled: () => {
            if (!currentUser) {
                setEmployees([]);
                setDepartments([]);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            try {
                const data = await fetchJSON(`${API}/api/departments`, { signal });
                if (!signal.aborted) setDepartments(Array.isArray(data) ? data : []);
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження відділів');
            }
        }
    });

    useAbortableLoadEffect({
        enabled: Boolean(currentUser && isActive),
        deps: [currentUser, departmentId, handleUnauthorized, isActive, refreshKey, searchQuery, sortBy, sortDir, status],
        onDisabled: () => {
            if (!currentUser) {
                setEmployees([]);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const params = new URLSearchParams();
                if (searchQuery) params.set('search', searchQuery);
                if (departmentId) params.set('department_id', departmentId);
                if (status) params.set('status', status);
                params.set('sort_by', sortBy);
                params.set('sort_dir', sortDir);

                const data = await fetchJSON(`${API}/api/employees?${params}`, { signal });
                if (!signal.aborted) {
                    setEmployees(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                setEmployees([]);
                failWithError(error, 'Помилка завантаження працівників');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    const activeDepartment = departments.find(item => String(item.id) === String(departmentId));
    const departmentOptions = [
        { value: '', label: 'Усі відділи', icon: 'category' },
        ...departments.map(item => ({
            value: String(item.id),
            label: item.name,
            icon: 'apartment'
        }))
    ];

    const content = (
        <div className="page-header">
            <h1>Кадровий склад</h1>
            <p>Реєстр працівників підприємства та управління персоналом.</p>
        </div>
    );

    const tableContent = (
        <div className="card">
            <div className="card-header-bar">
                <h2>Реєстр працівників</h2>
                {isAdmin ? (
                    <button className="btn btn-primary" onClick={openEmployeeCreate} type="button">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                        {' '}
                        Додати
                    </button>
                ) : null}
            </div>
            <div className="toolbar">
                <div className="search-bar">
                    <span className="material-symbols-outlined">search</span>
                    <input
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
                    onToggle={() => setOpenDropdown(current => current === 'department' ? '' : 'department')}
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
                    onToggle={() => setOpenDropdown(current => current === 'status' ? '' : 'status')}
                    onSelect={value => {
                        setStatus(String(value ?? ''));
                        setOpenDropdown('');
                    }}
                />
            </div>
            <div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => {
                                if (sortBy === 'last_name') setSortDir(current => current === 'asc' ? 'desc' : 'asc');
                                else {
                                    setSortBy('last_name');
                                    setSortDir('asc');
                                }
                            }}>
                                Працівник
                                {' '}
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>unfold_more</span>
                            </th>
                            <th className="sortable" onClick={() => {
                                if (sortBy === 'salary') setSortDir(current => current === 'asc' ? 'desc' : 'asc');
                                else {
                                    setSortBy('salary');
                                    setSortDir('asc');
                                }
                            }}>
                                Зарплата
                                {' '}
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>unfold_more</span>
                            </th>
                            <th>Відділ</th>
                            <th>Посада</th>
                            <th>Статус</th>
                            <th className="sortable" onClick={() => {
                                if (sortBy === 'hire_date') setSortDir(current => current === 'asc' ? 'desc' : 'asc');
                                else {
                                    setSortBy('hire_date');
                                    setSortDir('asc');
                                }
                            }}>
                                Дата прийому
                                {' '}
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>unfold_more</span>
                            </th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(employee => {
                            const displayName = `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
                            const deleteName = `${employee.last_name} ${employee.first_name}`.trim();

                            return (
                                <tr key={employee.id}>
                                    <td>
                                        <div className="employee-cell">
                                            <div className="avatar" style={{ background: getAvatarColor(employee.last_name) }}>
                                                {employee.first_name?.[0] || ''}
                                                {employee.last_name?.[0] || ''}
                                            </div>
                                            <div>
                                                <div
                                                    style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }}
                                                    onClick={() => openProfile(employee.id)}
                                                >
                                                    {displayName}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                                    {employee.email || ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-headline)' }}>{formatMoney(employee.salary)} ₴</td>
                                    <td>{employee.department_name || '—'}</td>
                                    <td>{employee.position_title || '—'}</td>
                                    <td>
                                        <span className={`badge badge-${employee.status}`}>
                                            <span className={`status-dot ${employee.status}`}></span>
                                            {' '}
                                            {statusLabel(employee.status)}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--on-surface-variant)' }}>{formatDate(employee.hire_date)}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => openProfile(employee.id)} title="Профіль" type="button">
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                            </button>
                                            {isAdmin ? (
                                                <>
                                                    <button className="btn-icon" onClick={() => editEmployee(employee.id)} title="Редагувати" type="button">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => confirmDelete('employee', employee.id, deleteName)}
                                                        title="Видалити"
                                                        type="button"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <PageStateBoundary
                    loading={isLoading ? {
                        icon: 'hourglass_top',
                        title: 'Завантаження працівників',
                        description: 'Отримуємо актуальні записи з бази даних.'
                    } : null}
                    error={!isLoading && errorMessage ? {
                        icon: 'error',
                        title: 'Не вдалося завантажити працівників',
                        description: errorMessage
                    } : null}
                    empty={!isLoading && !errorMessage && employees.length === 0 ? {
                        icon: 'group_off',
                        title: 'Працівників не знайдено',
                        description: 'Спробуйте змінити параметри пошуку або фільтрів.'
                    } : null}
                />
            </div>
        </div>
    );

    return (
        <>
            {content}
            {tableContent}
        </>
    );
}
