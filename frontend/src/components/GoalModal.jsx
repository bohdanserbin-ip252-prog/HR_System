import { ENDPOINTS } from '../app/endpoints.js';
import { nextDisplayOrder, parseFiniteNumberInput, parseNonNegativeIntegerInput } from '../developmentOnboardingFormUtils.js';
import createLocalEntityModal from './modalEngine/createLocalEntityModal.jsx';

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

const FIELD_SECTIONS = [
    {
        row: true,
        fields: [
            {
                id: 'goalIcon',
                name: 'icon',
                label: 'Іконка',
                required: true,
                type: 'text',
                placeholder: 'target'
            },
            {
                id: 'goalStatus',
                name: 'status',
                label: 'Статус',
                required: true,
                type: 'select',
                options: [
                    { value: 'in-progress', label: 'В процесі' },
                    { value: 'on-track', label: 'За планом' },
                    { value: 'completed', label: 'Завершено' }
                ]
            }
        ]
    },
    {
        fields: [
            {
                id: 'goalTitle',
                name: 'title',
                label: 'Назва',
                required: true,
                type: 'text',
                placeholder: 'Оновлення матриці компетенцій'
            }
        ]
    },
    {
        fields: [
            {
                id: 'goalDesc',
                name: 'desc',
                label: 'Опис',
                required: true,
                type: 'textarea',
                rows: 4,
                placeholder: 'Короткий опис цілі'
            }
        ]
    },
    {
        row: true,
        fields: [
            {
                id: 'goalProgress',
                name: 'progress',
                label: 'Прогрес (%)',
                required: true,
                type: 'number',
                min: '0',
                max: '100',
                placeholder: '60'
            },
            {
                id: 'goalDueDate',
                name: 'dueDate',
                label: 'Дедлайн',
                type: 'date'
            }
        ]
    },
    {
        fields: [
            {
                id: 'goalDisplayOrder',
                name: 'displayOrder',
                label: 'Порядок відображення',
                type: 'number',
                min: '0',
                placeholder: '1'
            }
        ]
    }
];

const GoalModalBase = createLocalEntityModal({
    actionName: 'afterDevelopmentOnboardingMutation',
    buildPayload: ({ form }) => ({
        icon: form.icon.trim(),
        title: form.title.trim(),
        desc: form.desc.trim(),
        status: form.status,
        progress: parseFiniteNumberInput(form.progress, { emptyValue: 0 }),
        due_date: form.dueDate || null,
        display_order: parseNonNegativeIntegerInput(form.displayOrder, { emptyValue: undefined })
    }),
    createEmptyForm,
    createEndpoint: ENDPOINTS.developmentGoals,
    errorMessageFallback: 'Помилка збереження цілі',
    formId: 'goalModalForm',
    mapEntityToForm: mapGoalToForm,
    modalId: 'goalModal',
    notFoundMessage: 'Ціль не знайдено у поточних даних',
    sections: FIELD_SECTIONS,
    successMessageCreate: 'Ціль створено',
    successMessageUpdate: 'Ціль оновлено',
    titleCreate: 'Додати ціль',
    titleEdit: 'Редагувати ціль',
    updateEndpoint: ENDPOINTS.developmentGoalById,
    validatePayload: ({ payload }) => {
        if (!payload.icon || !payload.title || !payload.desc) {
            return 'Заповніть обов’язкові поля цілі';
        }
        if (payload.progress === null || payload.progress < 0 || payload.progress > 100) {
            return 'Прогрес має бути в межах 0–100';
        }
        if (payload.display_order === null) {
            return 'Порядок відображення має бути цілим числом';
        }
        return null;
    }
});

export default function GoalModal({ isOpen, mode, goalId, currentUser, goals = [], onClose }) {
    return (
        <GoalModalBase
            isOpen={isOpen}
            mode={mode}
            entityId={goalId}
            currentUser={currentUser}
            entities={goals}
            onClose={onClose}
        />
    );
}
