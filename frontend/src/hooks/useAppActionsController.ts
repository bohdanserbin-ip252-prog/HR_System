import { useState } from 'react';
import { getFabActionForPage } from '../app/pageRegistry.tsx';
import {
  CLOSED_CONFIRM_DELETE_STATE,
  CLOSED_COMPLAINT_MODAL_STATE,
  CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE,
  CLOSED_EMPLOYEE_MODAL_STATE,
  CLOSED_ORGANIZATION_MODAL_STATE
} from '../appStateBuilders.ts';
import { fetchRuntimeJSON } from '../appRuntime.ts';
import { showToast } from '../toast.ts';
import { getErrorMessage } from '../uiUtils.ts';
import {
  DELETE_CACHE_KEYS,
  DELETE_ENDPOINTS,
  MOVE_CACHE_KEYS,
  MOVE_ENDPOINTS
} from './appActions/constants.ts';
import {
  applyDeleteLocalEffects,
  createAdminGuard,
  createAdminModalAction,
  invalidateCacheKeys,
  runMutationFollowUp
} from './appActions/helpers.ts';

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
  const [complaintModalState, setComplaintModalState] = useState(CLOSED_COMPLAINT_MODAL_STATE);
  const [organizationModalState, setOrganizationModalState] = useState(CLOSED_ORGANIZATION_MODAL_STATE);
  const [developmentOnboardingModalState, setDevelopmentOnboardingModalState] = useState(
    CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE
  );

  const { ensureAdminAction, withAdminAction } = createAdminGuard(currentUserRef);

  function resetActionState() {
    setConfirmDeleteState(CLOSED_CONFIRM_DELETE_STATE);
    setComplaintModalState(CLOSED_COMPLAINT_MODAL_STATE);
    setEmployeeModalState(CLOSED_EMPLOYEE_MODAL_STATE);
    setOrganizationModalState(CLOSED_ORGANIZATION_MODAL_STATE);
    setDevelopmentOnboardingModalState(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE);
  }

  const closeConfirmDelete = () => setConfirmDeleteState(CLOSED_CONFIRM_DELETE_STATE);
  const closeComplaintModal = () => setComplaintModalState(CLOSED_COMPLAINT_MODAL_STATE);
  const closeEmployeeModal = () => setEmployeeModalState(CLOSED_EMPLOYEE_MODAL_STATE);
  const closeOrganizationModal = () => setOrganizationModalState(CLOSED_ORGANIZATION_MODAL_STATE);
  const closeDevelopmentOnboardingModal = () =>
    setDevelopmentOnboardingModalState(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE);

  const openEmployeeCreate = createAdminModalAction(withAdminAction, setEmployeeModalState, () => ({ isOpen: true, mode: 'create', employeeId: null }));
  const editEmployee = createAdminModalAction(withAdminAction, setEmployeeModalState, employeeId => ({ isOpen: true, mode: 'edit', employeeId }));
  const openDepartmentCreate = createAdminModalAction(withAdminAction, setOrganizationModalState, () => ({ type: 'department', mode: 'create', entityId: null }));
  const editDepartment = createAdminModalAction(withAdminAction, setOrganizationModalState, departmentId => ({ type: 'department', mode: 'edit', entityId: departmentId }));
  const openPositionCreate = createAdminModalAction(withAdminAction, setOrganizationModalState, () => ({ type: 'position', mode: 'create', entityId: null }));
  const editPosition = createAdminModalAction(withAdminAction, setOrganizationModalState, positionId => ({ type: 'position', mode: 'edit', entityId: positionId }));
  const openGoalCreate = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, () => ({ type: 'goal', mode: 'create', entityId: null }));
  const editGoal = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, goalId => ({ type: 'goal', mode: 'edit', entityId: goalId }));
  const openFeedbackCreate = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, () => ({ type: 'feedback', mode: 'create', entityId: null }));
  const editFeedback = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, feedbackId => ({ type: 'feedback', mode: 'edit', entityId: feedbackId }));
  const openMeetingCreate = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, () => ({ type: 'meeting', mode: 'create', entityId: null }));
  const editMeeting = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, meetingId => ({ type: 'meeting', mode: 'edit', entityId: meetingId }));
  const openTaskCreate = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, () => ({ type: 'task', mode: 'create', entityId: null }));
  const editTask = createAdminModalAction(withAdminAction, setDevelopmentOnboardingModalState, taskId => ({ type: 'task', mode: 'edit', entityId: taskId }));
  const openComplaintCreate = () => setComplaintModalState({ isOpen: true, mode: 'create', complaintId: null });
  const editComplaint = createAdminModalAction(withAdminAction, setComplaintModalState, complaintId => ({ isOpen: true, mode: 'edit', complaintId }));

  async function moveRecord(type, id, direction) {
    if (!ensureAdminAction()) return;

    try {
      await fetchRuntimeJSON(MOVE_ENDPOINTS[type](id), {
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

  async function executeDelete(type, id) {
    if (!ensureAdminAction()) return;

    await fetchRuntimeJSON(DELETE_ENDPOINTS[type](id), {
      method: 'DELETE',
      onUnauthorized
    });

    applyDeleteLocalEffects(type, {
      bumpDepartmentsRefresh,
      bumpEmployeesRefresh,
      bumpPositionsRefresh,
      currentPageRef,
      setProfileEmployeeId,
      bumpProfileRefresh,
      setCurrentPage
    });

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

  const afterEmployeeMutation = async ({ successMessage = '' } = {}) => {
    const refreshers = [bumpEmployeesRefresh];
    if (currentPageRef.current === 'profile') refreshers.push(bumpProfileRefresh);
    await runMutationFollowUp({ successMessage, cacheKeys: ['stats'], refreshers, reason: 'employee-mutated', refreshAll });
  };

  const afterDepartmentMutation = async ({ reason = 'department-mutated', successMessage = '' } = {}) => {
    await runMutationFollowUp({ successMessage, cacheKeys: ['stats'], refreshers: [bumpDepartmentsRefresh, bumpEmployeesRefresh], reason, refreshAll });
  };

  const afterPositionMutation = async ({ reason = 'position-mutated', successMessage = '' } = {}) => {
    await runMutationFollowUp({ successMessage, cacheKeys: ['stats'], refreshers: [bumpPositionsRefresh, bumpEmployeesRefresh], reason, refreshAll });
  };

  const afterDevelopmentOnboardingMutation = async ({ successMessage = '' } = {}) => {
    await runMutationFollowUp({
      successMessage,
      cacheKeys: ['development', 'onboarding'],
      reason: 'development-onboarding-mutated',
      refreshAll
    });
  };

  const afterComplaintMutation = async ({ successMessage = '' } = {}) => {
    await runMutationFollowUp({
      successMessage,
      cacheKeys: ['complaints'],
      reason: 'complaint-mutated',
      refreshAll
    });
  };

  const fabActionHandlers = {
    openComplaintCreate,
    openDepartmentCreate,
    openEmployeeCreate,
    openGoalCreate,
    openPositionCreate,
    openTaskCreate
  };

  function handleFab() {
    const actionKey = getFabActionForPage(currentPageRef.current);
    const action = (actionKey && fabActionHandlers[actionKey]) || openEmployeeCreate;
    action();
  }

  return {
    complaintModalState,
    confirmDeleteState,
    developmentOnboardingModalState,
    employeeModalState,
    organizationModalState,
    afterComplaintMutation,
    afterDepartmentMutation,
    afterDevelopmentOnboardingMutation,
    afterEmployeeMutation,
    afterPositionMutation,
    closeComplaintModal,
    closeConfirmDelete,
    closeDevelopmentOnboardingModal,
    closeEmployeeModal,
    closeOrganizationModal,
    confirmDelete,
    editComplaint,
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
    openComplaintCreate,
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
