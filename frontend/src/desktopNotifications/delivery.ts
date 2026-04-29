import { getDesktopNotificationPermission } from './preferences.ts';
import { isDesktopNotificationSupported } from './env.ts';

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
