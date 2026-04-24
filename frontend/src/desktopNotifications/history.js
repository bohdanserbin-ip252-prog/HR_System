import {
  HISTORY_TTL_MS,
  NOTIFICATION_HISTORY_STORAGE_KEY,
  REMINDER_COOLDOWN_MS
} from './constants.js';
import { readStorageObject, writeStorageObject } from './storage.js';
import { normalizeArray } from './reminders.js';

function pruneReminderHistory(history, now) {
  return Object.entries(history || {}).reduce((nextHistory, [reminderId, timestamp]) => {
    const numericTimestamp = Number(timestamp);
    if (!Number.isFinite(numericTimestamp)) return nextHistory;
    if (now - numericTimestamp > HISTORY_TTL_MS) return nextHistory;
    nextHistory[reminderId] = numericTimestamp;
    return nextHistory;
  }, {});
}

function getReminderHistory(now = Date.now()) {
  const history = pruneReminderHistory(readStorageObject(NOTIFICATION_HISTORY_STORAGE_KEY), now);
  writeStorageObject(NOTIFICATION_HISTORY_STORAGE_KEY, history);
  return history;
}

export function getUnseenReminderNotifications(
  reminders,
  { now = Date.now(), cooldownMs = REMINDER_COOLDOWN_MS } = {}
) {
  const history = getReminderHistory(now);
  return normalizeArray(reminders).filter(reminder => {
    const lastShownAt = history[reminder.id];
    if (!Number.isFinite(lastShownAt)) return true;
    return now - lastShownAt >= cooldownMs;
  });
}

export function rememberReminderNotification(reminderId, { now = Date.now() } = {}) {
  const history = getReminderHistory(now);
  history[reminderId] = now;
  writeStorageObject(NOTIFICATION_HISTORY_STORAGE_KEY, history);
}
