import {
  HISTORY_TTL_MS,
  REMINDER_INBOX_STORAGE_KEY,
  REMINDER_INBOX_UPDATED_EVENT,
} from './constants.js';
import { hasWindow } from './env.js';
import { readStorageObject, writeStorageObject } from './storage.js';

function pruneReminderInboxItems(items, now = Date.now()) {
  return items.filter(item => {
    const createdAt = Date.parse(item?.createdAt || '');
    return Number.isFinite(createdAt) && now - createdAt <= HISTORY_TTL_MS;
  });
}

function readReminderInboxItems() {
  const storedState = readStorageObject(REMINDER_INBOX_STORAGE_KEY);
  const items = Array.isArray(storedState.items) ? storedState.items : [];
  return pruneReminderInboxItems(items);
}

function dispatchReminderInboxUpdated() {
  if (!hasWindow()) return;
  window.dispatchEvent(new Event(REMINDER_INBOX_UPDATED_EVENT));
}

function writeReminderInboxItems(items) {
  writeStorageObject(REMINDER_INBOX_STORAGE_KEY, { items });
  dispatchReminderInboxUpdated();
}

export function listReminderInboxNotifications() {
  return readReminderInboxItems()
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function storeReminderInboxNotification(reminder, { now = Date.now() } = {}) {
  if (!reminder?.id) return null;

  const nextItem = {
    id: `reminder:${reminder.id}`,
    reminderId: reminder.id,
    title: reminder.title,
    body: reminder.message,
    severity: reminder.severity || 'info',
    source: 'reminder',
    targetType: 'reminder',
    targetId: null,
    createdAt: new Date(now).toISOString(),
    readAt: null,
  };

  const items = readReminderInboxItems().filter(item => item.id !== nextItem.id);
  writeReminderInboxItems([...items, nextItem]);
  return nextItem;
}

export function markReminderInboxNotificationRead(notificationId, { now = Date.now() } = {}) {
  const items = readReminderInboxItems().map(item =>
    item.id === notificationId && !item.readAt
      ? { ...item, readAt: new Date(now).toISOString() }
      : item
  );
  writeReminderInboxItems(items);
}

export function markAllReminderInboxNotificationsRead({ now = Date.now() } = {}) {
  const readAt = new Date(now).toISOString();
  const items = readReminderInboxItems().map(item =>
    item.readAt ? item : { ...item, readAt }
  );
  writeReminderInboxItems(items);
}

export function getReminderInboxUnreadCount() {
  return readReminderInboxItems().filter(item => !item.readAt).length;
}

export function subscribeToReminderInboxNotifications(onChange) {
  if (!hasWindow()) return () => {};

  const handleWindowUpdate = event => {
    if (event.type === 'storage' && event.key !== REMINDER_INBOX_STORAGE_KEY) return;
    onChange(listReminderInboxNotifications());
  };

  window.addEventListener(REMINDER_INBOX_UPDATED_EVENT, handleWindowUpdate);
  window.addEventListener('storage', handleWindowUpdate);

  return () => {
    window.removeEventListener(REMINDER_INBOX_UPDATED_EVENT, handleWindowUpdate);
    window.removeEventListener('storage', handleWindowUpdate);
  };
}
