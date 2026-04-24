export const DEFAULT_BADGE_COUNTS = {
    employees: '—',
    departments: '—',
    positions: '—'
};

export const CLOSED_CONFIRM_DELETE_STATE = {
    isOpen: false,
    title: 'Підтвердження',
    message: '',
    confirmLabel: 'Видалити',
    onConfirm: null
};

export const CLOSED_EMPLOYEE_MODAL_STATE = {
    isOpen: false,
    mode: 'create',
    employeeId: null
};

export const CLOSED_ORGANIZATION_MODAL_STATE = {
    type: null,
    mode: 'create',
    entityId: null
};

export const CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE = {
    type: null,
    mode: 'create',
    entityId: null
};

export const CLOSED_COMPLAINT_MODAL_STATE = {
    isOpen: false,
    mode: 'create',
    complaintId: null
};

export function createDashboardData() {
    return {
        stats: null
    };
}

export function createDevelopmentData() {
    return {
        goals: [],
        feedback: [],
        meetings: []
    };
}

export function createOnboardingData() {
    return {
        team: {
            avatars: [],
            totalCount: 0
        },
        tasks: [],
        buddy: null,
        progress: {
            percent: 0,
            completedCount: 0,
            totalCount: 0
        }
    };
}

export function createComplaintsData() {
    return {
        complaints: []
    };
}

export function createActivityFeedData() {
    return {
        items: []
    };
}

export function createPageSnapshot(data, overrides = {}) {
    return {
        status: 'idle',
        errorMessage: '',
        data,
        reason: 'initial',
        revision: 0,
        ...overrides
    };
}

export function createDashboardSnapshot(overrides = {}) {
    return createPageSnapshot(createDashboardData(), overrides);
}

export function createDevelopmentSnapshot(overrides = {}) {
    return createPageSnapshot(createDevelopmentData(), overrides);
}

export function createOnboardingSnapshot(overrides = {}) {
    return createPageSnapshot(createOnboardingData(), overrides);
}

export function createComplaintsSnapshot(overrides = {}) {
    return createPageSnapshot(createComplaintsData(), overrides);
}

export function createActivityFeedSnapshot(overrides = {}) {
    return createPageSnapshot(createActivityFeedData(), overrides);
}
