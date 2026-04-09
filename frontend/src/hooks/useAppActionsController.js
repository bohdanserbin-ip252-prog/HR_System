import { useState } from 'react';
import { API } from '../api.js';
import {
    CLOSED_CONFIRM_DELETE_STATE,
    CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE,
    CLOSED_EMPLOYEE_MODAL_STATE,
    CLOSED_ORGANIZATION_MODAL_STATE
} from '../appStateBuilders.js';
import { fetchRuntimeJSON, invalidateRuntimeCache } from '../appRuntime.js';
import { showToast } from '../toast.js';
import { getErrorMessage } from '../uiUtils.js';

const MOVE_ENDPOINTS = {
    developmentGoal: 'development/goals',
    developmentFeedback: 'development/feedback',
    developmentMeeting: 'development/meetings',
    onboardingTask: 'onboarding/tasks'
};

const DELETE_ENDPOINTS = {
    employee: 'employees',
    department: 'departments',
    position: 'positions',
    developmentGoal: 'development/goals',
    developmentFeedback: 'development/feedback',
    developmentMeeting: 'development/meetings',
    onboardingTask: 'onboarding/tasks'
};

const MOVE_CACHE_KEYS = {
    developmentGoal: ['development'],
    developmentFeedback: ['development'],
    developmentMeeting: ['development'],
    onboardingTask: ['onboarding']
};

const DELETE_CACHE_KEYS = {
    employee: ['stats'],
    department: ['stats'],
    position: ['stats'],
    developmentGoal: ['development'],
    developmentFeedback: ['development'],
    developmentMeeting: ['development'],
    onboardingTask: ['onboarding']
};

