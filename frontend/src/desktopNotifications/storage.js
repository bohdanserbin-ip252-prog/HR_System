import { hasWindow } from './env.js';

function getStorage() {
  if (!hasWindow()) return null;

  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function readStorageObject(key) {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStorageObject(key, value) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in unsupported/private modes.
  }
}
