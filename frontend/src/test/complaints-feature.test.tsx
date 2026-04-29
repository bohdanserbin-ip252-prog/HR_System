import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '../appContext.tsx';
import ComplaintModal from '../components/ComplaintModal.tsx';
import ComplaintsPage from '../components/ComplaintsPage.tsx';

const { mockFetchJSON } = vi.hoisted(() => ({
    mockFetchJSON: vi.fn(),
}));

vi.mock('../api.ts', () => ({
    API: '',
    fetchJSON: (...args) => mockFetchJSON(...args),
}));

const adminUser = { id: 1, username: 'admin', role: 'admin' };
const viewerUser = { id: 2, username: 'viewer', role: 'user' };

const employees = [
    { id: 7, first_name: 'Олена', last_name: 'Коваленко' },
    { id: 8, first_name: 'Іван', last_name: 'Петренко' },
];

const complaints = [
    {
        id: 21,
        employee: {
            id: 7,
            firstName: 'Олена',
            lastName: 'Коваленко',
            departmentName: 'HR',
            positionTitle: 'HR-спеціаліст',
        },
        reporterName: 'Марія',
        title: 'Порушення комунікації',
        description: 'Ігнорує командні домовленості.',
        severity: 'high',
        status: 'open',
        complaintDate: '2026-04-21',
        resolutionNotes: null,
    },
    {
        id: 22,
        employee: null,
        reporterName: '',
        title: 'Закрита перевірка',
        description: 'Розгляд завершено.',
        severity: 'low',
        status: 'resolved',
        complaintDate: '2026-04-18',
        resolutionNotes: 'Питання вирішено',
    },
];

function renderWithContext(ui, actions = {}) {
    return render(
        <AppContextProvider
            state={{}}
            actions={{
                afterComplaintMutation: vi.fn().mockResolvedValue(undefined),
                confirmDelete: vi.fn(),
                editComplaint: vi.fn(),
                handleUnauthorized: vi.fn(),
                openComplaintCreate: vi.fn(),
                ...actions,
            }}
        >
            {ui}
        </AppContextProvider>,
    );
}

function mutationCalls() {
    return mockFetchJSON.mock.calls.filter(([, options]) => options?.body);
}

describe('complaints page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.className = '';
        document.body.innerHTML = '';
    });

    it('renders complaint cards with filters and admin actions', () => {
        const actions = {
            openComplaintCreate: vi.fn(),
            editComplaint: vi.fn(),
            confirmDelete: vi.fn(),
        };
        renderWithContext(
            <ComplaintsPage
                currentUser={adminUser}
                isActive
                snapshot={{ status: 'ready', data: { complaints }, errorMessage: '' }}
            />,
            actions,
        );

        expect(screen.getByRole('heading', { name: 'Скарги на працівників' })).toBeInTheDocument();
        expect(screen.getByRole('searchbox', { name: 'Пошук скарг' })).toBeInTheDocument();
        expect(screen.getByText('Порушення комунікації')).toBeInTheDocument();
        expect(screen.getByText('Закрита перевірка')).toBeInTheDocument();
        expect(screen.getAllByText('Висока').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Відкрита').length).toBeGreaterThan(0);

        fireEvent.change(screen.getByLabelText('Статус скарги'), { target: { value: 'resolved' } });
        expect(screen.queryByText('Порушення комунікації')).not.toBeInTheDocument();
        expect(screen.getByText('Закрита перевірка')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Нова скарга' }));
        expect(actions.openComplaintCreate).toHaveBeenCalledTimes(1);

        const resolvedCard = screen.getByText('Закрита перевірка').closest('.complaint-card');
        fireEvent.click(within(resolvedCard).getByRole('button', { name: 'Редагувати скаргу' }));
        expect(actions.editComplaint).toHaveBeenCalledWith(22);
        fireEvent.click(within(resolvedCard).getByRole('button', { name: 'Видалити скаргу' }));
        expect(actions.confirmDelete).toHaveBeenCalledWith('complaint', 22, 'Закрита перевірка');
    });

    it('lets regular users create complaints but hides moderation controls', () => {
        renderWithContext(
            <ComplaintsPage
                currentUser={viewerUser}
                isActive
                snapshot={{ status: 'ready', data: { complaints }, errorMessage: '' }}
            />,
        );

        expect(screen.getByRole('button', { name: 'Нова скарга' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Редагувати скаргу' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Видалити скаргу' })).not.toBeInTheDocument();
    });
});

