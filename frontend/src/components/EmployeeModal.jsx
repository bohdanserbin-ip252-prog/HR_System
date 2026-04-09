import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

function getTodayInputValue() {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localNow.toISOString().split('T')[0];
}

function createEmptyForm() {
    return {
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phone: '',
        birthDate: '',
        hireDate: getTodayInputValue(),
        salary: '',
        departmentId: '',
        positionId: '',
        status: 'active',
        address: ''
    };
}

function mapEmployeeToForm(employee) {
    return {
        firstName: employee?.first_name || '',
        lastName: employee?.last_name || '',
        middleName: employee?.middle_name || '',
        email: employee?.email || '',
        phone: employee?.phone || '',
        birthDate: employee?.birth_date || '',
        hireDate: employee?.hire_date || getTodayInputValue(),
        salary: employee?.salary != null ? String(employee.salary) : '',
        departmentId: employee?.department_id != null ? String(employee.department_id) : '',
        positionId: employee?.position_id != null ? String(employee.position_id) : '',
        status: employee?.status || 'active',
        address: employee?.address || ''
    };
}

export default function EmployeeModal({
    isOpen,
    mode,
    employeeId,
    currentUser,
    onClose
}) {
    const { afterEmployeeMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(createEmptyForm());
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const {
        errorMessage,
        failWithError,
        finishLoading,
        isLoading,
        resetAsyncStatus,
        setErrorMessage,
        startLoading
    } = useAsyncStatus();

    const isAdmin = currentUser?.role === 'admin';

    useAbortableLoadEffect({
        enabled: Boolean(isOpen && isAdmin),
        deps: [employeeId, handleUnauthorized, isAdmin, isOpen, mode, onClose],
        onDisabled: () => {
            if (!isOpen) {
                setForm(createEmptyForm());
                setDepartments([]);
                setPositions([]);
                setIsSaving(false);
                resetAsyncStatus();
                return;
            }

            if (!isAdmin) {
                onClose();
            }
        },
        load: async ({ signal }) => {
            startLoading();
            setForm(createEmptyForm());

            try {
                const refsPromise = Promise.all([
                    fetchJSON(`${API}/api/departments`, { signal }),
                    fetchJSON(`${API}/api/positions`, { signal })
                ]);

                if (mode === 'edit' && employeeId) {
                    const [references, employee] = await Promise.all([
                        refsPromise,
                        fetchJSON(`${API}/api/employees/${employeeId}`, {
                            signal
                        })
                    ]);

                    if (!signal.aborted) {
                        const [nextDepartments, nextPositions] = references;
                        setDepartments(Array.isArray(nextDepartments) ? nextDepartments : []);
                        setPositions(Array.isArray(nextPositions) ? nextPositions : []);
                        setForm(mapEmployeeToForm(employee));
                    }
                    return;
                }

                const [nextDepartments, nextPositions] = await refsPromise;
                if (!signal.aborted) {
                    setDepartments(Array.isArray(nextDepartments) ? nextDepartments : []);
                    setPositions(Array.isArray(nextPositions) ? nextPositions : []);
                    setForm(createEmptyForm());
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження форми працівника');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isLoading || isSaving) return;

        const payload = {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            middle_name: form.middleName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            birth_date: form.birthDate || '',
            hire_date: form.hireDate,
            salary: Number.parseFloat(form.salary || '0') || 0,
            department_id: form.departmentId ? Number.parseInt(form.departmentId, 10) : null,
            position_id: form.positionId ? Number.parseInt(form.positionId, 10) : null,
            status: form.status || 'active',
            address: form.address.trim()
        };

        if (!payload.first_name || !payload.last_name || !payload.hire_date) {
            setErrorMessage("Ім'я, прізвище та дата прийому обов'язкові");
            return;
        }

        if (payload.salary < 0) {
            setErrorMessage('Зарплата не може бути від’ємною');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = employeeId ? `${API}/api/employees/${employeeId}` : `${API}/api/employees`;
            const method = employeeId ? 'PUT' : 'POST';

            const savedEmployee = await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterEmployeeMutation({
                employeeId: savedEmployee?.id ?? employeeId ?? null,
                reason: employeeId ? 'employee-updated' : 'employee-created',
                successMessage: employeeId ? 'Працівника оновлено' : 'Працівника додано'
            }).catch(() => {});
        } catch (error) {
            if (error?.status === 401) {
                onClose();
                handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                return;
            }
            failWithError(error, 'Помилка збереження');
        } finally {
            setIsSaving(false);
        }
    }

    const title = employeeId && isLoading
        ? 'Завантаження працівника...'
        : employeeId
            ? 'Редагувати працівника'
            : 'Додати працівника';

    const disableFields = isLoading || isSaving;

    return (
        <ModalFrame
            modalId="employeeModal"
            title={title}
            width="720px"
            isOpen={isOpen}
            onClose={() => {
                if (isSaving) return;
                onClose();
            }}
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose} type="button" disabled={isSaving}>
                        Скасувати
                    </button>
                    <button className="btn btn-primary" type="submit" form="employeeModalForm" disabled={disableFields}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="employeeModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empLastName">Прізвище *</label>
                        <input
                            id="empLastName"
                            type="text"
                            className="form-input"
                            placeholder="Коваленко"
                            value={form.lastName}
                            onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="empFirstName">Ім'я *</label>
                        <input
                            id="empFirstName"
                            type="text"
                            className="form-input"
                            placeholder="Олександр"
                            value={form.firstName}
                            onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empMiddleName">По батькові</label>
                        <input
                            id="empMiddleName"
                            type="text"
                            className="form-input"
                            placeholder="Миколайович"
                            value={form.middleName}
                            onChange={event => setForm(current => ({ ...current, middleName: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="empEmail">Email</label>
                        <input
                            id="empEmail"
                            type="email"
                            className="form-input"
                            placeholder="email@company.ua"
                            value={form.email}
                            onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empPhone">Телефон</label>
                        <input
                            id="empPhone"
                            type="text"
                            className="form-input"
                            placeholder="+380501234567"
                            value={form.phone}
                            onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="empBirthDate">Дата народження</label>
                        <input
                            id="empBirthDate"
                            type="date"
                            className="form-input"
                            value={form.birthDate}
                            onChange={event => setForm(current => ({ ...current, birthDate: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empDepartment">Відділ</label>
                        <select
                            id="empDepartment"
                            className="form-input"
                            value={form.departmentId}
                            onChange={event => setForm(current => ({ ...current, departmentId: event.target.value }))}
                            disabled={disableFields}
                        >
                            <option value="">— Оберіть відділ —</option>
                            {departments.map(department => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="empPosition">Посада</label>
                        <select
                            id="empPosition"
                            className="form-input"
                            value={form.positionId}
                            onChange={event => setForm(current => ({ ...current, positionId: event.target.value }))}
                            disabled={disableFields}
                        >
                            <option value="">— Оберіть посаду —</option>
                            {positions.map(position => (
                                <option key={position.id} value={position.id}>
                                    {position.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empSalary">Зарплата (₴)</label>
                        <input
                            id="empSalary"
                            type="number"
                            className="form-input"
                            placeholder="30000"
                            value={form.salary}
                            onChange={event => setForm(current => ({ ...current, salary: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="empHireDate">Дата прийому *</label>
                        <input
                            id="empHireDate"
                            type="date"
                            className="form-input"
                            value={form.hireDate}
                            onChange={event => setForm(current => ({ ...current, hireDate: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="empStatus">Статус</label>
                        <select
                            id="empStatus"
                            className="form-input"
                            value={form.status}
                            onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                            disabled={disableFields}
                        >
                            <option value="active">Активний</option>
                            <option value="on_leave">У відпустці</option>
                            <option value="fired">Звільнений</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="empAddress">Адреса</label>
                        <input
                            id="empAddress"
                            type="text"
                            className="form-input"
                            placeholder="м. Київ, вул. Хрещатик, 10"
                            value={form.address}
                            onChange={event => setForm(current => ({ ...current, address: event.target.value }))}
                            disabled={disableFields}
                        />
                    </div>
                </div>
            </form>
        </ModalFrame>
    );
}
