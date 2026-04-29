import { useState } from 'react';
import {
    getBadgeCountsFromStats,
    invalidateRuntimeCache,
    loadActivityFeedSnapshot,
    loadComplaintsSnapshot,
    loadDashboardSnapshot,
    loadDevelopmentSnapshot,
    loadOnboardingSnapshot,
    loadStats
} from '../appRuntime.ts';
import {
    DEFAULT_BADGE_COUNTS,
    createActivityFeedData,
    createActivityFeedSnapshot,
    createDashboardData,
    createDashboardSnapshot,
    createComplaintsData,
    createComplaintsSnapshot,
    createDevelopmentData,
    createDevelopmentSnapshot,
    createOnboardingData,
    createOnboardingSnapshot
} from '../appStateBuilders.ts';
import { getErrorMessage } from '../uiUtils.ts';

export function useAppDataController({ currentUserRef, currentPageRef, onUnauthorized }) {
    const [badgeCounts, setBadgeCounts] = useState(DEFAULT_BADGE_COUNTS);
    const [employeesRefreshKey, setEmployeesRefreshKey] = useState(0);
    const [departmentsRefreshKey, setDepartmentsRefreshKey] = useState(0);
    const [positionsRefreshKey, setPositionsRefreshKey] = useState(0);
    const [profileEmployeeId, setProfileEmployeeId] = useState(null);
    const [profileRefreshKey, setProfileRefreshKey] = useState(0);
    const [dashboardSnapshot, setDashboardSnapshot] = useState(() => createDashboardSnapshot());
    const [complaintsSnapshot, setComplaintsSnapshot] = useState(() => createComplaintsSnapshot());
    const [developmentSnapshot, setDevelopmentSnapshot] = useState(() => createDevelopmentSnapshot());
    const [onboardingSnapshot, setOnboardingSnapshot] = useState(() => createOnboardingSnapshot());
    const [activitySnapshot, setActivitySnapshot] = useState(() => createActivityFeedSnapshot());

    function bumpRefresh(setRefreshKey) {
        setRefreshKey(key => key + 1);
    }

    function bumpEmployeesRefresh() {
        bumpRefresh(setEmployeesRefreshKey);
    }

    function bumpDepartmentsRefresh() {
        bumpRefresh(setDepartmentsRefreshKey);
    }

    function bumpPositionsRefresh() {
        bumpRefresh(setPositionsRefreshKey);
    }

    function bumpProfileRefresh() {
        bumpRefresh(setProfileRefreshKey);
    }

    const pageConfigs = {
        dashboard: {
            setSnapshot: setDashboardSnapshot,
            createFallbackData: createDashboardData,
            load: () => loadDashboardSnapshot({ onUnauthorized }),
            mapData: stats => ({ stats }),
            defaultErrorMessage: 'Помилка завантаження статистики',
            onSuccess: stats => {
                if (stats) setBadgeCounts(getBadgeCountsFromStats(stats));
            }
        },
        development: {
            setSnapshot: setDevelopmentSnapshot,
            createFallbackData: createDevelopmentData,
            load: () => loadDevelopmentSnapshot({ onUnauthorized }),
            mapData: data => data,
            defaultErrorMessage: 'Помилка завантаження плану розвитку'
        },
        complaints: {
            setSnapshot: setComplaintsSnapshot,
            createFallbackData: createComplaintsData,
            load: () => loadComplaintsSnapshot({ onUnauthorized }),
            mapData: data => data,
            defaultErrorMessage: 'Помилка завантаження скарг'
        },
        onboarding: {
            setSnapshot: setOnboardingSnapshot,
            createFallbackData: createOnboardingData,
            load: () => loadOnboardingSnapshot({ onUnauthorized }),
            mapData: data => data,
            defaultErrorMessage: 'Помилка завантаження адаптації'
        },
        activity: {
            setSnapshot: setActivitySnapshot,
            createFallbackData: createActivityFeedData,
            load: () => loadActivityFeedSnapshot({ onUnauthorized }),
            mapData: data => data,
            defaultErrorMessage: 'Помилка завантаження стрічки активності'
        }
    };

    function updateSnapshot(page, nextState, reason) {
        const { setSnapshot } = pageConfigs[page];
        setSnapshot(current => ({
            ...current,
            ...nextState,
            reason,
            revision: current.revision + 1
        }));
    }

    async function refreshBadgeCounts(forceRefresh = false) {
        try {
            const stats = await loadStats({
                forceRefresh,
                onUnauthorized
            });
            if (stats) setBadgeCounts(getBadgeCountsFromStats(stats));
            return stats;
        } catch (error) {
            if (error?.status !== 401) setBadgeCounts(DEFAULT_BADGE_COUNTS);
            return null;
        }
    }

    async function loadConfiguredPage(page, reason) {
        const config = pageConfigs[page];
        if (!config) return null;

        updateSnapshot(page, {
            status: 'loading',
            errorMessage: ''
        }, reason);

        try {
            const payload = await config.load();
            updateSnapshot(page, {
                status: 'ready',
                errorMessage: '',
                data: config.mapData(payload)
            }, `${reason}-success`);
            config.onSuccess?.(payload);
            return payload;
        } catch (error) {
            if (error?.status === 401) return null;
            updateSnapshot(page, {
                status: 'error',
                errorMessage: getErrorMessage(error, config.defaultErrorMessage),
                data: config.createFallbackData()
            }, `${reason}-error`);
            return null;
        }
    }

    async function loadPageData(page, reason = 'load-page') {
        if (!currentUserRef.current) return null;

        if (page === 'profile') {
            bumpProfileRefresh();
            return null;
        }

        return loadConfiguredPage(page, reason);
    }

    async function refreshAll(reason = 'manual') {
        if (!currentUserRef.current) return;

        invalidateRuntimeCache();
        const page = currentPageRef.current;
        const tasks = [refreshBadgeCounts(true)];

        if (pageConfigs[page]) tasks.push(loadConfiguredPage(page, `refresh-${reason}`));
        if (page === 'employees') bumpEmployeesRefresh();
        if (page === 'organization') {
            bumpDepartmentsRefresh();
            bumpPositionsRefresh();
        }
        if (page === 'profile') bumpProfileRefresh();

        await Promise.all(tasks);
    }

    function resetDataState() {
        setBadgeCounts(DEFAULT_BADGE_COUNTS);
        setEmployeesRefreshKey(0);
        setDepartmentsRefreshKey(0);
        setPositionsRefreshKey(0);
        setProfileEmployeeId(null);
        setProfileRefreshKey(0);
        setDashboardSnapshot(createDashboardSnapshot());
        setComplaintsSnapshot(createComplaintsSnapshot());
        setDevelopmentSnapshot(createDevelopmentSnapshot());
        setOnboardingSnapshot(createOnboardingSnapshot());
        setActivitySnapshot(createActivityFeedSnapshot());
        invalidateRuntimeCache();
    }

    return {
        activitySnapshot,
        badgeCounts,
        complaintsSnapshot,
        dashboardSnapshot,
        departmentsRefreshKey,
        developmentSnapshot,
        employeesRefreshKey,
        onboardingSnapshot,
        positionsRefreshKey,
        profileEmployeeId,
        profileRefreshKey,
        bumpDepartmentsRefresh,
        bumpEmployeesRefresh,
        bumpPositionsRefresh,
        bumpProfileRefresh,
        loadPageData,
        refreshAll,
        refreshBadgeCounts,
        resetDataState,
        setProfileEmployeeId
    };
}
