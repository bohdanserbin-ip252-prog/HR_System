import { getTodayInputValue } from '../developmentOnboardingFormUtils.ts';

export const SEVERITY_OPTIONS = [['low', 'Низька'], ['medium', 'Середня'], ['high', 'Висока'], ['critical', 'Критична']];
export const STATUS_OPTIONS = [['open', 'Відкрита'], ['in_review', 'В роботі'], ['resolved', 'Вирішена'], ['rejected', 'Відхилена']];

export function createEmptyComplaintForm() {
    return {
        employeeId: '',
        reporterName: '',
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        complaintDate: getTodayInputValue(),
        resolutionNotes: ''
    };
}

function employeeIdFromComplaint(complaint) {
    return complaint?.employee?.id ? String(complaint.employee.id) : '';
}

export function mapComplaintToForm(complaint) {
    return {
        employeeId: employeeIdFromComplaint(complaint),
        reporterName: complaint?.reporterName || '',
        title: complaint?.title || '',
        description: complaint?.description || '',
        severity: complaint?.severity || 'medium',
        status: complaint?.status || 'open',
        complaintDate: complaint?.complaintDate || getTodayInputValue(),
        resolutionNotes: complaint?.resolutionNotes || ''
    };
}

export function appendOptionalText(payload, key, value) {
    const trimmed = String(value || '').trim();
    if (trimmed) payload[key] = trimmed;
}

export function buildComplaintSections(employeeOptions, isAdmin) {
    const sections = [
        {
            row: true,
            fields: [
                {
                    id: 'complaintEmployeeId',
                    name: 'employeeId',
                    label: 'Працівник',
                    required: true,
                    type: 'select',
                    options: employeeOptions
                },
                {
                    id: 'complaintDate',
                    name: 'complaintDate',
                    label: 'Дата скарги',
                    required: true,
                    type: 'date'
                }
            ]
        },
        {
            row: true,
            fields: [
                {
                    id: 'complaintSeverity',
                    name: 'severity',
                    label: 'Серйозність',
                    required: true,
                    type: 'select',
                    options: SEVERITY_OPTIONS
                },
                {
                    id: 'complaintReporter',
                    name: 'reporterName',
                    label: 'Заявник',
                    type: 'text'
                }
            ]
        },
        {
            fields: [
                {
                    id: 'complaintTitle',
                    name: 'title',
                    label: 'Тема',
                    required: true,
                    type: 'text'
                }
            ]
        },
        {
            fields: [
                {
                    id: 'complaintDescription',
                    name: 'description',
                    label: 'Опис',
                    required: true,
                    type: 'textarea',
                    rows: 4
                }
            ]
        }
    ];

    if (isAdmin) {
        sections.push({
            row: true,
            fields: [
                {
                    id: 'complaintStatus',
                    name: 'status',
                    label: 'Статус',
                    required: true,
                    type: 'select',
                    options: STATUS_OPTIONS
                },
                {
                    id: 'complaintResolution',
                    name: 'resolutionNotes',
                    label: 'Нотатки рішення',
                    type: 'textarea',
                    rows: 3
                }
            ]
        });
    }

    return sections;
}
