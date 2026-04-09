import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

const EMPTY_FORM = {
    title: '',
    minSalary: '',
    maxSalary: '',
    description: ''
};

function mapPositionToForm(position) {
    return {
        title: position?.title || '',
        minSalary: position?.min_salary != null ? String(position.min_salary) : '',
        maxSalary: position?.max_salary != null ? String(position.max_salary) : '',
        description: position?.description || ''
    };
}

export default function PositionModal({
    isOpen,
    mode,
    positionId,
    currentUser,
    onClose
}) {
    const { afterPositionMutation, handleUnauthorized } = useAppActions();
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
        enabled: Boolean(isOpen && isAdmin && mode === 'edit' && positionId),
        deps: [isAdmin, isOpen, mode, onClose, positionId, handleUnauthorized],
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

            if (mode !== 'edit' || !positionId) {
                setForm(EMPTY_FORM);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const position = await fetchJSON(`${API}/api/positions/${positionId}`, {
                    signal
                });
                if (!signal.aborted) {
                    setForm(mapPositionToForm(position));
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження посади');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isLoading || isSaving) return;

        const minSalary = Number.parseFloat(form.minSalary || '0') || 0;
        const maxSalary = Number.parseFloat(form.maxSalary || '0') || 0;
        const payload = {
            title: form.title.trim(),
            min_salary: minSalary,
            max_salary: maxSalary,
            description: form.description.trim()
        };

        if (!payload.title) {
            setErrorMessage('Назва обов’язкова');
            return;
        }
        if (payload.min_salary < 0 || payload.max_salary < 0) {
            setErrorMessage('Зарплатні межі не можуть бути від’ємними');
            return;
        }
        if (payload.max_salary < payload.min_salary) {
            setErrorMessage('Максимальна зарплата не може бути меншою за мінімальну');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = positionId ? `${API}/api/positions/${positionId}` : `${API}/api/positions`;
            const method = positionId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterPositionMutation({
                reason: positionId ? 'position-updated' : 'position-created',
                successMessage: positionId ? 'Посаду оновлено' : 'Посаду створено'
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
        ? 'Завантаження посади...'
        : positionId
            ? 'Редагувати посаду'
            : 'Додати посаду';

    return (
        <ModalFrame
            modalId="posModal"
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
                    <button className="btn btn-primary" type="submit" form="positionModalForm" disabled={isLoading || isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="positionModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-group">
                    <label htmlFor="posTitle">Назва посади *</label>
                    <input
                        id="posTitle"
                        type="text"
                        className="form-input"
                        placeholder="Senior Developer"
                        value={form.title}
                        onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="posMinSalary">Мін. зарплата (₴)</label>
                        <input
                            id="posMinSalary"
                            type="number"
                            className="form-input"
                            placeholder="20000"
                            value={form.minSalary}
                            onChange={event => setForm(current => ({ ...current, minSalary: event.target.value }))}
                            disabled={isLoading || isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="posMaxSalary">Макс. зарплата (₴)</label>
                        <input
                            id="posMaxSalary"
                            type="number"
                            className="form-input"
                            placeholder="50000"
                            value={form.maxSalary}
                            onChange={event => setForm(current => ({ ...current, maxSalary: event.target.value }))}
                            disabled={isLoading || isSaving}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="posDesc">Опис</label>
                    <input
                        id="posDesc"
                        type="text"
                        className="form-input"
                        placeholder="Опис посади"
                        value={form.description}
                        onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
            </form>
        </ModalFrame>
    );
}