describe('complaint modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchJSON.mockImplementation((url) => {
            if (String(url).startsWith('/api/v2/employees?')) return Promise.resolve(employees);
            return Promise.resolve({ id: 99 });
        });
    });

    it('creates a complaint without moderation fields for regular users', async () => {
        const onClose = vi.fn();
        const afterComplaintMutation = vi.fn().mockResolvedValue(undefined);
        renderWithContext(
            <ComplaintModal
                complaints={[]}
                currentUser={viewerUser}
                isOpen
                mode="create"
                onClose={onClose}
            />,
            { afterComplaintMutation },
        );

        await waitFor(() => expect(screen.getByLabelText('Працівник *')).not.toBeDisabled());
        fireEvent.change(screen.getByLabelText('Працівник *'), { target: { value: '7' } });
        fireEvent.change(screen.getByLabelText('Дата скарги *'), { target: { value: '2026-04-21' } });
        fireEvent.change(screen.getByLabelText('Серйозність *'), { target: { value: 'high' } });
        fireEvent.change(screen.getByLabelText('Заявник'), { target: { value: 'Марія' } });
        fireEvent.change(screen.getByLabelText('Тема *'), { target: { value: 'Нова скарга' } });
        fireEvent.change(screen.getByLabelText('Опис *'), { target: { value: 'Опис ситуації' } });
        fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

        await waitFor(() => expect(mutationCalls()).toHaveLength(1));
        expect(mockFetchJSON).toHaveBeenCalledWith('/api/v2/complaints', expect.objectContaining({
            method: 'POST',
        }));
        expect(JSON.parse(mutationCalls()[0][1].body)).toEqual({
            employee_id: 7,
            reporter_name: 'Марія',
            title: 'Нова скарга',
            description: 'Опис ситуації',
            severity: 'high',
            complaint_date: '2026-04-21',
        });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(afterComplaintMutation).toHaveBeenCalledWith({ successMessage: 'Скаргу створено' });
    });

    it('allows admins to update status and resolution notes', async () => {
        renderWithContext(
            <ComplaintModal
                complaintId={21}
                complaints={complaints}
                currentUser={adminUser}
                isOpen
                mode="edit"
                onClose={vi.fn()}
            />,
        );

        await waitFor(() => expect(screen.getByLabelText('Статус *')).toHaveValue('open'));
        fireEvent.change(screen.getByLabelText('Статус *'), { target: { value: 'in_review' } });
        fireEvent.change(screen.getByLabelText('Нотатки рішення'), {
            target: { value: 'Почали перевірку' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

        await waitFor(() => expect(mutationCalls()).toHaveLength(1));
        expect(mockFetchJSON).toHaveBeenCalledWith('/api/v2/complaints/21', expect.objectContaining({
            method: 'PUT',
        }));
        expect(JSON.parse(mutationCalls()[0][1].body)).toMatchObject({
            employee_id: 7,
            status: 'in_review',
            resolution_notes: 'Почали перевірку',
        });
    });

    it('lets admins moderate complaints whose employee was deleted', async () => {
        renderWithContext(
            <ComplaintModal
                complaintId={22}
                complaints={complaints}
                currentUser={adminUser}
                isOpen
                mode="edit"
                onClose={vi.fn()}
            />,
        );

        await waitFor(() => expect(screen.getByLabelText('Статус *')).toHaveValue('resolved'));
        fireEvent.change(screen.getByLabelText('Статус *'), { target: { value: 'rejected' } });
        fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

        await waitFor(() => expect(mutationCalls()).toHaveLength(1));
        const payload = JSON.parse(mutationCalls()[0][1].body);
        expect(payload).not.toHaveProperty('employee_id');
        expect(payload).toMatchObject({
            status: 'rejected',
            title: 'Закрита перевірка',
        });
    });
});
