import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '../appContext.tsx';
import FeedbackModal from '../components/FeedbackModal.tsx';
import GoalModal from '../components/GoalModal.tsx';
import MeetingModal from '../components/MeetingModal.tsx';
import TaskModal from '../components/TaskModal.tsx';

const { mockFetchJSON } = vi.hoisted(() => ({
    mockFetchJSON: vi.fn(),
}));

vi.mock('../api.ts', () => ({
    API: '',
    fetchJSON: (...args) => mockFetchJSON(...args),
}));

const adminUser = { id: 1, username: 'admin', role: 'admin' };

const modalCases = [
    {
        name: 'goal',
        Component: GoalModal,
        props: {
            isOpen: true,
            mode: 'edit',
            goalId: 11,
            currentUser: adminUser,
            goals: [{
                id: 11,
                icon: 'target',
                title: 'Existing goal',
                desc: 'Existing goal desc',
                status: 'on-track',
                progress: 20,
                dueDate: '2026-04-21',
                displayOrder: 5,
            }],
            onClose: vi.fn(),
        },
    },
    {
        name: 'feedback',
        Component: FeedbackModal,
        needsEmployeeLoad: true,
        props: {
            isOpen: true,
            mode: 'edit',
            feedbackId: 12,
            currentUser: adminUser,
            feedback: [{
                id: 12,
                employee: null,
                feedbackAt: '2026-04-21',
                text: 'Existing feedback',
                displayOrder: 5,
            }],
            onClose: vi.fn(),
        },
    },
    {
        name: 'meeting',
        Component: MeetingModal,
        props: {
            isOpen: true,
            mode: 'edit',
            meetingId: 13,
            currentUser: adminUser,
            meetings: [{
                id: 13,
                date: '2026-04-21',
                title: 'Existing meeting',
                type: 'Офіс',
                displayOrder: 5,
            }],
            onClose: vi.fn(),
        },
    },
    {
        name: 'task',
        Component: TaskModal,
        props: {
            isOpen: true,
            mode: 'edit',
            taskId: 14,
            currentUser: adminUser,
            tasks: [{
                id: 14,
                icon: 'task_alt',
                status: 'active',
                title: 'Existing task',
                desc: 'Existing task desc',
                dueDate: '2026-04-21',
                priority: false,
                displayOrder: 5,
            }],
            onClose: vi.fn(),
        },
    },
];

function createActions() {
    return {
        afterDevelopmentOnboardingMutation: vi.fn().mockResolvedValue(undefined),
        handleUnauthorized: vi.fn(),
    };
}

function renderModal({ Component, props, needsEmployeeLoad = false }) {
    mockFetchJSON.mockImplementation((url) => {
        if (needsEmployeeLoad && String(url).startsWith('/api/v2/employees?')) {
            return Promise.resolve([]);
        }
        return Promise.resolve({ id: 999 });
    });

    render(
        <AppContextProvider state={{}} actions={createActions()}>
            <Component {...props} />
        </AppContextProvider>,
    );
}

async function setDisplayOrder(value) {
    const input = screen.getByLabelText('Порядок відображення');
    await waitFor(() => expect(input.value).toBe('5'));
    fireEvent.change(input, { target: { value } });
    return input;
}

function submitModal() {
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));
}

function mutationCalls() {
    return mockFetchJSON.mock.calls.filter(([, options]) => options?.body);
}

async function submittedPayload() {
    await waitFor(() => expect(mutationCalls()).toHaveLength(1));
    return JSON.parse(mutationCalls()[0][1].body);
}

describe('development/onboarding modals display order payloads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.className = '';
        document.body.innerHTML = '';
    });

    it.each(modalCases)('omits blank display_order for $name modal submissions', async (modalCase) => {
        renderModal(modalCase);
        await setDisplayOrder('');
        submitModal();

        await expect(submittedPayload()).resolves.not.toHaveProperty('display_order');
    });

    it.each(modalCases)('keeps explicit display_order zero for $name modal submissions', async (modalCase) => {
        renderModal(modalCase);
        await setDisplayOrder('0');
        submitModal();

        await expect(submittedPayload()).resolves.toMatchObject({ display_order: 0 });
    });

    it.each(modalCases)('blocks negative display_order for $name modal submissions', async (modalCase) => {
        renderModal(modalCase);
        const input = await setDisplayOrder('-1');
        submitModal();

        expect(input.validity.rangeUnderflow).toBe(true);
        expect(mutationCalls()).toHaveLength(0);
    });
});
