import { PAGE_ORDER, SIDEBAR_ITEMS, TOP_NAV_ITEMS } from './app/pageRegistry.tsx';

const CURRENT_PAGE_STORAGE_KEY = 'hr-system.currentPage';
const PROFILE_EMPLOYEE_ID_STORAGE_KEY = 'hr-system.profileEmployeeId';
const DEFAULT_PAGE = 'dashboard';

function getStorage() {
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function normalizePage(page) {
  return PAGE_ORDER.includes(page) ? page : DEFAULT_PAGE;
}

export function normalizeProfileEmployeeId(employeeId) {
  if (employeeId === null || employeeId === undefined || employeeId === '') return null;
  const numericId = Number(employeeId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

export function readStoredCurrentPage() {
  const storage = getStorage();
  if (!storage) return DEFAULT_PAGE;

  try {
    return normalizePage(storage.getItem(CURRENT_PAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_PAGE;
  }
}

export function readStoredProfileEmployeeId() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return normalizeProfileEmployeeId(storage.getItem(PROFILE_EMPLOYEE_ID_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredCurrentPage(page) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(CURRENT_PAGE_STORAGE_KEY, normalizePage(page));
  } catch {
    // Ignore storage failures in unsupported/private modes.
  }
}

export function writeStoredProfileEmployeeId(employeeId) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const normalizedId = normalizeProfileEmployeeId(employeeId);
    if (normalizedId === null) {
      storage.removeItem(PROFILE_EMPLOYEE_ID_STORAGE_KEY);
      return;
    }
    storage.setItem(PROFILE_EMPLOYEE_ID_STORAGE_KEY, String(normalizedId));
  } catch {
    // Ignore storage failures in unsupported/private modes.
  }
}

export { PAGE_ORDER, SIDEBAR_ITEMS, TOP_NAV_ITEMS };
