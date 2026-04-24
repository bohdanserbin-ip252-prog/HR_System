import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDesktopNotificationPermission } from '../desktopNotifications.js';
import { NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY } from '../desktopNotifications/constants.js';
import {
  applyBaseDomSetup,
  cleanupNotificationMock,
  installNotificationMock
} from './desktop-notifications.helpers.js';

beforeEach(() => {
  vi.clearAllMocks();
  applyBaseDomSetup();
});

afterEach(() => {
  cleanupNotificationMock();
});

describe('desktop notification permission', () => {
  it('requests browser permission only once when state is default', async () => {
    const permissionMock = vi.fn(async () => 'granted');
    const { requestPermission } = installNotificationMock({
      permission: 'default',
      requestPermission: permissionMock
    });

    await expect(ensureDesktopNotificationPermission()).resolves.toBe('granted');
    await expect(ensureDesktopNotificationPermission()).resolves.toBe('granted');

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(permissionMock).toHaveBeenCalledTimes(1);
  });

  it('can force a new permission request from user action when prompt was already marked', async () => {
    const permissionMock = vi.fn(async () => 'granted');
    const { requestPermission } = installNotificationMock({
      permission: 'default',
      requestPermission: permissionMock
    });

    localStorage.setItem(
      NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY,
      JSON.stringify({ prompted: true, requestedAt: Date.now() - 1_000 })
    );

    await expect(ensureDesktopNotificationPermission()).resolves.toBe('default');
    await expect(ensureDesktopNotificationPermission({ forcePrompt: true })).resolves.toBe('granted');

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(permissionMock).toHaveBeenCalledTimes(1);
  });
});
