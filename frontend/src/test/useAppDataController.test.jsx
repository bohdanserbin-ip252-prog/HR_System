import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvalidateRuntimeCache = vi.fn();
const mockLoadDashboardSnapshot = vi.fn();
const mockLoadDevelopmentSnapshot = vi.fn();
const mockLoadOnboardingSnapshot = vi.fn();
const mockLoadStats = vi.fn();

vi.mock('../appRuntime.js', async () => {
    const actual = await vi.importActual('../appRuntime.js');
    return {
        ...actual,
        invalidateRuntimeCache: (...args) => mockInvalidateRuntimeCache(...args),
        loadDashboardSnapshot: (...args) => mockLoadDashboardSnapshot(...args),
        loadDevelopmentSnapshot: (...args) => mockLoadDevelopmentSnapshot(...args),
        loadOnboardingSnapshot: (...args) => mockLoadOnboardingSnapshot(...args),
        loadStats: (...args) => mockLoadStats(...args)
    };
});

import { useAppDataController } from '../hooks/useAppDataController.js';

function createControllerDeps() {
    return {
        currentUserRef: { current: null },
        currentPageRef: { current: 'dashboard' },
        onUnauthorized: vi.fn()
    };
}

describe('useAppDataController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refreshes badge counts from stats successfully', async () => {
        const deps = createControllerDeps();
        const stats = {
            totalEmployees: 7,
            totalDepartments: 4,
            totalPositions: 5
        };
        mockLoadStats.mockResolvedValueOnce(stats);

        const { result } = renderHook(() => useAppDataController(deps));

        let returnedStats;
        await act(async () => {
            returnedStats = await result.current.refreshBadgeCounts(true);
        });

        expect(returnedStats).toEqual(stats);
        expect(mockLoadStats).toHaveBeenCalledWith({
            forceRefresh: true,
            onUnauthorized: deps.onUnauthorized
        });
        expect(result.current.badgeCounts).toEqual({
            employees: 7,
            departments: 4,
            positions: 5
        });
    });

    it('loads dashboard data into a ready snapshot and syncs badge counts', async () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 1, username: 'admin', role: 'admin' };
        const stats = {
            totalEmployees: 6,
            totalDepartments: 4,
            totalPositions: 4
        };
        mockLoadDashboardSnapshot.mockResolvedValueOnce(stats);

        const { result } = renderHook(() => useAppDataController(deps));

        let payload;
        await act(async () => {
            payload = await result.current.loadPageData('dashboard', 'dashboard-check');
        });

        await waitFor(() => {
            expect(result.current.dashboardSnapshot.status).toBe('ready');
        });

        expect(payload).toEqual(stats);
        expect(mockLoadDashboardSnapshot).toHaveBeenCalledWith({ onUnauthorized: deps.onUnauthorized });
        expect(result.current.dashboardSnapshot.reason).toBe('dashboard-check-success');
        expect(result.current.dashboardSnapshot.revision).toBe(2);
        expect(result.current.dashboardSnapshot.data).toEqual({ stats });
        expect(result.current.badgeCounts).toEqual({
            employees: 6,
            departments: 4,
            positions: 4
        });
    });

    it('stores a fallback error snapshot when development loading fails with a non-401 error', async () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 1, username: 'admin', role: 'admin' };
        mockLoadDevelopmentSnapshot.mockRejectedValueOnce(new Error('HTTP 500'));

        const { result } = renderHook(() => useAppDataController(deps));

        let payload;
        await act(async () => {
            payload = await result.current.loadPageData('development', 'development-check');
        });

        await waitFor(() => {
            expect(result.current.developmentSnapshot.status).toBe('error');
        });

        expect(payload).toBeNull();
        expect(result.current.developmentSnapshot.reason).toBe('development-check-error');
        expect(result.current.developmentSnapshot.errorMessage).toBe('Помилка завантаження плану розвитку');
        expect(result.current.developmentSnapshot.data).toEqual({
            goals: [],
            feedback: [],
            meetings: []
        });
    });

    it('refreshes list state for employees and invalidates runtime cache', async () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 2, username: 'viewer', role: 'viewer' };
        deps.currentPageRef.current = 'employees';
        mockLoadStats.mockResolvedValueOnce({
            totalEmployees: 6,
            totalDepartments: 4,
            totalPositions: 4
        });

        const { result } = renderHook(() => useAppDataController(deps));

        expect(result.current.employeesRefreshKey).toBe(0);

        await act(async () => {
            await result.current.refreshAll('employees-refresh');
        });

        expect(mockInvalidateRuntimeCache).toHaveBeenCalledWith();
        expect(mockLoadStats).toHaveBeenCalledWith({
            forceRefresh: true,
            onUnauthorized: deps.onUnauthorized
        });
        expect(result.current.employeesRefreshKey).toBe(1);
        expect(mockLoadDashboardSnapshot).not.toHaveBeenCalled();
    });

    it('resets data state back to defaults and clears runtime cache', async () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 1, username: 'admin', role: 'admin' };
        mockLoadDashboardSnapshot.mockResolvedValueOnce({
            totalEmployees: 6,
            totalDepartments: 4,
            totalPositions: 4
        });

        const { result } = renderHook(() => useAppDataController(deps));

        await act(async () => {
            result.current.bumpEmployeesRefresh();
            result.current.bumpDepartmentsRefresh();
            result.current.bumpPositionsRefresh();
            result.current.bumpProfileRefresh();
            result.current.setProfileEmployeeId(42);
            await result.current.loadPageData('dashboard', 'before-reset');
        });

        await waitFor(() => {
            expect(result.current.dashboardSnapshot.status).toBe('ready');
        });

        act(() => {
            result.current.resetDataState();
        });

        expect(result.current.badgeCounts).toEqual({
            employees: '—',
            departments: '—',
            positions: '—'
        });
        expect(result.current.employeesRefreshKey).toBe(0);
        expect(result.current.departmentsRefreshKey).toBe(0);
        expect(result.current.positionsRefreshKey).toBe(0);
        expect(result.current.profileEmployeeId).toBeNull();
        expect(result.current.profileRefreshKey).toBe(0);
        expect(result.current.dashboardSnapshot).toMatchObject({
            status: 'idle',
            errorMessage: '',
            reason: 'initial',
            revision: 0,
            data: { stats: null }
        });
        expect(result.current.developmentSnapshot).toMatchObject({
            status: 'idle',
            errorMessage: '',
            reason: 'initial',
            revision: 0,
            data: { goals: [], feedback: [], meetings: [] }
        });
        expect(result.current.onboardingSnapshot).toMatchObject({
            status: 'idle',
            errorMessage: '',
            reason: 'initial',
            revision: 0
        });
        expect(mockInvalidateRuntimeCache).toHaveBeenCalledTimes(1);
    });
});
