import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import EntityModalFrame from './modalEngine/EntityModalFrame.tsx';
import { submitEntityMutation } from './modalEngine/submitEntityMutation.ts';
import useRemoteEntityModalForm from './modalEngine/useRemoteEntityModalForm.ts';

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

const FIELD_SECTIONS = [
    {
        fields: [
            {
                id: 'deptName',
                name: 'name',
                label: 'Назва відділу',
                required: true,
                type: 'text',
                placeholder: 'IT-відділ'
            }
        ]
    },
    {
        fields: [
            {
                id: 'deptHead',
                name: 'headName',
                label: 'Керівник',
                type: 'text',
                placeholder: 'Прізвище І.Б.'
            }
        ]
    },
    {
        fields: [
            {
                id: 'deptDesc',
                name: 'description',
                label: 'Опис',
                type: 'text',
                placeholder: 'Опис відділу'
            }
        ]
    }
];

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

    useRemoteEntityModalForm({
        deps: [],
        emptyForm: EMPTY_FORM,
        entityId: departmentId,
        errorMessageOnLoad: 'Помилка завантаження відділу',
        failWithError,
        finishLoading,
        handleUnauthorized,
        isAdmin,
        isOpen,
        loadEntity: ({ entityId, signal }) => fetchJSON(ENDPOINTS.departmentById(entityId), { signal }),
        mapEntityToForm: mapDepartmentToForm,
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

        const payload = {
            name: form.name.trim(),
            head_name: form.headName.trim(),
            description: form.description.trim()
        };

        if (!payload.name) {
            setErrorMessage('Назва обов’язкова');
            return;
        }

        await submitEntityMutation({
            afterMutation: async ({ successMessage }) => afterDepartmentMutation({
                reason: departmentId ? 'department-updated' : 'department-created',
                successMessage
            }),
            createEndpoint: ENDPOINTS.departments,
            entityId: departmentId,
            errorMessageFallback: 'Помилка збереження',
            failWithError,
            handleUnauthorized,
            onClose,
            payload,
            setErrorMessage,
            setIsSaving,
            successMessageCreate: 'Відділ створено',
            successMessageUpdate: 'Відділ оновлено',
            updateEndpoint: ENDPOINTS.departmentById
        });
    }

    const title = isLoading
        ? 'Завантаження відділу...'
        : departmentId
            ? 'Редагувати відділ'
            : 'Додати відділ';

    return (
        <EntityModalFrame
            modalId="deptModal"
            title={title}
            size="compact"
            isOpen={isOpen}
            onClose={onClose}
            isSaving={isSaving}
            isLoading={isLoading}
            errorMessage={errorMessage}
            formId="departmentModalForm"
            onSubmit={handleSubmit}
            sections={FIELD_SECTIONS}
            form={form}
            setForm={setForm}
            fieldsDisabled={isLoading || isSaving}
        />
    );
}
