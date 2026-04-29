import { ENDPOINTS } from '../app/endpoints.ts';
import { nextDisplayOrder, parseNonNegativeIntegerInput } from '../developmentOnboardingFormUtils.ts';
import createLocalEntityModal from './modalEngine/createLocalEntityModal.tsx';

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

const FIELD_SECTIONS = [
    {
        row: true,
        fields: [
            {
                id: 'taskIcon',
                name: 'icon',
                label: 'Іконка',
                required: true,
                type: 'text',
                placeholder: 'task_alt'
            },
            {
                id: 'taskStatus',
                name: 'status',
                label: 'Статус',
                required: true,
                type: 'select',
                options: [
                    { value: 'active', label: 'Активне' },
                    { value: 'pending', label: 'Очікує' },
                    { value: 'completed', label: 'Готово' }
                ]
            }
        ]
    },
    {
        fields: [
            {
                id: 'taskTitle',
                name: 'title',
                label: 'Назва',
                required: true,
                type: 'text',
                placeholder: 'Зустріч з наставником'
            }
        ]
    },
    {
        fields: [
            {
                id: 'taskDesc',
                name: 'desc',
                label: 'Опис',
                required: true,
                type: 'textarea',
                rows: 4,
                placeholder: 'Опис onboarding-задачі'
            }
        ]
    },
    {
        row: true,
        fields: [
            {
                id: 'taskDueDate',
                name: 'dueDate',
                label: 'Дедлайн',
                type: 'date'
            },
            {
                id: 'taskPriority',
                name: 'priority',
                label: 'Пріоритет',
                type: 'select',
                options: [
                    { value: 'false', label: 'Ні' },
                    { value: 'true', label: 'Так' }
                ]
            }
        ]
    },
    {
        fields: [
            {
                id: 'taskDisplayOrder',
                name: 'displayOrder',
                label: 'Порядок відображення',
                type: 'number',
                min: '0',
                placeholder: '1'
            }
        ]
    }
];

const TaskModalBase = createLocalEntityModal({
    actionName: 'afterDevelopmentOnboardingMutation',
    buildPayload: ({ form }) => ({
        icon: form.icon.trim(),
        status: form.status,
        title: form.title.trim(),
        desc: form.desc.trim(),
        due_date: form.dueDate || null,
        is_priority: form.priority === 'true',
        display_order: parseNonNegativeIntegerInput(form.displayOrder, { emptyValue: undefined })
    }),
    createEmptyForm,
    createEndpoint: ENDPOINTS.onboardingTasks,
    errorMessageFallback: 'Помилка збереження onboarding-задачі',
    formId: 'taskModalForm',
    mapEntityToForm: mapTaskToForm,
    modalId: 'taskModal',
    notFoundMessage: 'Задачу не знайдено у поточних даних',
    sections: FIELD_SECTIONS,
    successMessageCreate: 'Задачу створено',
    successMessageUpdate: 'Задачу оновлено',
    titleCreate: 'Додати onboarding-задачу',
    titleEdit: 'Редагувати onboarding-задачу',
    updateEndpoint: ENDPOINTS.onboardingTaskById,
    validatePayload: ({ payload }) => {
        if (!payload.icon || !payload.title || !payload.desc) {
            return 'Заповніть обов’язкові поля onboarding-задачі';
        }
        if (payload.display_order === null) {
            return 'Порядок відображення має бути цілим числом';
        }
        return null;
    }
});

export default function TaskModal({ isOpen, mode, taskId, currentUser, tasks = [], onClose }) {
    return (
        <TaskModalBase
            isOpen={isOpen}
            mode={mode}
            entityId={taskId}
            currentUser={currentUser}
            entities={tasks}
            onClose={onClose}
        />
    );
}
