import { useState } from 'react';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import {
    getTodayInputValue,
    nextDisplayOrder,
    parseIntegerInput,
    parseNonNegativeIntegerInput
} from '../developmentOnboardingFormUtils.js';
import EntityModalFrame from './modalEngine/EntityModalFrame.jsx';
import { fetchEmployeesForSelect } from './modalEngine/fetchEmployeesForSelect.js';
import { submitEntityMutation } from './modalEngine/submitEntityMutation.js';

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

function buildSections(employeeOptions) {
    return [
        {
            row: true,
            fields: [
                {
                    id: 'feedbackEmployeeId',
                    name: 'employeeId',
                    label: 'Автор',
                    type: 'select',
                    options: employeeOptions
                },
                {
                    id: 'feedbackDate',
                    name: 'feedbackAt',
                    label: 'Дата',
                    required: true,
                    type: 'date'
                }
            ]
        },
        {
            fields: [
                {
                    id: 'feedbackText',
                    name: 'text',
                    label: 'Текст відгуку',
                    required: true,
                    type: 'textarea',
                    rows: 4,
                    placeholder: "Текст зворотного зв'язку"
                }
            ]
        },
        {
            fields: [
                {
                    id: 'feedbackDisplayOrder',
                    name: 'displayOrder',
                    label: 'Порядок відображення',
                    type: 'number',
                    min: '0',
                    placeholder: '1'
                }
            ]
        }
    ];
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
                const items = await fetchEmployeesForSelect({
                    signal
                });
                if (signal.aborted) return;

                const nextEmployees = items.map(employee => ({
                    ...employee,
                    full_name: `${employee.last_name} ${employee.first_name}`
                }));
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

        const employeeId = parseIntegerInput(form.employeeId);
        const displayOrder = parseNonNegativeIntegerInput(form.displayOrder, { emptyValue: undefined });
        const payload = {
            employee_id: employeeId,
            feedback_at: form.feedbackAt,
            text: form.text.trim(),
            display_order: displayOrder
        };

        if (!payload.feedback_at || !payload.text) {
            setErrorMessage('Дата і текст відгуку обов’язкові');
            return;
        }

        if (payload.employee_id === null && form.employeeId) {
            setErrorMessage('Працівник має бути обраний зі списку');
            return;
        }

        if (payload.display_order === null) {
            setErrorMessage('Порядок відображення має бути цілим числом');
            return;
        }

        await submitEntityMutation({
            afterMutation: afterDevelopmentOnboardingMutation,
            createEndpoint: ENDPOINTS.developmentFeedback,
            entityId: feedbackId,
            errorMessageFallback: 'Помилка збереження відгуку',
            failWithError,
            handleUnauthorized,
            onClose,
            payload,
            setErrorMessage,
            setIsSaving,
            successMessageCreate: 'Відгук створено',
            successMessageUpdate: 'Відгук оновлено',
            updateEndpoint: ENDPOINTS.developmentFeedbackById
        });
    }

    const employeeOptions = [
        { value: '', label: '— Автор не вказаний —' },
        ...employees.map(employee => ({
            value: employee.id,
            label: employee.full_name
        }))
    ];

    return (
        <EntityModalFrame
            modalId="feedbackModal"
            title={feedbackId ? 'Редагувати відгук' : 'Додати відгук'}
            size="standard"
            isOpen={isOpen}
            onClose={onClose}
            isSaving={isSaving}
            isLoading={isLoading}
            errorMessage={errorMessage}
            formId="feedbackModalForm"
            onSubmit={handleSubmit}
            sections={buildSections(employeeOptions)}
            form={form}
            setForm={setForm}
            fieldsDisabled={isLoading || isSaving}
        />
    );
}
