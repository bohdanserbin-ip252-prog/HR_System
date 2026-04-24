import { ENDPOINTS } from '../app/endpoints.js';
import {
    getTodayInputValue,
    nextDisplayOrder,
    parseNonNegativeIntegerInput
} from '../developmentOnboardingFormUtils.js';
import createLocalEntityModal from './modalEngine/createLocalEntityModal.jsx';

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

const FIELD_SECTIONS = [
    {
        row: true,
        fields: [
            {
                id: 'meetingDate',
                name: 'date',
                label: 'Дата',
                required: true,
                type: 'date'
            },
            {
                id: 'meetingType',
                name: 'type',
                label: 'Тип',
                required: true,
                type: 'text',
                placeholder: 'Офіс'
            }
        ]
    },
    {
        fields: [
            {
                id: 'meetingTitle',
                name: 'title',
                label: 'Назва',
                required: true,
                type: 'text',
                placeholder: 'Щотижнева 1:1 зустріч'
            }
        ]
    },
    {
        fields: [
            {
                id: 'meetingDisplayOrder',
                name: 'displayOrder',
                label: 'Порядок відображення',
                type: 'number',
                min: '0',
                placeholder: '1'
            }
        ]
    }
];

const MeetingModalBase = createLocalEntityModal({
    actionName: 'afterDevelopmentOnboardingMutation',
    buildPayload: ({ form }) => ({
        date: form.date,
        title: form.title.trim(),
        meeting_type: form.type.trim(),
        display_order: parseNonNegativeIntegerInput(form.displayOrder, { emptyValue: undefined })
    }),
    createEmptyForm,
    createEndpoint: ENDPOINTS.developmentMeetings,
    errorMessageFallback: 'Помилка збереження зустрічі',
    formId: 'meetingModalForm',
    mapEntityToForm: mapMeetingToForm,
    modalId: 'meetingModal',
    notFoundMessage: 'Зустріч не знайдено у поточних даних',
    sections: FIELD_SECTIONS,
    successMessageCreate: 'Зустріч створено',
    successMessageUpdate: 'Зустріч оновлено',
    titleCreate: 'Додати зустріч',
    titleEdit: 'Редагувати зустріч',
    updateEndpoint: ENDPOINTS.developmentMeetingById,
    validatePayload: ({ payload }) => {
        if (!payload.date || !payload.title || !payload.meeting_type) {
            return 'Заповніть обов’язкові поля зустрічі';
        }
        if (payload.display_order === null) {
            return 'Порядок відображення має бути цілим числом';
        }
        return null;
    }
});

export default function MeetingModal({ isOpen, mode, meetingId, currentUser, meetings = [], onClose }) {
    return (
        <MeetingModalBase
            isOpen={isOpen}
            mode={mode}
            entityId={meetingId}
            currentUser={currentUser}
            entities={meetings}
            onClose={onClose}
        />
    );
}
