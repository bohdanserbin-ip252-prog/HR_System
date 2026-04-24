export const REMINDER_POLL_INTERVAL_MS = 15_000;
export const REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const MAX_REMINDERS_PER_CHECK = 3;
export const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const NOTIFICATION_HISTORY_STORAGE_KEY = 'hr-system.desktop-notification-history';
export const NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY = 'hr-system.desktop-notification-prompted';
export const DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY = 'hr-system.desktop-notifications-settings';
export const REMINDER_INBOX_STORAGE_KEY = 'hr-system.desktop-reminder-inbox';
export const REMINDER_INBOX_UPDATED_EVENT = 'hr-system:desktop-reminder-inbox-updated';

export const SEVERITY_ORDER = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3
};
