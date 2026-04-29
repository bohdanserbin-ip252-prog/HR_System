import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayInputValue } from '../developmentOnboardingFormUtils.ts';
import { useDesktopNotificationController } from '../hooks/useDesktopNotificationController.ts';
import {
  applyBaseDomSetup,
  cleanupNotificationMock,
  installNotificationMock,
  setDocumentFocus,
  setVisibilityState
} from './desktop-notifications.helpers.ts';

const mockLoadDevelopmentSnapshot = vi.fn();
const mockLoadOnboardingSnapshot = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../appRuntime.ts', () => ({
  loadDevelopmentSnapshot: (...args) => mockLoadDevelopmentSnapshot(...args),
  loadOnboardingSnapshot: (...args) => mockLoadOnboardingSnapshot(...args)
}));

vi.mock('../toast.ts', () => ({
  showToast: (...args) => mockShowToast(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  applyBaseDomSetup();
});

afterEach(() => {
  cleanupNotificationMock();
});

describe('desktop notification controller', () => {
  it('shows in-app toast reminders while the page is visible', async () => {
    const today = getTodayInputValue();
    const { instances, requestPermission } = installNotificationMock({ permission: 'default' });
    mockLoadDevelopmentSnapshot.mockResolvedValue({ goals: [], meetings: [] });
    mockLoadOnboardingSnapshot.mockResolvedValue({
      tasks: [
        {
          id: 11,
          title: 'Зустріч з наставником',
          dueDate: today,
          status: 'active',
          priority: true
        }
      ]
    });

    const { unmount } = renderHook(() =>
      useDesktopNotificationController({
        authStatus: 'authenticated',
        currentUser: { id: 1, username: 'admin' },
        desktopNotificationsEnabled: false,
        onUnauthorized: vi.fn()
      })
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Задача адаптації на сьогодні'),
        'success'
      );
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(instances).toHaveLength(0);
    unmount();
  });

  it('shows desktop notifications while the page is hidden and toggle is enabled', async () => {
    const today = getTodayInputValue();
    const { instances, requestPermission } = installNotificationMock({ permission: 'granted' });
    setVisibilityState('hidden');

    mockLoadDevelopmentSnapshot.mockResolvedValue({
      goals: [],
      meetings: [{ id: 12, title: 'Щотижнева 1:1 зустріч', date: today }]
    });
    mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

    const { unmount } = renderHook(() =>
      useDesktopNotificationController({
        authStatus: 'authenticated',
        currentUser: { id: 2, username: 'viewer' },
        desktopNotificationsEnabled: true,
        onUnauthorized: vi.fn()
      })
    );

    await waitFor(() => {
      expect(instances).toHaveLength(1);
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(instances[0]).toMatchObject({
      title: 'Запланована зустріч на сьогодні',
      options: expect.objectContaining({ body: expect.stringContaining('Щотижнева 1:1 зустріч') })
    });
    expect(mockShowToast).not.toHaveBeenCalled();
    unmount();
  });

  it('shows desktop notifications while window is unfocused even if tab stays visible', async () => {
    const today = getTodayInputValue();
    const { instances, requestPermission } = installNotificationMock({ permission: 'granted' });
    setDocumentFocus(false);

    mockLoadDevelopmentSnapshot.mockResolvedValue({
      goals: [],
      meetings: [{ id: 18, title: 'Check-in з менеджером', date: today }]
    });
    mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

    const { unmount } = renderHook(() =>
      useDesktopNotificationController({
        authStatus: 'authenticated',
        currentUser: { id: 4, username: 'viewer' },
        desktopNotificationsEnabled: true,
        onUnauthorized: vi.fn()
      })
    );

    await waitFor(() => {
      expect(instances).toHaveLength(1);
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    unmount();
  });

  it('stays silent in hidden tabs when desktop notifications are disabled', async () => {
    const today = getTodayInputValue();
    const { instances, requestPermission } = installNotificationMock({ permission: 'granted' });
    setVisibilityState('hidden');

    mockLoadDevelopmentSnapshot.mockResolvedValue({
      goals: [],
      meetings: [{ id: 22, title: 'Синхронізація з HRBP', date: today }]
    });
    mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

    const { unmount } = renderHook(() =>
      useDesktopNotificationController({
        authStatus: 'authenticated',
        currentUser: { id: 3, username: 'viewer' },
        desktopNotificationsEnabled: false,
        onUnauthorized: vi.fn()
      })
    );

    await waitFor(() => {
      expect(mockLoadDevelopmentSnapshot).toHaveBeenCalled();
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(instances).toHaveLength(0);
    expect(mockShowToast).not.toHaveBeenCalled();
    unmount();
  });

  it('does not restart reminder polling when only onUnauthorized identity changes', async () => {
    installNotificationMock({ permission: 'granted' });
    mockLoadDevelopmentSnapshot.mockResolvedValue({ goals: [], meetings: [] });
    mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

    const { rerender, unmount } = renderHook(
      ({ onUnauthorized }) =>
        useDesktopNotificationController({
          authStatus: 'authenticated',
          currentUser: { id: 5, username: 'admin' },
          desktopNotificationsEnabled: true,
          onUnauthorized
        }),
      { initialProps: { onUnauthorized: vi.fn() } }
    );

    await waitFor(() => {
      expect(mockLoadDevelopmentSnapshot).toHaveBeenCalledTimes(1);
      expect(mockLoadOnboardingSnapshot).toHaveBeenCalledTimes(1);
    });

    mockLoadDevelopmentSnapshot.mockClear();
    mockLoadOnboardingSnapshot.mockClear();
    rerender({ onUnauthorized: vi.fn() });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockLoadDevelopmentSnapshot).not.toHaveBeenCalled();
    expect(mockLoadOnboardingSnapshot).not.toHaveBeenCalled();
    unmount();
  });
});
