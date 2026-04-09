import { useEffect, useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import {
    getTodayInputValue,
    nextDisplayOrder
} from '../developmentOnboardingFormUtils.js';
import ModalFrame from './ModalFrame.jsx';
import FormErrorMessage from './FormErrorMessage.jsx';

function createEmptyForm(meetings = []) {
    return {
        date: getTodayInputValue(),
        title: '',
        type: '',
        displayOrder: String(nextDisplayOrder(meetings))
    };
}

function mapMeetingToForm(meeting) {
    return {
        date: meeting?.date || getTodayInputValue(),
        title: meeting?.title || '',
        type: meeting?.type || '',
        displayOrder: String(meeting?.displayOrder ?? 0)
    };
}

export default function MeetingModal({ isOpen, mode, meetingId, currentUser, meetings = [], onClose }) {
    const { afterDevelopmentOnboardingMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(() => createEmptyForm(meetings));
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
            setForm(createEmptyForm(meetings));
            setIsSaving(false);
            resetAsyncStatus();
            return;
        }

        if (!isAdmin) {
            onClose();
            return;
        }

        if (mode === 'edit' && meetingId) {
            const meeting = meetings.find(item => item.id === meetingId);
            if (!meeting) {
                setErrorMessage('Зустріч не знайдено у поточних даних');
                return;
            }
            setForm(mapMeetingToForm(meeting));
            resetAsyncStatus();
            return;
        }

        setForm(createEmptyForm(meetings));
        resetAsyncStatus();
    }, [isAdmin, isOpen, meetingId, meetings, mode, onClose, resetAsyncStatus, setErrorMessage]);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isSaving) return;

        const payload = {
            date: form.date,
            title: form.title.trim(),
            meeting_type: form.type.trim(),
            display_order: Number(form.displayOrder) || 0
        };

        if (!payload.date || !payload.title || !payload.meeting_type) {
            setErrorMessage('Заповніть обов’язкові поля зустрічі');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const url = meetingId ? `${API}/api/development/meetings/${meetingId}` : `${API}/api/development/meetings`;
            const method = meetingId ? 'PUT' : 'POST';

            await fetchJSON(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onClose();
            await afterDevelopmentOnboardingMutation({
                successMessage: meetingId ? 'Зустріч оновлено' : 'Зустріч створено'
            }).catch(() => {});
        } catch (error) {
            if (error?.status === 401) {
                onClose();
                handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                return;
            }
            failWithError(error, 'Помилка збереження зустрічі');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ModalFrame
            modalId="meetingModal"
            title={meetingId ? 'Редагувати зустріч' : 'Додати зустріч'}
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
                    <button className="btn btn-primary" type="submit" form="meetingModalForm" disabled={isSaving}>
                        {isSaving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </>
            )}
        >
            <form id="meetingModalForm" onSubmit={handleSubmit}>
                <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="meetingDate">Дата *</label>
                        <input
                            id="meetingDate"
                            type="date"
                            className="form-input"
                            value={form.date}
                            onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="meetingType">Тип *</label>
                        <input
                            id="meetingType"
                            type="text"
                            className="form-input"
                            placeholder="Офіс"
                            value={form.type}
                            onChange={event => setForm(current => ({ ...current, type: event.target.value }))}
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="meetingTitle">Назва *</label>
                    <input
                        id="meetingTitle"
                        type="text"
                        className="form-input"
                        placeholder="Щотижнева 1:1 зустріч"
                        value={form.title}
                        onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                        disabled={isSaving}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="meetingDisplayOrder">Порядок відображення</label>
                    <input
                        id="meetingDisplayOrder"
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
