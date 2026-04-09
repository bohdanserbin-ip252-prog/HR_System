import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    REMINDER_COOLDOWN_MS,
    buildDesktopReminderPayloads,
    ensureDesktopNotificationPermission,
    getDesktopNotificationsPreference,
    getUnseenReminderNotifications,
    rememberReminderNotification,
    setDesktopNotificationsPreference,
} from '../desktopNotifications.js';
import { useDesktopNotificationController } from '../hooks/useDesktopNotificationController.js';

const mockLoadDevelopmentSnapshot = vi.fn();
const mockLoadOnboardingSnapshot = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../appRuntime.js', () => ({
    loadDevelopmentSnapshot: (...args) => mockLoadDevelopmentSnapshot(...args),
    loadOnboardingSnapshot: (...args) => mockLoadOnboardingSnapshot(...args),
}));

vi.mock('../toast.js', () => ({
    showToast: (...args) => mockShowToast(...args),
}));

let visibilityState = 'visible';

function installStorageMock() {
    const values = new Map();
    const storage = {
        getItem: vi.fn(key => (values.has(key) ? values.get(key) : null)),
        setItem: vi.fn((key, value) => {
            values.set(String(key), String(value));
        }),
        removeItem: vi.fn(key => {
            values.delete(String(key));
        }),
        clear: vi.fn(() => {
            values.clear();
        }),
    };

    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        writable: true,
        value: storage,
    });
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: storage,
    });

    return storage;
}

function setVisibilityState(nextState) {
    visibilityState = nextState;
    document.dispatchEvent(new Event('visibilitychange'));
}

function installNotificationMock({ permission = 'granted', requestPermission } = {}) {
    const instances = [];
    const requestPermissionMock =
        requestPermission ||
        vi.fn(async () => {
            NotificationMock.permission = permission;
            return permission;
        });

    function NotificationMock(title, options) {
        const instance = {
            title,
            options,
            close: vi.fn(),
        };
        instances.push(instance);
        return instance;
    }

    NotificationMock.permission = permission;
    NotificationMock.requestPermission = vi.fn(async () => {
        const result = await requestPermissionMock();
        NotificationMock.permission = result;
        return result;
    });

    Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: NotificationMock,
    });

    return {
        instances,
        requestPermission: NotificationMock.requestPermission,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    installStorageMock();
    localStorage.clear();
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibilityState,
    });
});

afterEach(() => {
    localStorage.clear();
    delete window.Notification;
});

