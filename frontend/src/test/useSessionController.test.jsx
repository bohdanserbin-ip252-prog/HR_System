import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchJSON = vi.fn();

vi.mock('../api.js', () => ({
    API: '',
    fetchJSON: (...args) => mockFetchJSON(...args)
}));

import { useSessionController } from '../hooks/useSessionController.js';

function createControllerDeps() {
    return {
        currentUserRef: { current: null },
        currentPageRef: { current: 'dashboard' },
        setCurrentPage: vi.fn(),
        setSidebarOpen: vi.fn(),
        loadPageData: vi.fn().mockResolvedValue(null),
        refreshBadgeCounts: vi.fn().mockResolvedValue(null),
        resetActionState: vi.fn(),
        resetDataState: vi.fn()
    };
}

describe('useSessionController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('bootstraps an authenticated session and loads dashboard data', async () => {
        const deps = createControllerDeps();
        const user = { id: 1, username: 'admin', role: 'admin' };
        mockFetchJSON.mockResolvedValueOnce(user);

        const { result } = renderHook(() => useSessionController(deps));

        await waitFor(() => {
            expect(result.current.authStatus).toBe('authenticated');
        });

        expect(mockFetchJSON).toHaveBeenCalledWith('/api/auth/me', { suppressAuthRedirect: true });
        expect(deps.currentUserRef.current).toEqual(user);
        expect(deps.currentPageRef.current).toBe('dashboard');
        expect(result.current.currentUser).toEqual(user);
        expect(deps.setCurrentPage).toHaveBeenCalledWith('dashboard');
        expect(deps.refreshBadgeCounts).toHaveBeenCalledWith(true);
        expect(deps.loadPageData).toHaveBeenCalledWith('dashboard', 'bootstrap-session');
    });

    it('resets to unauthenticated state when bootstrap fails', async () => {
        const deps = createControllerDeps();
        deps.currentUserRef.current = { id: 99, username: 'stale', role: 'admin' };
        deps.currentPageRef.current = 'development';
        mockFetchJSON.mockRejectedValueOnce(new Error('Unauthorized'));

        const { result } = renderHook(() => useSessionController(deps));

        await waitFor(() => {
            expect(result.current.authStatus).toBe('unauthenticated');
        });

        expect(deps.currentUserRef.current).toBeNull();
        expect(deps.currentPageRef.current).toBe('dashboard');
        expect(result.current.currentUser).toBeNull();
        expect(result.current.loginError).toBe('');
        expect(deps.setCurrentPage).toHaveBeenCalledWith('dashboard');
        expect(deps.setSidebarOpen).toHaveBeenCalledWith(false);
        expect(deps.resetActionState).toHaveBeenCalledTimes(1);
        expect(deps.resetDataState).toHaveBeenCalledTimes(1);
    });

    it('logs in successfully with trimmed username and clears password afterwards', async () => {
        const deps = createControllerDeps();
        const user = { id: 1, username: 'admin', role: 'admin' };
        mockFetchJSON
            .mockRejectedValueOnce(new Error('Unauthorized'))
            .mockResolvedValueOnce({ user });

        const { result } = renderHook(() => useSessionController(deps));

        await waitFor(() => {
            expect(result.current.authStatus).toBe('unauthenticated');
        });

        await act(async () => {
            result.current.setUsername(' admin ');
            result.current.setPassword('admin123');
        });

        const preventDefault = vi.fn();
        await act(async () => {
            await result.current.handleLoginSubmit({ preventDefault });
        });

        await waitFor(() => {
            expect(result.current.authStatus).toBe('authenticated');
        });

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(mockFetchJSON).toHaveBeenNthCalledWith(
            2,
            '/api/auth/login',
            expect.objectContaining({
                method: 'POST',
                suppressAuthRedirect: true,
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            })
        );
        expect(result.current.username).toBe('admin');
        expect(result.current.password).toBe('');
        expect(result.current.currentUser).toEqual(user);
        expect(deps.currentUserRef.current).toEqual(user);
        expect(deps.currentPageRef.current).toBe('dashboard');
        expect(deps.refreshBadgeCounts).toHaveBeenCalledWith(true);
        expect(deps.loadPageData).toHaveBeenCalledWith('dashboard', 'login-success');
    });

    it('resets locally on logout even when the server call fails', async () => {
        const deps = createControllerDeps();
        const user = { id: 2, username: 'viewer', role: 'viewer' };
        mockFetchJSON
            .mockResolvedValueOnce(user)
            .mockRejectedValueOnce(new Error('Network down'));

        const { result } = renderHook(() => useSessionController(deps));

        await waitFor(() => {
            expect(result.current.authStatus).toBe('authenticated');
        });

        await act(async () => {
            await result.current.handleLogout();
        });

        await waitFor(() => {
            expect(result.current.authStatus).toBe('unauthenticated');
        });

        expect(mockFetchJSON).toHaveBeenNthCalledWith(2, '/api/auth/logout', {
            method: 'POST',
            suppressAuthRedirect: true
        });
        expect(result.current.currentUser).toBeNull();
        expect(deps.currentUserRef.current).toBeNull();
        expect(deps.currentPageRef.current).toBe('dashboard');
        expect(deps.resetActionState).toHaveBeenCalled();
        expect(deps.resetDataState).toHaveBeenCalled();
    });
});
