import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAppDataController = vi.fn();
const mockUseAppActionsController = vi.fn();
const mockUseDesktopNotificationController = vi.fn();

vi.mock('../hooks/useAppDataController.ts', () => ({
    useAppDataController: (...args) => mockUseAppDataController(...args)
}));

vi.mock('../hooks/useAppActionsController.ts', () => ({
    useAppActionsController: (...args) => mockUseAppActionsController(...args)
}));

vi.mock('../hooks/useDesktopNotificationController.ts', () => ({
    useDesktopNotificationController: (...args) => mockUseDesktopNotificationController(...args)
}));

function createStubComponent(testId) {
    return function StubComponent() {
        return <div data-testid={testId}>{testId}</div>;
    };
}

vi.mock('../components/DashboardPage.tsx', () => ({ default: createStubComponent('dashboard-page') }));
vi.mock('../components/EmployeesPage.tsx', () => ({ default: createStubComponent('employees-page') }));
vi.mock('../components/DepartmentsPage.tsx', () => ({ default: createStubComponent('departments-page') }));
vi.mock('../components/PositionsPage.tsx', () => ({ default: createStubComponent('positions-page') }));
vi.mock('../components/DevelopmentPage.tsx', () => ({ default: createStubComponent('development-page') }));
vi.mock('../components/OnboardingPage.tsx', () => ({ default: createStubComponent('onboarding-page') }));
vi.mock('../components/ProfilePage.tsx', () => ({ default: createStubComponent('profile-page') }));
vi.mock('../components/AuditLogTab.tsx', () => ({ default: createStubComponent('audit-log-page') }));
vi.mock('../components/SettingsPage.tsx', () => ({ default: createStubComponent('settings-page') }));
vi.mock('../components/FeatureFlagsPage.tsx', () => ({ default: createStubComponent('feature-flags-page') }));
vi.mock('../components/RecruitmentPage.tsx', () => ({ default: createStubComponent('recruitment-page') }));
vi.mock('../components/HelpDeskPage.tsx', () => ({ default: createStubComponent('help-desk-page') }));
vi.mock('../components/SurveysPage.tsx', () => ({ default: createStubComponent('surveys-page') }));
vi.mock('../components/ConfirmDeleteHost.tsx', () => ({ default: createStubComponent('confirm-delete-host') }));
vi.mock('../components/EmployeeModalsHost.tsx', () => ({ default: createStubComponent('employee-modals-host') }));
vi.mock('../components/OrganizationModalsHost.tsx', () => ({ default: createStubComponent('organization-modals-host') }));
vi.mock('../components/DevelopmentOnboardingModalsHost.tsx', () => ({ default: createStubComponent('development-onboarding-modals-host') }));

import App from '../App.tsx';

function createJsonResponse(status, payload) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return name?.toLowerCase() === 'content-type' ? 'application/json' : null;
            }
        },
        async json() {
            return payload;
        },
        async text() {
            return JSON.stringify(payload);
        }
    };
}

function createDataController() {
    return {
        badgeCounts: { employees: 6, departments: 4, positions: 4 },
        dashboardSnapshot: { status: 'ready', errorMessage: '', data: { stats: {} }, revision: 1, reason: 'test' },
        developmentSnapshot: { status: 'ready', errorMessage: '', data: { goals: [], feedback: [], meetings: [] }, revision: 1, reason: 'test' },
        onboardingSnapshot: { status: 'ready', errorMessage: '', data: { team: null, buddy: null, tasks: [], progress: null }, revision: 1, reason: 'test' },
        employeesRefreshKey: 0,
        departmentsRefreshKey: 0,
        positionsRefreshKey: 0,
        profileEmployeeId: null,
        profileRefreshKey: 0,
        bumpDepartmentsRefresh: vi.fn(),
        bumpEmployeesRefresh: vi.fn(),
        bumpPositionsRefresh: vi.fn(),
        bumpProfileRefresh: vi.fn(),
        loadPageData: vi.fn().mockResolvedValue(null),
        refreshAll: vi.fn().mockResolvedValue(undefined),
        refreshBadgeCounts: vi.fn().mockResolvedValue({ totalEmployees: 6 }),
        resetDataState: vi.fn(),
        setProfileEmployeeId: vi.fn()
    };
}