export function useAppActionsController({
    currentUserRef,
    currentPageRef,
    setCurrentPage,
    setProfileEmployeeId,
    bumpDepartmentsRefresh,
    bumpEmployeesRefresh,
    bumpPositionsRefresh,
    bumpProfileRefresh,
    onUnauthorized,
    refreshAll
}) {
    const [confirmDeleteState, setConfirmDeleteState] = useState(CLOSED_CONFIRM_DELETE_STATE);
    const [employeeModalState, setEmployeeModalState] = useState(CLOSED_EMPLOYEE_MODAL_STATE);
    const [organizationModalState, setOrganizationModalState] = useState(CLOSED_ORGANIZATION_MODAL_STATE);
    const [developmentOnboardingModalState, setDevelopmentOnboardingModalState] = useState(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE);

    function isAdmin() {
        return currentUserRef.current?.role === 'admin';
    }

    function ensureAdminAction() {
        if (isAdmin()) return true;
        showToast('Ця дія доступна лише адміністратору', 'error');
        return false;
    }

    function withAdminAction(action) {
        if (!ensureAdminAction()) return false;
        action();
        return true;
    }

    function invalidateCacheKeys(keys = []) {
        if (keys.length > 0) invalidateRuntimeCache(...keys);
    }

    function createAdminModalAction(setter, buildState) {
        return (...args) => {
            withAdminAction(() => setter(buildState(...args)));
        };
    }

    function resetActionState() {
        setConfirmDeleteState(CLOSED_CONFIRM_DELETE_STATE);
        setEmployeeModalState(CLOSED_EMPLOYEE_MODAL_STATE);
        setOrganizationModalState(CLOSED_ORGANIZATION_MODAL_STATE);
        setDevelopmentOnboardingModalState(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE);
    }

    function closeConfirmDelete() {
        setConfirmDeleteState(CLOSED_CONFIRM_DELETE_STATE);
    }

    function closeEmployeeModal() {
        setEmployeeModalState(CLOSED_EMPLOYEE_MODAL_STATE);
    }

    function closeOrganizationModal() {
        setOrganizationModalState(CLOSED_ORGANIZATION_MODAL_STATE);
    }

    function closeDevelopmentOnboardingModal() {
        setDevelopmentOnboardingModalState(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE);
    }

    const openEmployeeCreate = createAdminModalAction(
        setEmployeeModalState,
        () => ({ isOpen: true, mode: 'create', employeeId: null })
    );
    const editEmployee = createAdminModalAction(
        setEmployeeModalState,
        employeeId => ({ isOpen: true, mode: 'edit', employeeId })
    );
    const openDepartmentCreate = createAdminModalAction(
        setOrganizationModalState,
        () => ({ type: 'department', mode: 'create', entityId: null })
    );
    const editDepartment = createAdminModalAction(
        setOrganizationModalState,
        departmentId => ({ type: 'department', mode: 'edit', entityId: departmentId })
    );
    const openPositionCreate = createAdminModalAction(
        setOrganizationModalState,
        () => ({ type: 'position', mode: 'create', entityId: null })
    );
    const editPosition = createAdminModalAction(
        setOrganizationModalState,
        positionId => ({ type: 'position', mode: 'edit', entityId: positionId })
    );
    const openGoalCreate = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        () => ({ type: 'goal', mode: 'create', entityId: null })
    );
    const editGoal = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        goalId => ({ type: 'goal', mode: 'edit', entityId: goalId })
    );
    const openFeedbackCreate = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        () => ({ type: 'feedback', mode: 'create', entityId: null })
    );
    const editFeedback = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        feedbackId => ({ type: 'feedback', mode: 'edit', entityId: feedbackId })
    );
    const openMeetingCreate = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        () => ({ type: 'meeting', mode: 'create', entityId: null })
    );
    const editMeeting = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        meetingId => ({ type: 'meeting', mode: 'edit', entityId: meetingId })
    );
    const openTaskCreate = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        () => ({ type: 'task', mode: 'create', entityId: null })
    );
    const editTask = createAdminModalAction(
        setDevelopmentOnboardingModalState,
        taskId => ({ type: 'task', mode: 'edit', entityId: taskId })
    );

    async function moveRecord(type, id, direction) {
        if (!ensureAdminAction()) return;

        try {
            await fetchRuntimeJSON(`${API}/api/${MOVE_ENDPOINTS[type]}/${id}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction }),
                onUnauthorized
            });

            invalidateCacheKeys(MOVE_CACHE_KEYS[type]);
            await refreshAll(`move-${type}`);
        } catch (error) {
            if (error?.status === 401) return;
            showToast(getErrorMessage(error, 'Помилка зміни порядку'), 'error');
        }
    }

    function handleEmployeeDeleteFromProfile() {
        if (currentPageRef.current !== 'profile') return;

        setProfileEmployeeId(null);
        bumpProfileRefresh();
        currentPageRef.current = 'employees';
        setCurrentPage('employees');
    }

    function applyDeleteLocalEffects(type) {
        if (type === 'department') {
            bumpDepartmentsRefresh();
            bumpEmployeesRefresh();
            return;
        }

        if (type === 'position') {
            bumpPositionsRefresh();
            bumpEmployeesRefresh();
            return;
        }

        if (type === 'employee') {
            bumpEmployeesRefresh();
            handleEmployeeDeleteFromProfile();
        }
    }

    async function executeDelete(type, id) {
        if (!ensureAdminAction()) return;

        await fetchRuntimeJSON(`${API}/api/${DELETE_ENDPOINTS[type]}/${id}`, {
            method: 'DELETE',
            onUnauthorized
        });

        applyDeleteLocalEffects(type);
        invalidateCacheKeys(DELETE_CACHE_KEYS[type]);
        showToast('Успішно видалено', 'success');
        await refreshAll(`delete-${type}`);
    }

    function confirmDelete(type, id, name) {
        if (!ensureAdminAction()) return;
        setConfirmDeleteState({
            isOpen: true,
            title: 'Підтвердження',
            message: `Ви дійсно бажаєте видалити "${name}"?`,
            confirmLabel: 'Видалити',
            onConfirm: () => executeDelete(type, id)
        });
    }

    async function runMutationFollowUp({ successMessage = '', cacheKeys = [], refreshers = [], reason }) {
        if (successMessage) showToast(successMessage, 'success');
        invalidateCacheKeys(cacheKeys);
        refreshers.forEach(refresh => refresh());
        await refreshAll(reason);
    }

    async function afterEmployeeMutation({ successMessage = '' } = {}) {
        const refreshers = [bumpEmployeesRefresh];
        if (currentPageRef.current === 'profile') refreshers.push(bumpProfileRefresh);

        await runMutationFollowUp({
            successMessage,
            cacheKeys: ['stats'],
            refreshers,
            reason: 'employee-mutated'
        });
    }

    async function afterDepartmentMutation({ reason = 'department-mutated', successMessage = '' } = {}) {
        await runMutationFollowUp({
            successMessage,
            cacheKeys: ['stats'],
            refreshers: [bumpDepartmentsRefresh, bumpEmployeesRefresh],
            reason
        });
    }

    async function afterPositionMutation({ reason = 'position-mutated', successMessage = '' } = {}) {
        await runMutationFollowUp({
            successMessage,
            cacheKeys: ['stats'],
            refreshers: [bumpPositionsRefresh, bumpEmployeesRefresh],
            reason
        });
    }

    async function afterDevelopmentOnboardingMutation({ successMessage = '' } = {}) {
        await runMutationFollowUp({
            successMessage,
            cacheKeys: ['development', 'onboarding'],
            reason: 'development-onboarding-mutated'
        });
    }

    const fabActions = {
        employees: openEmployeeCreate,
        departments: openDepartmentCreate,
        positions: openPositionCreate,
        development: openGoalCreate,
        onboarding: openTaskCreate
    };

    function handleFab() {
        const action = fabActions[currentPageRef.current] || openEmployeeCreate;
        action();
    }

    return {
        confirmDeleteState,
        developmentOnboardingModalState,
        employeeModalState,
        organizationModalState,
        afterDepartmentMutation,
        afterDevelopmentOnboardingMutation,
        afterEmployeeMutation,
        afterPositionMutation,
        closeConfirmDelete,
        closeDevelopmentOnboardingModal,
        closeEmployeeModal,
        closeOrganizationModal,
        confirmDelete,
        editDepartment,
        editEmployee,
        editFeedback,
        editGoal,
        editMeeting,
        editPosition,
        editTask,
        ensureAdminAction,
        handleFab,
        moveRecord,
        openDepartmentCreate,
        openEmployeeCreate,
        openFeedbackCreate,
        openGoalCreate,
        openMeetingCreate,
        openPositionCreate,
        openTaskCreate,
        resetActionState
    };
}
