import { useEffect, useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import { nextDisplayOrder } from '../developmentOnboardingFormUtils.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

function createEmptyForm(tasks = []) {
    return {
        icon: 'task_alt',
        status: 'active',
        title: '',
        desc: '',
        dueDate: '',
        priority: 'false',
        displayOrder: String(nextDisplayOrder(tasks))
    };
}

function mapTaskToForm(task) {
    return {
        icon: task?.icon || 'task_alt',
        status: task?.status || 'active',
        title: task?.title || '',
        desc: task?.desc || '',
        dueDate: task?.dueDate || '',
        priority: String(Boolean(task?.priority)),
        displayOrder: String(task?.displayOrder ?? 0)
    };
}

export default function TaskModal({ isOpen, mode, taskId, currentUser, tasks = [], onClose }) {
    const { afterDevelopmentOnboardingMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(() => createEmptyForm(tasks));
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
            setForm(createEmptyForm(tasks));
            setIsSaving(false);
            resetAsyncStatus();
            return;
        }

        if (!isAdmin) {
            onClose();
            return;
        }

        if (mode === 'edit' && taskId) {
            const task = tasks.find(item => item.id === taskId);
            if (!task) {
                setErrorMessage('Задачу не знайдено у поточних даних');
                return;
            }
            setForm(mapTaskToForm(task));
            resetAsyncStatus();
            return;
        }

        setForm(createEmptyForm(tasks));
        resetAsyncStatus();
    }, [isAdmin, isOpen, mode, onClose, resetAsyncStatus, setErrorMessage, taskId, tasks]);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isSaving) return;

        const payload = {
            icon: form.icon.trim(),
            status: form.status,
            title: form.title.trim(),
            desc: form.desc.trim(),
            due_date: form.dueDate || null,
            is_priority: form.priority === 'true',
            display_order: Number(form.displayOrder) || 0
        };

        if (!payload.icon || !payload.title || !payload.desc) {
            setErrorMessage('Заповніть обов’язкові поля onboarding-задачі');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = taskId ? `${API}/api/onboarding/tasks/${taskId}` : `${API}/api/onboarding/tasks`;
            const method = taskId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterDevelopmentOnboardingMutation({
                successMessage: taskId ? 'Задачу оновлено' : 'Задачу створено'
            }).catch(() => {});
        } catch (error) {
            if (error?.status === 401) {
                onClose();
                handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                return;
            }
            failWithError(error, 'Помилка збереження onboarding-задачі');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ModalFrame
            modalId="taskModal"
            title={taskId ? 'Редагувати onboarding-задачу' : 'Додати onboarding-задачу'}
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
                    <button className="btn btn-primary" type="submit" form="taskModalForm" disabled={isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="taskModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="taskIcon">Іконка *</label>
                        <input
                            id="taskIcon"
                            type="text"
                            className="form-input"
                            placeholder="task_alt"
                            value={form.icon}
                            onChange={event => setForm(current => ({ ...current, icon: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskStatus">Статус *</label>
                        <select
                            id="taskStatus"
                            className="form-input"
                            value={form.status}
                            onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                            disabled={isSaving}
                        >
                            <option value="active">Активне</option>
                            <option value="pending">Очікує</option>
                            <option value="completed">Готово</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="taskTitle">Назва *</label>
                    <input
                        id="taskTitle"
                        type="text"
                        className="form-input"
                        placeholder="Зустріч з наставником"
                        value={form.title}
                        onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="taskDesc">Опис *</label>
                    <textarea
                        id="taskDesc"
                        className="form-input"
                        rows="4"
                        placeholder="Опис onboarding-задачі"
                        value={form.desc}
                        onChange={event => setForm(current => ({ ...current, desc: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="taskDueDate">Дедлайн</label>
                        <input
                            id="taskDueDate"
                            type="date"
                            className="form-input"
                            value={form.dueDate}
                            onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskPriority">Пріоритет</label>
                        <select
                            id="taskPriority"
                            className="form-input"
                            value={form.priority}
                            onChange={event => setForm(current => ({ ...current, priority: event.target.value }))}
                            disabled={isSaving}
                        >
                            <option value="false">Ні</option>
                            <option value="true">Так</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="taskDisplayOrder">Порядок відображення</label>
                    <input
                        id="taskDisplayOrder"
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
