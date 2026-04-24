import { getDesktopNotificationPermission } from './preferences.js';
import { isDesktopNotificationSupported } from './env.js';

export function getToastTypeForReminder(reminder) {
  return reminder?.severity === 'error' ? 'error' : 'success';
}

export function showDesktopNotification(reminder) {
  if (!reminder || getDesktopNotificationPermission() !== 'granted' || !isDesktopNotificationSupported()) {
    return null;
  }

  const notification = new window.Notification(reminder.title, {
    body: reminder.message,
    tag: reminder.tag,
    renotify: false
  });

  if (typeof notification.close === 'function') {
    window.setTimeout(() => notification.close(), 10_000);
  }

  return notification;
}
