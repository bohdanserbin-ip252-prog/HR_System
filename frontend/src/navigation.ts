import { PAGE_ORDER, SIDEBAR_ITEMS, TOP_NAV_ITEMS } from './app/pageRegistry.tsx';

const CURRENT_PAGE_STORAGE_KEY = 'hr-system.currentPage';
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

export function readStoredCurrentPage() {
  const storage = getStorage();
  if (!storage) return DEFAULT_PAGE;

  try {
    return normalizePage(storage.getItem(CURRENT_PAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_PAGE;
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

export { PAGE_ORDER, SIDEBAR_ITEMS, TOP_NAV_ITEMS };
