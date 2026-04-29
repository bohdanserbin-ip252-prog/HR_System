import { invalidateRuntimeCache } from '../../appRuntime.ts';
import { showToast } from '../../toast.ts';

export function createAdminGuard(currentUserRef) {
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

  return { ensureAdminAction, withAdminAction };
}

export function invalidateCacheKeys(keys = []) {
  if (keys.length > 0) invalidateRuntimeCache(...keys);
}

export function createAdminModalAction(withAdminAction, setter, buildState) {
  return (...args) => {
    withAdminAction(() => setter(buildState(...args)));
  };
}

export function handleEmployeeDeleteFromProfile({
  currentPageRef,
  setProfileEmployeeId,
  bumpProfileRefresh,
  setCurrentPage
}) {
  if (currentPageRef.current !== 'profile') return;

  setProfileEmployeeId(null);
  bumpProfileRefresh();
  currentPageRef.current = 'employees';
  setCurrentPage('employees');
}

export function applyDeleteLocalEffects(type, deps) {
  const {
    bumpDepartmentsRefresh,
    bumpEmployeesRefresh,
    bumpPositionsRefresh,
    currentPageRef,
    setProfileEmployeeId,
    bumpProfileRefresh,
    setCurrentPage
  } = deps;

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
    handleEmployeeDeleteFromProfile({
      currentPageRef,
      setProfileEmployeeId,
      bumpProfileRefresh,
      setCurrentPage
    });
  }
}

export async function runMutationFollowUp({
  successMessage = '',
  cacheKeys = [],
  refreshers = [],
  reason,
  refreshAll
}) {
  if (successMessage) showToast(successMessage, 'success');
  invalidateCacheKeys(cacheKeys);
  refreshers.forEach(refresh => refresh());
  await refreshAll(reason);
}
