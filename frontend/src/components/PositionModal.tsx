import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { parseFiniteNumberInput } from '../developmentOnboardingFormUtils.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import EntityModalFrame from './modalEngine/EntityModalFrame.tsx';
import { submitEntityMutation } from './modalEngine/submitEntityMutation.ts';
import useRemoteEntityModalForm from './modalEngine/useRemoteEntityModalForm.ts';

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

const FIELD_SECTIONS = [
    {
        fields: [
            {
                id: 'posTitle',
                name: 'title',
                label: 'Назва посади',
                required: true,
                type: 'text',
                placeholder: 'Senior Developer'
            }
        ]
    },
    {
        row: true,
        fields: [
            {
                id: 'posMinSalary',
                name: 'minSalary',
                label: 'Мін. зарплата (₴)',
                type: 'number',
                placeholder: '20000'
            },
            {
                id: 'posMaxSalary',
                name: 'maxSalary',
                label: 'Макс. зарплата (₴)',
                type: 'number',
                placeholder: '50000'
            }
        ]
    },
    {
        fields: [
            {
                id: 'posDesc',
                name: 'description',
                label: 'Опис',
                type: 'text',
                placeholder: 'Опис посади'
            }
        ]
    }
];

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

    useRemoteEntityModalForm({
        deps: [],
        emptyForm: EMPTY_FORM,
        entityId: positionId,
        errorMessageOnLoad: 'Помилка завантаження посади',
        failWithError,
        finishLoading,
        handleUnauthorized,
        isAdmin,
        isOpen,
        loadEntity: ({ entityId, signal }) => fetchJSON(ENDPOINTS.positionById(entityId), { signal }),
        mapEntityToForm: mapPositionToForm,
        mode,
        onClose,
        resetAsyncStatus,
        setForm,
        setIsSaving,
        startLoading
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin || isLoading || isSaving) return;

        const minSalary = parseFiniteNumberInput(form.minSalary, { emptyValue: 0 });
        const maxSalary = parseFiniteNumberInput(form.maxSalary, { emptyValue: 0 });
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
        if (payload.min_salary === null || payload.max_salary === null) {
            setErrorMessage('Зарплатні межі мають бути числами');
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

        await submitEntityMutation({
            afterMutation: async ({ successMessage }) => afterPositionMutation({
                reason: positionId ? 'position-updated' : 'position-created',
                successMessage
            }),
            createEndpoint: ENDPOINTS.positions,
            entityId: positionId,
            errorMessageFallback: 'Помилка збереження',
            failWithError,
            handleUnauthorized,
            onClose,
            payload,
            setErrorMessage,
            setIsSaving,
            successMessageCreate: 'Посаду створено',
            successMessageUpdate: 'Посаду оновлено',
            updateEndpoint: ENDPOINTS.positionById
        });
    }

    const title = isLoading
        ? 'Завантаження посади...'
        : positionId
            ? 'Редагувати посаду'
            : 'Додати посаду';

    return (
        <EntityModalFrame
            modalId="posModal"
            title={title}
            size="compact"
            isOpen={isOpen}
            onClose={onClose}
            isSaving={isSaving}
            isLoading={isLoading}
            errorMessage={errorMessage}
            formId="positionModalForm"
            onSubmit={handleSubmit}
            sections={FIELD_SECTIONS}
            form={form}
            setForm={setForm}
            fieldsDisabled={isLoading || isSaving}
        />
    );
}
