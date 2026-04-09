import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchJSON = vi.fn();

vi.mock('../api.js', () => ({
    API: '',
    fetchJSON: (...args) => mockFetchJSON(...args)
}));

import {
    fetchRuntimeCached,
    fetchRuntimeJSON,
    invalidateRuntimeCache,
    loadDevelopmentSnapshot,
    loadOnboardingSnapshot
} from '../appRuntime.js';

function createError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

describe('appRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateRuntimeCache();
    });

    it('calls onUnauthorized when fetchRuntimeJSON receives a 401 error', async () => {
        const onUnauthorized = vi.fn();
        mockFetchJSON.mockRejectedValueOnce(createError('Session expired', 401));

        await expect(fetchRuntimeJSON('/api/test', { onUnauthorized })).rejects.toMatchObject({
            message: 'Session expired',
            status: 401
        });

        expect(onUnauthorized).toHaveBeenCalledWith('Session expired');
    });

    it('does not call onUnauthorized when suppressAuthRedirect is enabled', async () => {
        const onUnauthorized = vi.fn();
        mockFetchJSON.mockRejectedValueOnce(createError('Session expired', 401));

        await expect(fetchRuntimeJSON('/api/test', {
            onUnauthorized,
            suppressAuthRedirect: true
        })).rejects.toMatchObject({
            message: 'Session expired',
            status: 401
        });

        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent cached requests, reuses cache, and refetches after invalidation', async () => {
        let resolveRequest;
        const pending = new Promise(resolve => {
            resolveRequest = resolve;
        });
        mockFetchJSON.mockReturnValueOnce(pending);

        const firstPromise = fetchRuntimeCached('/api/stats', 'stats');
        const secondPromise = fetchRuntimeCached('/api/stats', 'stats');

        expect(mockFetchJSON).toHaveBeenCalledTimes(1);

        resolveRequest({ totalEmployees: 6 });
        await expect(Promise.all([firstPromise, secondPromise])).resolves.toEqual([
            { totalEmployees: 6 },
            { totalEmployees: 6 }
        ]);

        const cached = await fetchRuntimeCached('/api/stats', 'stats');
        expect(cached).toEqual({ totalEmployees: 6 });
        expect(mockFetchJSON).toHaveBeenCalledTimes(1);

        invalidateRuntimeCache('stats');
        mockFetchJSON.mockResolvedValueOnce({ totalEmployees: 7 });

        await expect(fetchRuntimeCached('/api/stats', 'stats')).resolves.toEqual({ totalEmployees: 7 });
        expect(mockFetchJSON).toHaveBeenCalledTimes(2);
    });

    it('normalizes development snapshot arrays to empty lists', async () => {
        mockFetchJSON.mockResolvedValueOnce({
            goals: null,
            feedback: 'bad-shape',
            meetings: undefined
        });

        await expect(loadDevelopmentSnapshot()).resolves.toEqual({
            goals: [],
            feedback: [],
            meetings: []
        });
    });

    it('normalizes onboarding snapshot fields and falls back progress totalCount to task length', async () => {
        mockFetchJSON.mockResolvedValueOnce({
            team: { avatars: 'bad-shape', totalCount: '3' },
            tasks: [{ id: 1 }, { id: 2 }],
            buddy: { id: 9, first_name: 'Ірина' },
            progress: {
                percent: '50',
                completedCount: '1'
            }
        });

        await expect(loadOnboardingSnapshot()).resolves.toEqual({
            team: {
                avatars: [],
                totalCount: 3
            },
            tasks: [{ id: 1 }, { id: 2 }],
            buddy: { id: 9, first_name: 'Ірина' },
            progress: {
                percent: 50,
                completedCount: 1,
                totalCount: 2
            }
        });
    });
});
