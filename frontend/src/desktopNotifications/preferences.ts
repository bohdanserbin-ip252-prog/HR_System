import {
  DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY,
  NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY
} from './constants.ts';
import { hasDocument, isDesktopNotificationSupported } from './env.ts';
import { readStorageObject, writeStorageObject } from './storage.ts';

export function getDesktopNotificationsPreference() {
  if (!isDesktopNotificationSupported()) return false;

  const settings = readStorageObject(DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY);
  return settings.enabled === true;
}

export function setDesktopNotificationsPreference(enabled) {
  const normalizedValue = Boolean(enabled) && isDesktopNotificationSupported();

  writeStorageObject(DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY, {
    enabled: normalizedValue,
    updatedAt: Date.now()
  });

  return normalizedValue;
}

export function getDesktopNotificationPermission() {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return window.Notification.permission || 'default';
}

export async function ensureDesktopNotificationPermission({ forcePrompt = false } = {}) {
  if (!isDesktopNotificationSupported()) return 'unsupported';

  const currentPermission = getDesktopNotificationPermission();
  if (currentPermission !== 'default') return currentPermission;

  const promptState = readStorageObject(NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY);
  if (promptState.prompted && !forcePrompt) return getDesktopNotificationPermission();

  writeStorageObject(NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY, {
    prompted: true,
    requestedAt: Date.now()
  });

  if (typeof window.Notification.requestPermission !== 'function') {
    return getDesktopNotificationPermission();
  }

  try {
    const permissionResult = window.Notification.requestPermission();
    return typeof permissionResult === 'string' ? permissionResult : await permissionResult;
  } catch {
    return getDesktopNotificationPermission();
  }
}

export function shouldUseDesktopNotifications() {
  if (!hasDocument()) return false;

  const isHidden = document.visibilityState === 'hidden';
  const isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  return isHidden || !isFocused;
}
