import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

const EMPTY_FORM = {
    name: '',
    headName: '',
    description: ''
};

function mapDepartmentToForm(department) {
    return {
        name: department?.name || '',
        headName: department?.head_name || '',
        description: department?.description || ''
    };
}

export default function DepartmentModal({
    isOpen,
    mode,
    departmentId,
    currentUser,
    onClose
}) {
    const { afterDepartmentMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(EMPTY_FORM);
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
        enabled: Boolean(isOpen && isAdmin && mode === 'edit' && departmentId),
        deps: [departmentId, isAdmin, isOpen, mode, onClose, handleUnauthorized],
        onDisabled: () => {
            if (!isOpen) {
                setForm(EMPTY_FORM);
                setIsSaving(false);
                resetAsyncStatus();
                return;
            }

            if (!isAdmin) {
                onClose();
                return;
            }

            if (mode !== 'edit' || !departmentId) {
                setForm(EMPTY_FORM);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const department = await fetchJSON(`${API}/api/departments/${departmentId}`, {
                    signal
                });
                if (!signal.aborted) {
                    setForm(mapDepartmentToForm(department));
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження відділу');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isLoading || isSaving) return;

        const payload = {
            name: form.name.trim(),
            head_name: form.headName.trim(),
            description: form.description.trim()
        };

        if (!payload.name) {
            setErrorMessage('Назва обов’язкова');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = departmentId ? `${API}/api/departments/${departmentId}` : `${API}/api/departments`;
            const method = departmentId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterDepartmentMutation({
                reason: departmentId ? 'department-updated' : 'department-created',
                successMessage: departmentId ? 'Відділ оновлено' : 'Відділ створено'
            }).catch(() => {});
            return;
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

    const title = isLoading
        ? 'Завантаження відділу...'
        : departmentId
            ? 'Редагувати відділ'
            : 'Додати відділ';

    return (
        <ModalFrame
            modalId="deptModal"
            title={title}
            width="480px"
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
                    <button className="btn btn-primary" type="submit" form="departmentModalForm" disabled={isLoading || isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="departmentModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-group">
                    <label htmlFor="deptName">Назва відділу *</label>
                    <input
                        id="deptName"
                        type="text"
                        className="form-input"
                        placeholder="IT-відділ"
                        value={form.name}
                        onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="deptHead">Керівник</label>
                    <input
                        id="deptHead"
                        type="text"
                        className="form-input"
                        placeholder="Прізвище І.Б."
                        value={form.headName}
                        onChange={event => setForm(current => ({ ...current, headName: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="deptDesc">Опис</label>
                    <input
                        id="deptDesc"
                        type="text"
                        className="form-input"
                        placeholder="Опис відділу"
                        value={form.description}
                        onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
            </form>
        </ModalFrame>
    );
}