describe('desktop notifications', () => {
    it('builds reminder payloads from development and onboarding deadlines', () => {
        const reminders = buildDesktopReminderPayloads({
            today: '2026-04-03',
            development: {
                goals: [
                    { id: 7, title: 'Оновити матрицю компетенцій', dueDate: '2026-04-03', status: 'in-progress' },
                    { id: 8, title: 'Закрити прострочену ціль', dueDate: '2026-04-01', status: 'on-track' },
                ],
                meetings: [
                    { id: 3, title: '1:1 з командою', date: '2026-04-04' },
                ],
            },
            onboarding: {
                tasks: [
                    { id: 4, title: 'Зустріч з наставником', dueDate: '2026-04-03', status: 'active', priority: true },
                ],
            },
        });

        expect(reminders).toHaveLength(3);
        expect(reminders.map(reminder => reminder.id)).toEqual([
            'development-goal-overdue:8:2026-04-01',
            'development-goal-due-today:7:2026-04-03',
            'onboarding-task-due-today:4:2026-04-03',
        ]);
    });

    it('suppresses duplicate reminders until cooldown expires', () => {
        const reminders = [{ id: 'alpha-reminder', title: 'A', message: 'B', severity: 'info' }];
        const now = 1_000;

        expect(getUnseenReminderNotifications(reminders, { now })).toEqual(reminders);

        rememberReminderNotification('alpha-reminder', { now });

        expect(getUnseenReminderNotifications(reminders, { now: now + 100 })).toEqual([]);
        expect(getUnseenReminderNotifications(reminders, { now: now + REMINDER_COOLDOWN_MS + 1 })).toEqual(reminders);
    });

    it('persists desktop notification preference in local storage', () => {
        installNotificationMock({ permission: 'default' });

        expect(getDesktopNotificationsPreference()).toBe(false);
        expect(setDesktopNotificationsPreference(true)).toBe(true);
        expect(getDesktopNotificationsPreference()).toBe(true);
        expect(setDesktopNotificationsPreference(false)).toBe(false);
        expect(getDesktopNotificationsPreference()).toBe(false);
    });

    it('requests browser permission only once when state is default', async () => {
        const permissionMock = vi.fn(async () => 'granted');
        const { requestPermission } = installNotificationMock({
            permission: 'default',
            requestPermission: permissionMock,
        });

        await expect(ensureDesktopNotificationPermission()).resolves.toBe('granted');
        await expect(ensureDesktopNotificationPermission()).resolves.toBe('granted');

        expect(requestPermission).toHaveBeenCalledTimes(1);
        expect(permissionMock).toHaveBeenCalledTimes(1);
    });

    it('shows in-app toast reminders while the page is visible', async () => {
        const { instances, requestPermission } = installNotificationMock({ permission: 'default' });
        mockLoadDevelopmentSnapshot.mockResolvedValue({ goals: [], meetings: [] });
        mockLoadOnboardingSnapshot.mockResolvedValue({
            tasks: [
                {
                    id: 11,
                    title: 'Зустріч з наставником',
                    dueDate: '2026-04-03',
                    status: 'active',
                    priority: true,
                },
            ],
        });

        const { unmount } = renderHook(() =>
            useDesktopNotificationController({
                authStatus: 'authenticated',
                currentUser: { id: 1, username: 'admin' },
                desktopNotificationsEnabled: false,
                onUnauthorized: vi.fn(),
            }),
        );

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith(
                expect.stringContaining('Задача адаптації на сьогодні'),
                'success',
            );
        });

        expect(requestPermission).not.toHaveBeenCalled();
        expect(instances).toHaveLength(0);
        unmount();
    });

    it('shows desktop notifications while the page is hidden and toggle is enabled', async () => {
        const { instances, requestPermission } = installNotificationMock({ permission: 'granted' });
        setVisibilityState('hidden');

        mockLoadDevelopmentSnapshot.mockResolvedValue({
            goals: [],
            meetings: [
                {
                    id: 12,
                    title: 'Щотижнева 1:1 зустріч',
                    date: '2026-04-03',
                },
            ],
        });
        mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

        const { unmount } = renderHook(() =>
            useDesktopNotificationController({
                authStatus: 'authenticated',
                currentUser: { id: 2, username: 'viewer' },
                desktopNotificationsEnabled: true,
                onUnauthorized: vi.fn(),
            }),
        );

        await waitFor(() => {
            expect(instances).toHaveLength(1);
        });

        expect(requestPermission).not.toHaveBeenCalled();
        expect(instances[0]).toMatchObject({
            title: 'Запланована зустріч на сьогодні',
            options: expect.objectContaining({
                body: expect.stringContaining('Щотижнева 1:1 зустріч'),
            }),
        });
        expect(mockShowToast).not.toHaveBeenCalled();
        unmount();
    });

    it('stays silent in hidden tabs when desktop notifications are disabled', async () => {
        const { instances, requestPermission } = installNotificationMock({ permission: 'granted' });
        setVisibilityState('hidden');

        mockLoadDevelopmentSnapshot.mockResolvedValue({
            goals: [],
            meetings: [
                {
                    id: 22,
                    title: 'Синхронізація з HRBP',
                    date: '2026-04-03',
                },
            ],
        });
        mockLoadOnboardingSnapshot.mockResolvedValue({ tasks: [] });

        const { unmount } = renderHook(() =>
            useDesktopNotificationController({
                authStatus: 'authenticated',
                currentUser: { id: 3, username: 'viewer' },
                desktopNotificationsEnabled: false,
                onUnauthorized: vi.fn(),
            }),
        );

        await waitFor(() => {
            expect(mockLoadDevelopmentSnapshot).toHaveBeenCalled();
        });

        expect(requestPermission).not.toHaveBeenCalled();
        expect(instances).toHaveLength(0);
        expect(mockShowToast).not.toHaveBeenCalled();
        unmount();
    });
});
