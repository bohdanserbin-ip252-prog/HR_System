import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import {
    getTodayInputValue,
    nextDisplayOrder
} from '../developmentOnboardingFormUtils.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

function createEmptyForm(feedback = []) {
    return {
        employeeId: '',
        feedbackAt: getTodayInputValue(),
        text: '',
        displayOrder: String(nextDisplayOrder(feedback))
    };
}

function mapFeedbackToForm(feedback) {
    return {
        employeeId: feedback?.employee?.id ? String(feedback.employee.id) : '',
        feedbackAt: feedback?.feedbackAt || getTodayInputValue(),
        text: feedback?.text || '',
        displayOrder: String(feedback?.displayOrder ?? 0)
    };
}

export default function FeedbackModal({ isOpen, mode, feedbackId, currentUser, feedback = [], onClose }) {
    const { afterDevelopmentOnboardingMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(() => createEmptyForm(feedback));
    const [employees, setEmployees] = useState([]);
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
        deps: [feedback, feedbackId, handleUnauthorized, isAdmin, isOpen, mode, onClose],
        onDisabled: () => {
            if (!isOpen) {
                setForm(createEmptyForm(feedback));
                setEmployees([]);
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

            try {
                const items = await fetchJSON(`${API}/api/employees?sort_by=last_name&sort_dir=asc`, {
                    signal
                });
                if (signal.aborted) return;

                const nextEmployees = Array.isArray(items)
                    ? items.map(employee => ({
                        ...employee,
                        full_name: `${employee.last_name} ${employee.first_name}`
                    }))
                    : [];
                setEmployees(nextEmployees);

                if (mode === 'edit' && feedbackId) {
                    const currentFeedback = feedback.find(item => item.id === feedbackId);
                    if (currentFeedback) setForm(mapFeedbackToForm(currentFeedback));
                    else setErrorMessage('Відгук не знайдено у поточних даних');
                    return;
                }

                setForm(createEmptyForm(feedback));
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження авторів відгуку');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isLoading || isSaving) return;

        const payload = {
            employee_id: form.employeeId || null,
            feedback_at: form.feedbackAt,
            text: form.text.trim(),
            display_order: Number(form.displayOrder) || 0
        };

        if (!payload.feedback_at || !payload.text) {
            setErrorMessage('Дата і текст відгуку обов’язкові');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = feedbackId ? `${API}/api/development/feedback/${feedbackId}` : `${API}/api/development/feedback`;
            const method = feedbackId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterDevelopmentOnboardingMutation({
                successMessage: feedbackId ? 'Відгук оновлено' : 'Відгук створено'
            }).catch(() => {});
        } catch (error) {
            if (error?.status === 401) {
                onClose();
                handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                return;
            }
            failWithError(error, 'Помилка збереження відгуку');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ModalFrame
            modalId="feedbackModal"
            title={feedbackId ? 'Редагувати відгук' : 'Додати відгук'}
            width="560px"
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
                    <button className="btn btn-primary" type="submit" form="feedbackModalForm" disabled={isLoading || isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="feedbackModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="feedbackEmployeeId">Автор</label>
                        <select
                            id="feedbackEmployeeId"
                            className="form-input"
                            value={form.employeeId}
                            onChange={event => setForm(current => ({ ...current, employeeId: event.target.value }))}
                            disabled={isLoading || isSaving}
                        >
                            <option value="">— Автор не вказаний —</option>
                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.full_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="feedbackDate">Дата *</label>
                        <input
                            id="feedbackDate"
                            type="date"
                            className="form-input"
                            value={form.feedbackAt}
                            onChange={event => setForm(current => ({ ...current, feedbackAt: event.target.value }))}
                            disabled={isLoading || isSaving}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="feedbackText">Текст відгуку *</label>
                    <textarea
                        id="feedbackText"
                        className="form-input"
                        rows="4"
                        placeholder="Текст зворотного зв'язку"
                        value={form.text}
                        onChange={event => setForm(current => ({ ...current, text: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="feedbackDisplayOrder">Порядок відображення</label>
                    <input
                        id="feedbackDisplayOrder"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="1"
                        value={form.displayOrder}
                        onChange={event => setForm(current => ({ ...current, displayOrder: event.target.value }))}
                        disabled={isLoading || isSaving}
                    />
                </div>
            </form>
        </ModalFrame>
    );
}
