import { fetchJSON as rawFetchJSON } from './api.js';
import { ENDPOINTS } from './app/endpoints.js';

const cache = {};
const pendingRequests = {};
const CACHE_TTL = 30000;

function getCached(key) {
    const entry = cache[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

export function invalidateRuntimeCache(...keys) {
    if (keys.length === 0) {
        Object.keys(cache).forEach(key => delete cache[key]);
        Object.keys(pendingRequests).forEach(key => delete pendingRequests[key]);
        return;
    }

    keys.forEach(key => {
        delete cache[key];
        delete pendingRequests[key];
    });
}

export async function fetchRuntimeJSON(url, options = {}) {
    const { onUnauthorized, ...requestOptions } = options;

    try {
        return await rawFetchJSON(url, requestOptions);
    } catch (error) {
        if (error?.status === 401 && !requestOptions?.suppressAuthRedirect) {
            onUnauthorized?.(error.message || 'Сесію завершено. Увійдіть повторно.');
        }
        throw error;
    }
}

export async function fetchRuntimeCached(url, key, options = {}) {
    const { forceRefresh = false, ...requestOptions } = options;

    if (!forceRefresh) {
        const cached = getCached(key);
        if (cached) return cached;
        if (pendingRequests[key]) return pendingRequests[key];
    }

    const request = fetchRuntimeJSON(url, requestOptions)
        .then(data => {
            cache[key] = { data, ts: Date.now() };
            return data;
        })
        .finally(() => {
            if (pendingRequests[key] === request) delete pendingRequests[key];
        });

    pendingRequests[key] = request;
    return request;
}

export function getBadgeCountsFromStats(stats) {
    return {
        employees: Number(stats?.totalEmployees || 0),
        departments: Number(stats?.totalDepartments || 0),
        positions: Number(stats?.totalPositions || 0)
    };
}

export async function loadStats(options = {}) {
    return fetchRuntimeCached(ENDPOINTS.stats, 'stats', options);
}

export async function loadDashboardSnapshot(options = {}) {
    return loadStats(options);
}

export async function loadDevelopmentSnapshot(options = {}) {
    const data = await fetchRuntimeCached(ENDPOINTS.development, 'development', options);
    return {
        goals: Array.isArray(data?.goals) ? data.goals : [],
        feedback: Array.isArray(data?.feedback) ? data.feedback : [],
        meetings: Array.isArray(data?.meetings) ? data.meetings : []
    };
}

export async function loadOnboardingSnapshot(options = {}) {
    const data = await fetchRuntimeCached(ENDPOINTS.onboarding, 'onboarding', options);
    return {
        team: {
            avatars: Array.isArray(data?.team?.avatars) ? data.team.avatars : [],
            totalCount: Number(data?.team?.totalCount || 0)
        },
        tasks: Array.isArray(data?.tasks) ? data.tasks : [],
        buddy: data?.buddy || null,
        progress: {
            percent: Number(data?.progress?.percent || 0),
            completedCount: Number(data?.progress?.completedCount || 0),
            totalCount: Number(data?.progress?.totalCount || (Array.isArray(data?.tasks) ? data.tasks.length : 0))
        }
    };
}

export async function loadComplaintsSnapshot(options = {}) {
    const data = await fetchRuntimeCached(ENDPOINTS.complaints, 'complaints', options);
    return {
        complaints: Array.isArray(data) ? data : []
    };
}

export async function loadActivityFeedSnapshot(options = {}) {
    const data = await fetchRuntimeCached(ENDPOINTS.activity, 'activity', options);
    return {
        items: Array.isArray(data?.items) ? data.items : []
    };
}
