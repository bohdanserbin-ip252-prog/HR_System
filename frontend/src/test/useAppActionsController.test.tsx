import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchRuntimeJSON = vi.fn();
const mockInvalidateRuntimeCache = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../appRuntime.ts', async () => {
    const actual = await vi.importActual('../appRuntime.ts');
    return {
        ...actual,
        fetchRuntimeJSON: (...args) => mockFetchRuntimeJSON(...args),
        invalidateRuntimeCache: (...args) => mockInvalidateRuntimeCache(...args)
    };
});

vi.mock('../toast.ts', () => ({
    showToast: (...args) => mockShowToast(...args)
}));

import { useAppActionsController } from '../hooks/useAppActionsController.ts';

function createControllerDeps() {
    return {
        currentUserRef: { current: { id: 1, username: 'admin', role: 'admin' } },
        currentPageRef: { current: 'employees' },
        setCurrentPage: vi.fn(),
        setProfileEmployeeId: vi.fn(),
        bumpDepartmentsRefresh: vi.fn(),
        bumpEmployeesRefresh: vi.fn(),
        bumpPositionsRefresh: vi.fn(),
        bumpProfileRefresh: vi.fn(),
        onUnauthorized: vi.fn(),
        refreshAll: vi.fn().mockResolvedValue(undefined)
    };
}

describe('useAppActionsController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks admin-only actions for non-admin users and keeps modal state closed', () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 2, username: 'viewer', role: 'viewer' };

        const { result } = renderHook(() => useAppActionsController(deps));

        act(() => {
            result.current.openEmployeeCreate();
        });

        expect(result.current.employeeModalState).toEqual({
            isOpen: false,
            mode: 'create',
            employeeId: null
        });
        expect(mockShowToast).toHaveBeenCalledWith('Ця дія доступна лише адміністратору', 'error');
    });

    it('routes FAB actions to the expected modal states', () => {
        const deps = createControllerDeps();
        const { result } = renderHook(() => useAppActionsController(deps));

        act(() => {
            deps.currentPageRef.current = 'development';
            result.current.handleFab();
        });

        expect(result.current.developmentOnboardingModalState).toEqual({
            type: 'goal',
            mode: 'create',
            entityId: null
        });

        act(() => {
            result.current.closeDevelopmentOnboardingModal();
            deps.currentPageRef.current = 'employees';
            result.current.handleFab();
        });

        expect(result.current.employeeModalState).toEqual({
            isOpen: true,
            mode: 'create',
            employeeId: null
        });

        act(() => {
            result.current.closeEmployeeModal();
            deps.currentPageRef.current = 'complaints';
            result.current.handleFab();
        });

        expect(result.current.complaintModalState).toEqual({
            isOpen: true,
            mode: 'create',
            complaintId: null
        });
    });

    it('allows regular users to open complaint creation but not moderation actions', () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 2, username: 'viewer', role: 'user' };

        const { result } = renderHook(() => useAppActionsController(deps));

        act(() => {
            result.current.openComplaintCreate();
        });

        expect(result.current.complaintModalState).toEqual({
            isOpen: true,
            mode: 'create',
            complaintId: null
        });

        act(() => {
            result.current.editComplaint(5);
        });

        expect(result.current.complaintModalState).toEqual({
            isOpen: true,
            mode: 'create',
            complaintId: null
        });
        expect(mockShowToast).toHaveBeenCalledWith('Ця дія доступна лише адміністратору', 'error');
    });

    it('deletes an employee from profile flow and redirects back to employees', async () => {
        const deps = createControllerDeps();
        deps.currentPageRef.current = 'profile';
        mockFetchRuntimeJSON.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useAppActionsController(deps));

        act(() => {
            result.current.confirmDelete('employee', 9, 'Тестовий працівник');
        });

        expect(result.current.confirmDeleteState).toMatchObject({
            isOpen: true,
            confirmLabel: 'Видалити',
            message: 'Ви дійсно бажаєте видалити "Тестовий працівник"?'
        });

        await act(async () => {
            await result.current.confirmDeleteState.onConfirm();
        });

        expect(mockFetchRuntimeJSON).toHaveBeenCalledWith('/api/v2/employees/9', {
            method: 'DELETE',
            onUnauthorized: deps.onUnauthorized
        });
        expect(deps.bumpEmployeesRefresh).toHaveBeenCalled();
        expect(deps.setProfileEmployeeId).toHaveBeenCalledWith(null);
        expect(deps.bumpProfileRefresh).toHaveBeenCalled();
        expect(deps.setCurrentPage).toHaveBeenCalledWith('employees');
        expect(deps.currentPageRef.current).toBe('employees');
        expect(mockInvalidateRuntimeCache).toHaveBeenCalledWith('stats');
        expect(mockShowToast).toHaveBeenCalledWith('Успішно видалено', 'success');
        expect(deps.refreshAll).toHaveBeenCalledWith('delete-employee');
    });

    it('moves development records through the correct endpoint and refresh reason', async () => {
        const deps = createControllerDeps();
        mockFetchRuntimeJSON.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useAppActionsController(deps));

        await act(async () => {
            await result.current.moveRecord('developmentGoal', 3, 'down');
        });

        expect(mockFetchRuntimeJSON).toHaveBeenCalledWith('/api/v2/development/goals/3/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction: 'down' }),
            onUnauthorized: deps.onUnauthorized
        });
        expect(mockInvalidateRuntimeCache).toHaveBeenCalledWith('development');
        expect(deps.refreshAll).toHaveBeenCalledWith('move-developmentGoal');
    });

    it('deletes complaints through the complaints endpoint and refreshes complaint data', async () => {
        const deps = createControllerDeps();
        mockFetchRuntimeJSON.mockResolvedValueOnce({ success: true });

        const { result } = renderHook(() => useAppActionsController(deps));

        act(() => {
            result.current.confirmDelete('complaint', 17, 'Скарга');
        });

        await act(async () => {
            await result.current.confirmDeleteState.onConfirm();
        });

        expect(mockFetchRuntimeJSON).toHaveBeenCalledWith('/api/v2/complaints/17', {
            method: 'DELETE',
            onUnauthorized: deps.onUnauthorized
        });
        expect(mockInvalidateRuntimeCache).toHaveBeenCalledWith('complaints');
        expect(deps.refreshAll).toHaveBeenCalledWith('delete-complaint');
    });

    it('runs department mutation follow-up with cache invalidation and refreshes', async () => {
        const deps = createControllerDeps();
        const { result } = renderHook(() => useAppActionsController(deps));

        await act(async () => {
            await result.current.afterDepartmentMutation({
                reason: 'department-manual-refresh',
                successMessage: 'Відділ оновлено'
            });
        });

        expect(mockInvalidateRuntimeCache).toHaveBeenCalledWith('stats');
        expect(deps.bumpDepartmentsRefresh).toHaveBeenCalled();
        expect(deps.bumpEmployeesRefresh).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Відділ оновлено', 'success');
        expect(deps.refreshAll).toHaveBeenCalledWith('department-manual-refresh');
    });
});
