import { useState } from 'react';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { parseIntegerInput } from '../developmentOnboardingFormUtils.js';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import EntityModalFrame from './modalEngine/EntityModalFrame.jsx';
import { fetchEmployeesForSelect } from './modalEngine/fetchEmployeesForSelect.js';
import { submitEntityMutation } from './modalEngine/submitEntityMutation.js';
import {
    appendOptionalText,
    buildComplaintSections,
    createEmptyComplaintForm,
    mapComplaintToForm
} from './complaintModalConfig.js';

export default function ComplaintModal({
    isOpen,
    mode = 'create',
    complaintId = null,
    currentUser,
    complaints = [],
    onClose,
}) {
    const { afterComplaintMutation, handleUnauthorized } = useAppActions();
    const [form, setForm] = useState(createEmptyComplaintForm);
    const [employees, setEmployees] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const {
        errorMessage,
        failWithError,
        finishLoading,
        isLoading,
        resetAsyncStatus,
        setErrorMessage,
        startLoading,
    } = useAsyncStatus();
    const isAdmin = currentUser?.role === 'admin';
    const isEditMode = mode === 'edit' && complaintId;

    useAbortableLoadEffect({
        enabled: Boolean(isOpen && currentUser),
        deps: [complaintId, complaints, currentUser, handleUnauthorized, isAdmin, isOpen, mode, onClose],
        onDisabled: () => {
            if (!isOpen) {
                setForm(createEmptyComplaintForm());
                setEmployees([]);
                setIsSaving(false);
                resetAsyncStatus();
                return;
            }

            if (!currentUser || (isEditMode && !isAdmin)) onClose();
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const items = await fetchEmployeesForSelect({ signal });
                if (signal.aborted) return;

                setEmployees(items);
                if (isEditMode) {
                    const complaint = complaints.find(item => item.id === complaintId);
                    if (complaint) setForm(mapComplaintToForm(complaint));
                    else setErrorMessage('Скаргу не знайдено у поточних даних');
                    return;
                }

                setForm(createEmptyComplaintForm());
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                failWithError(error, 'Помилка завантаження працівників');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    function buildPayload(employeeId) {
        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            severity: form.severity,
            complaint_date: form.complaintDate,
        };
        if (employeeId !== undefined) payload.employee_id = employeeId;
        appendOptionalText(payload, 'reporter_name', form.reporterName);

        if (isAdmin) {
            payload.status = form.status;
            appendOptionalText(payload, 'resolution_notes', form.resolutionNotes);
        }

        return payload;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!currentUser || isLoading || isSaving || (isEditMode && !isAdmin)) return;

        const rawEmployeeId = String(form.employeeId || '').trim();
        const employeeId = rawEmployeeId ? parseIntegerInput(rawEmployeeId) : undefined;
        if ((!rawEmployeeId && !isEditMode) || employeeId === null) {
            setErrorMessage('Працівник має бути обраний зі списку');
            return;
        }

        const payload = buildPayload(employeeId);
        if (!payload.title || !payload.description || !payload.complaint_date) {
            setErrorMessage('Працівник, тема, опис і дата скарги обов’язкові');
            return;
        }

        await submitEntityMutation({
            afterMutation: afterComplaintMutation,
            createEndpoint: ENDPOINTS.complaints,
            entityId: complaintId,
            errorMessageFallback: 'Помилка збереження скарги',
            failWithError,
            handleUnauthorized,
            onClose,
            payload,
            setErrorMessage,
            setIsSaving,
            successMessageCreate: 'Скаргу створено',
            successMessageUpdate: 'Скаргу оновлено',
            updateEndpoint: ENDPOINTS.complaintById
        });
    }

    const employeeOptions = [
        { value: '', label: '— Оберіть працівника —' },
        ...employees.map(employee => ({
            value: employee.id,
            label: `${employee.last_name} ${employee.first_name}`
        }))
    ];

    return (
        <EntityModalFrame
            modalId="complaintModal"
            title={isEditMode ? 'Редагувати скаргу' : 'Нова скарга'}
            size="standard"
            isOpen={isOpen}
            onClose={onClose}
            isSaving={isSaving}
            isLoading={isLoading}
            errorMessage={errorMessage}
            formId="complaintModalForm"
            onSubmit={handleSubmit}
            sections={buildComplaintSections(employeeOptions, isAdmin)}
            form={form}
            setForm={setForm}
            fieldsDisabled={isLoading || isSaving}
        />
    );
}
