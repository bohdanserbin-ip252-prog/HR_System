import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.tsx';
import ActivityInboxTab from '../components/ActivityInboxTab.tsx';
import { getTodayInputValue } from '../developmentOnboardingFormUtils.ts';
import { useDesktopNotificationController } from '../hooks/useDesktopNotificationController.ts';
import {
  applyBaseDomSetup,
  cleanupNotificationMock,
  installNotificationMock,
} from './desktop-notifications.helpers.ts';

const mockLoadDevelopmentSnapshot = vi.fn();
const mockLoadOnboardingSnapshot = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../appRuntime.ts', () => ({
  loadDevelopmentSnapshot: (...args) => mockLoadDevelopmentSnapshot(...args),
  loadOnboardingSnapshot: (...args) => mockLoadOnboardingSnapshot(...args),
}));

vi.mock('../toast.ts', () => ({
  showToast: (...args) => mockShowToast(...args)
}));

function renderInbox() {
  return render(
    <AppContextProvider
      actions={{ handleUnauthorized: vi.fn() }}
      state={{}}
    >
      <ActivityInboxTab isActive={true} />
    </AppContextProvider>
  );
}

describe('Activity inbox reminder integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyBaseDomSetup();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [],
      text: async () => '[]',
    }));
  });

  afterEach(() => {
    cleanupNotificationMock();
  });

  it('shows desktop reminder items inside the inbox after they are emitted', async () => {
    const today = getTodayInputValue();
    installNotificationMock({ permission: 'default' });

    mockLoadDevelopmentSnapshot.mockResolvedValue({ goals: [], meetings: [] });
    mockLoadOnboardingSnapshot.mockResolvedValue({
      tasks: [
        {
          id: 51,
          title: 'Підписати welcome checklist',
          dueDate: today,
          status: 'active',
          priority: true
        }
      ]
    });

    renderHook(() =>
      useDesktopNotificationController({
        authStatus: 'authenticated',
        currentUser: { id: 1, username: 'admin' },
        desktopNotificationsEnabled: false,
        onUnauthorized: vi.fn()
      })
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });

    renderInbox();

    await waitFor(() => {
      expect(screen.getByText('Задача адаптації на сьогодні')).toBeInTheDocument();
      expect(screen.getByText(/welcome checklist/i)).toBeInTheDocument();
    });
  });
});