function createActionsController() {
    return {
        confirmDeleteState: { isOpen: false },
        employeeModalState: { isOpen: false, mode: 'create', employeeId: null },
        organizationModalState: { type: null, mode: 'create', entityId: null },
        developmentOnboardingModalState: { type: null, mode: 'create', entityId: null },
        afterDepartmentMutation: vi.fn(),
        afterDevelopmentOnboardingMutation: vi.fn(),
        afterEmployeeMutation: vi.fn(),
        afterPositionMutation: vi.fn(),
        closeConfirmDelete: vi.fn(),
        closeDevelopmentOnboardingModal: vi.fn(),
        closeEmployeeModal: vi.fn(),
        closeOrganizationModal: vi.fn(),
        confirmDelete: vi.fn(),
        editDepartment: vi.fn(),
        editEmployee: vi.fn(),
        editFeedback: vi.fn(),
        editGoal: vi.fn(),
        editMeeting: vi.fn(),
        editPosition: vi.fn(),
        editTask: vi.fn(),
        ensureAdminAction: vi.fn().mockReturnValue(true),
        handleFab: vi.fn(),
        moveRecord: vi.fn(),
        openDepartmentCreate: vi.fn(),
        openEmployeeCreate: vi.fn(),
        openFeedbackCreate: vi.fn(),
        openGoalCreate: vi.fn(),
        openMeetingCreate: vi.fn(),
        openPositionCreate: vi.fn(),
        openTaskCreate: vi.fn(),
        resetActionState: vi.fn()
    };
}

describe('App auth flow', () => {
    let dataController;
    let actionsController;

    beforeEach(() => {
        vi.clearAllMocks();
        dataController = createDataController();
        actionsController = createActionsController();
        mockUseAppDataController.mockImplementation(() => dataController);
        mockUseAppActionsController.mockImplementation(() => actionsController);
    });

    it('bootstraps unauthenticated session, logs in successfully, and logs out back to the login screen', async () => {
        globalThis.fetch = vi.fn(async (url, options = {}) => {
            if (url.endsWith('/api/v2/auth/me')) {
                return createJsonResponse(401, { error: 'Unauthorized' });
            }
            if (url.endsWith('/api/v2/auth/login')) {
                const payload = JSON.parse(options.body);
                expect(payload).toEqual({ username: 'admin', password: 'admin123' });
                return createJsonResponse(200, {
                    user: { id: 1, username: 'admin', role: 'admin' }
                });
            }
            if (url.endsWith('/api/v2/auth/logout')) {
                return createJsonResponse(200, { ok: true });
            }
            if (url.endsWith('/api/v2/notifications/unread-count')) {
                return createJsonResponse(200, { unread_count: 0 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByLabelText('Логін')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'admin123' } });
        fireEvent.submit(screen.getByRole('button', { name: /Увійти/ }).closest('form'));

        await waitFor(() => {
            expect(screen.getByText('admin')).toBeInTheDocument();
        });

        expect(dataController.refreshBadgeCounts).toHaveBeenCalledWith(true);
        expect(dataController.loadPageData).toHaveBeenCalledWith('dashboard', 'login-success');
        expect(screen.queryByLabelText('Логін')).not.toBeVisible();
        expect(screen.getByRole('button', { name: /Додати працівника/ })).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Вийти'));

        await waitFor(() => {
            expect(screen.getByLabelText('Логін')).toBeInTheDocument();
        });

        expect(actionsController.resetActionState).toHaveBeenCalled();
        expect(dataController.resetDataState).toHaveBeenCalled();
    });

    it('does not clear login credentials when hidden authenticated-only panels receive 401 responses', async () => {
        globalThis.fetch = vi.fn(async url => {
            if (url.endsWith('/api/v2/auth/me')) {
                return createJsonResponse(401, { error: 'Unauthorized' });
            }
            if (url.endsWith('/api/v2/notifications/unread-count')) {
                return createJsonResponse(401, { error: 'Необхідно увійти в систему' });
            }
            if (url.endsWith('/api/v2/notifications')) {
                return createJsonResponse(401, { error: 'Необхідно увійти в систему' });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByLabelText('Логін')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'admin123' } });

        await new Promise(resolve => setTimeout(resolve, 50));

        const requestedUrls = globalThis.fetch.mock.calls.map(([url]) => String(url));
        expect(requestedUrls).not.toContain('/api/v2/notifications');
        expect(screen.getByLabelText('Логін')).toHaveValue('admin');
        expect(screen.getByLabelText('Пароль')).toHaveValue('admin123');
        expect(screen.queryByText('Необхідно увійти в систему')).not.toBeInTheDocument();
    });

    it('bootstraps an authenticated session into the shell', async () => {
        globalThis.fetch = vi.fn(async url => {
            if (url.endsWith('/api/v2/auth/me')) {
                return createJsonResponse(200, {
                    id: 2,
                    username: 'viewer',
                    role: 'viewer'
                });
            }
            if (url.endsWith('/api/v2/notifications/unread-count')) {
                return createJsonResponse(200, { unread_count: 0 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('viewer')).toBeInTheDocument();
        });

        expect(dataController.refreshBadgeCounts).toHaveBeenCalledWith(true);
        expect(dataController.loadPageData).toHaveBeenCalledWith('dashboard', 'bootstrap-session');
        expect(screen.queryByRole('button', { name: /Додати працівника/ })).not.toBeInTheDocument();
        expect(screen.getByText('Користувач')).toBeInTheDocument();
    });
});
