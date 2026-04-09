import { useEffect, useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import { nextDisplayOrder } from '../developmentOnboardingFormUtils.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

function createEmptyForm(goals = []) {
    return {
        icon: 'target',
        title: '',
        desc: '',
        status: 'in-progress',
        progress: '0',
        dueDate: '',
        displayOrder: String(nextDisplayOrder(goals))
    };
}

function mapGoalToForm(goal) {
    return {
        icon: goal?.icon || 'target',
        title: goal?.title || '',
        desc: goal?.desc || '',
        status: goal?.status || 'in-progress',
        progress: String(goal?.progress ?? 0),
        dueDate: goal?.dueDate || '',
        displayOrder: String(goal?.displayOrder ?? 0)
    };
}

export default function GoalModal({ isOpen, mode, goalId, currentUser, goals = [], onClose }) {
    const { afterDevelopmentOnboardingMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(() => createEmptyForm(goals));
    const [isSaving, setIsSaving] = useState(false);
    const {
        errorMessage,
        failWithError,
        resetAsyncStatus,
        setErrorMessage
    } = useAsyncStatus();

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (!isOpen) {
            setForm(createEmptyForm(goals));
            setIsSaving(false);
            resetAsyncStatus();
            return;
        }

        if (!isAdmin) {
            onClose();
            return;
        }

        if (mode === 'edit' && goalId) {
            const goal = goals.find(item => item.id === goalId);
            if (!goal) {
                setErrorMessage('Ціль не знайдено у поточних даних');
                return;
            }
            setForm(mapGoalToForm(goal));
            resetAsyncStatus();
            return;
        }

        setForm(createEmptyForm(goals));
        resetAsyncStatus();
    }, [goalId, goals, isAdmin, isOpen, mode, onClose, resetAsyncStatus, setErrorMessage]);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isSaving) return;

        const payload = {
            icon: form.icon.trim(),
            title: form.title.trim(),
            desc: form.desc.trim(),
            status: form.status,
            progress: Number(form.progress),
            due_date: form.dueDate || null,
            display_order: Number(form.displayOrder) || 0
        };

        if (!payload.icon || !payload.title || !payload.desc) {
            setErrorMessage('Заповніть обов’язкові поля цілі');
            return;
        }

        if (Number.isNaN(payload.progress) || payload.progress < 0 || payload.progress > 100) {
            setErrorMessage('Прогрес має бути в межах 0–100');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = goalId ? `${API}/api/development/goals/${goalId}` : `${API}/api/development/goals`;
            const method = goalId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterDevelopmentOnboardingMutation({
                successMessage: goalId ? 'Ціль оновлено' : 'Ціль створено'
            }).catch(() => {});
        } catch (error) {
            if (error?.status === 401) {
                onClose();
                handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                return;
            }
            failWithError(error, 'Помилка збереження цілі');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ModalFrame
            modalId="goalModal"
            title={goalId ? 'Редагувати ціль' : 'Додати ціль'}
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
                    <button className="btn btn-primary" type="submit" form="goalModalForm" disabled={isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="goalModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="goalIcon">Іконка *</label>
                        <input
                            id="goalIcon"
                            type="text"
                            className="form-input"
                            placeholder="target"
                            value={form.icon}
                            onChange={event => setForm(current => ({ ...current, icon: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="goalStatus">Статус *</label>
                        <select
                            id="goalStatus"
                            className="form-input"
                            value={form.status}
                            onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                            disabled={isSaving}
                        >
                            <option value="in-progress">В процесі</option>
                            <option value="on-track">За планом</option>
                            <option value="completed">Завершено</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="goalTitle">Назва *</label>
                    <input
                        id="goalTitle"
                        type="text"
                        className="form-input"
                        placeholder="Оновлення матриці компетенцій"
                        value={form.title}
                        onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="goalDesc">Опис *</label>
                    <textarea
                        id="goalDesc"
                        className="form-input"
                        rows="4"
                        placeholder="Короткий опис цілі"
                        value={form.desc}
                        onChange={event => setForm(current => ({ ...current, desc: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="goalProgress">Прогрес (%) *</label>
                        <input
                            id="goalProgress"
                            type="number"
                            min="0"
                            max="100"
                            className="form-input"
                            placeholder="60"
                            value={form.progress}
                            onChange={event => setForm(current => ({ ...current, progress: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="goalDueDate">Дедлайн</label>
                        <input
                            id="goalDueDate"
                            type="date"
                            className="form-input"
                            value={form.dueDate}
                            onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="goalDisplayOrder">Порядок відображення</label>
                    <input
                        id="goalDisplayOrder"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="1"
                        value={form.displayOrder}
                        onChange={event => setForm(current => ({ ...current, displayOrder: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
            </form>
        </ModalFrame>
    );
}
