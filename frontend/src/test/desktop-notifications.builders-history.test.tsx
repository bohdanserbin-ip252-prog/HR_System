import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REMINDER_COOLDOWN_MS,
  buildDesktopReminderPayloads,
  getDesktopNotificationsPreference,
  getUnseenReminderNotifications,
  rememberReminderNotification,
  setDesktopNotificationsPreference,
} from '../desktopNotifications.ts';
import {
  applyBaseDomSetup,
  cleanupNotificationMock,
  installNotificationMock
} from './desktop-notifications.helpers.ts';

beforeEach(() => {
  applyBaseDomSetup();
});

afterEach(() => {
  cleanupNotificationMock();
});

describe('desktop notifications builders and history', () => {
  it('builds reminder payloads from development and onboarding deadlines', () => {
    const reminders = buildDesktopReminderPayloads({
      today: '2026-04-03',
      development: {
        goals: [
          { id: 7, title: 'Оновити матрицю компетенцій', dueDate: '2026-04-03', status: 'in-progress' },
          { id: 8, title: 'Закрити прострочену ціль', dueDate: '2026-04-01', status: 'on-track' }
        ],
        meetings: [{ id: 3, title: '1:1 з командою', date: '2026-04-04' }]
      },
      onboarding: {
        tasks: [
          {
            id: 4,
            title: 'Зустріч з наставником',
            dueDate: '2026-04-03',
            status: 'active',
            priority: true
          }
        ]
      }
    });

    expect(reminders).toHaveLength(4);
    expect(reminders.map(reminder => reminder.id)).toEqual([
      'development-goal-overdue:8:2026-04-01',
      'development-goal-due-today:7:2026-04-03',
      'onboarding-task-due-today:4:2026-04-03',
      'development-meeting-tomorrow:3:2026-04-04'
    ]);
  });

  it('skips syntactically formatted but impossible calendar dates', () => {
    const reminders = buildDesktopReminderPayloads({
      today: '2026-04-01',
      development: {
        goals: [
          { id: 1, title: 'Impossible goal', dueDate: '2026-04-31', status: 'in-progress' },
          { id: 2, title: 'Real goal', dueDate: '2026-04-03', status: 'in-progress' }
        ],
        meetings: [{ id: 3, title: 'Impossible meeting', date: '2026-02-29' }]
      },
      onboarding: {
        tasks: [{ id: 4, title: 'Impossible task', dueDate: '2026-13-01', status: 'active' }]
      }
    });

    expect(reminders.map(reminder => reminder.id)).toEqual([
      'development-goal-due-soon:2:2026-04-03'
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

  it('does not hide unseen reminders behind already-seen high priority reminders', () => {
    const allReminders = buildDesktopReminderPayloads({
      today: '2026-04-05',
      development: {
        goals: [
          { id: 1, title: 'A overdue', dueDate: '2026-04-01', status: 'in-progress' },
          { id: 2, title: 'B overdue', dueDate: '2026-04-01', status: 'in-progress' },
          { id: 3, title: 'C overdue', dueDate: '2026-04-01', status: 'in-progress' },
          { id: 4, title: 'D overdue', dueDate: '2026-04-01', status: 'in-progress' }
        ],
        meetings: []
      },
      onboarding: { tasks: [] }
    });

    const now = 2_000;
    allReminders.slice(0, 3).forEach(reminder => {
      rememberReminderNotification(reminder.id, { now });
    });

    expect(getUnseenReminderNotifications(allReminders, { now: now + 100 }).map(reminder => reminder.id)).toEqual([
      'development-goal-overdue:4:2026-04-01'
    ]);
  });

  it('persists desktop notification preference in local storage', () => {
    installNotificationMock({ permission: 'default' });

    expect(getDesktopNotificationsPreference()).toBe(false);
    expect(setDesktopNotificationsPreference(true)).toBe(true);
    expect(getDesktopNotificationsPreference()).toBe(true);
    expect(setDesktopNotificationsPreference(false)).toBe(false);
    expect(getDesktopNotificationsPreference()).toBe(false);
  });

  it('treats blocked localStorage as unavailable instead of throwing', () => {
    installNotificationMock({ permission: 'default' });
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked localStorage');
      }
    });

    try {
      expect(getDesktopNotificationsPreference()).toBe(false);
      expect(setDesktopNotificationsPreference(true)).toBe(true);
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
    }
  });
});
