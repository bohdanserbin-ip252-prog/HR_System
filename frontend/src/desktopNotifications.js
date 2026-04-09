import { getTodayInputValue } from './developmentOnboardingFormUtils.js';

export const REMINDER_POLL_INTERVAL_MS = 60_000;
export const REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const MAX_REMINDERS_PER_CHECK = 3;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NOTIFICATION_HISTORY_STORAGE_KEY = 'hr-system.desktop-notification-history';
const NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY = 'hr-system.desktop-notification-prompted';
const DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY = 'hr-system.desktop-notifications-settings';

const SEVERITY_ORDER = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3,
};

function hasWindow() {
    return typeof window !== 'undefined';
}

function hasDocument() {
    return typeof document !== 'undefined';
}

function isValidDateString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateParts(value) {
    if (!isValidDateString(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day };
}

function toUtcDayNumber(value) {
    const parts = parseDateParts(value);
    if (!parts) return null;
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

function differenceInDays(fromDate, toDate) {
    const fromDay = toUtcDayNumber(fromDate);
    const toDay = toUtcDayNumber(toDate);
    if (fromDay === null || toDay === null) return null;
    return toDay - fromDay;
}

function formatReminderDate(value) {
    const parts = parseDateParts(value);
    if (!parts) return value || '—';
    return `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}.${parts.year}`;
}

function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}

function compareReminders(left, right) {
    const severityDiff = (SEVERITY_ORDER[left.severity] ?? 99) - (SEVERITY_ORDER[right.severity] ?? 99);
    if (severityDiff !== 0) return severityDiff;
    return left.title.localeCompare(right.title, 'uk');
}

function createReminder({ id, title, message, severity = 'info' }) {
    return {
        id,
        tag: `hr-system:${id}`,
        title,
        message,
        severity,
    };
}

function buildGoalReminders(goals, today) {
    return normalizeArray(goals).flatMap(goal => {
        if (!goal?.id || !goal?.dueDate || goal?.status === 'completed') return [];

        const daysUntilDue = differenceInDays(today, goal.dueDate);
        if (daysUntilDue === null) return [];

        if (daysUntilDue < 0) {
            return [
                createReminder({
                    id: `development-goal-overdue:${goal.id}:${goal.dueDate}`,
                    title: 'Прострочена ціль розвитку',
                    message: `Ціль «${goal.title}» мала дедлайн ${formatReminderDate(goal.dueDate)}.`,
                    severity: 'error',
                }),
            ];
        }

        if (daysUntilDue === 0) {
            return [
                createReminder({
                    id: `development-goal-due-today:${goal.id}:${goal.dueDate}`,
                    title: 'Дедлайн цілі розвитку сьогодні',
                    message: `Ціль «${goal.title}» потрібно закрити сьогодні.`,
                    severity: 'warning',
                }),
            ];
        }

        if (daysUntilDue <= 3) {
            return [
                createReminder({
                    id: `development-goal-due-soon:${goal.id}:${goal.dueDate}`,
                    title: 'Наближається дедлайн цілі розвитку',
                    message: `До дедлайну цілі «${goal.title}» залишилось ${daysUntilDue} дн.`,
                    severity: 'info',
                }),
            ];
        }

        return [];
    });
}

function buildMeetingReminders(meetings, today) {
    return normalizeArray(meetings).flatMap(meeting => {
        if (!meeting?.id || !meeting?.date) return [];

        const daysUntilMeeting = differenceInDays(today, meeting.date);
        if (daysUntilMeeting === null || daysUntilMeeting < 0 || daysUntilMeeting > 1) return [];

        if (daysUntilMeeting === 0) {
            return [
                createReminder({
                    id: `development-meeting-today:${meeting.id}:${meeting.date}`,
                    title: 'Запланована зустріч на сьогодні',
                    message: `«${meeting.title}» відбудеться сьогодні (${formatReminderDate(meeting.date)}).`,
                    severity: 'info',
                }),
            ];
        }

        return [
            createReminder({
                id: `development-meeting-tomorrow:${meeting.id}:${meeting.date}`,
                title: 'Запланована зустріч на завтра',
                message: `«${meeting.title}» запланована на ${formatReminderDate(meeting.date)}.`,
                severity: 'info',
            }),
        ];
    });
}

function buildOnboardingTaskReminders(tasks, today) {
    return normalizeArray(tasks).flatMap(task => {
        if (!task?.id || !task?.dueDate || task?.status === 'completed') return [];

        const daysUntilDue = differenceInDays(today, task.dueDate);
        if (daysUntilDue === null) return [];

        if (daysUntilDue < 0) {
            return [
                createReminder({
                    id: `onboarding-task-overdue:${task.id}:${task.dueDate}`,
                    title: 'Прострочена задача адаптації',
                    message: `Задача «${task.title}» прострочена з ${formatReminderDate(task.dueDate)}.`,
                    severity: 'error',
                }),
            ];
        }

        if (daysUntilDue === 0) {
            return [
                createReminder({
                    id: `onboarding-task-due-today:${task.id}:${task.dueDate}`,
                    title: 'Задача адаптації на сьогодні',
                    message: `Задачу «${task.title}» потрібно виконати сьогодні.`,
                    severity: task.priority ? 'warning' : 'info',
                }),
            ];
        }

        if (task.priority && daysUntilDue === 1) {
            return [
                createReminder({
                    id: `onboarding-task-priority-tomorrow:${task.id}:${task.dueDate}`,
                    title: 'Пріоритетна задача адаптації на завтра',
                    message: `Задача «${task.title}» має дедлайн ${formatReminderDate(task.dueDate)}.`,
                    severity: 'info',
                }),
            ];
        }

        return [];
    });
}

function readStorageObject(key) {
    if (!hasWindow() || !window.localStorage) return {};

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeStorageObject(key, value) {
    if (!hasWindow() || !window.localStorage) return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage failures in unsupported/private modes.
    }
}

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

export function isDesktopNotificationSupported() {
    return hasWindow() && typeof window.Notification !== 'undefined';
}

export function getDesktopNotificationsPreference() {
    if (!isDesktopNotificationSupported()) return false;

    const settings = readStorageObject(DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY);
    return settings.enabled === true;
}

export function setDesktopNotificationsPreference(enabled) {
    const normalizedValue = Boolean(enabled) && isDesktopNotificationSupported();

    writeStorageObject(DESKTOP_NOTIFICATIONS_SETTINGS_STORAGE_KEY, {
        enabled: normalizedValue,
        updatedAt: Date.now(),
    });

    return normalizedValue;
}

export function getDesktopNotificationPermission() {
    if (!isDesktopNotificationSupported()) return 'unsupported';
    return window.Notification.permission || 'default';
}

export async function ensureDesktopNotificationPermission() {
    if (!isDesktopNotificationSupported()) return 'unsupported';

    const currentPermission = getDesktopNotificationPermission();
    if (currentPermission !== 'default') return currentPermission;

    const promptState = readStorageObject(NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY);
    if (promptState.prompted) return getDesktopNotificationPermission();

    writeStorageObject(NOTIFICATION_PERMISSION_PROMPT_STORAGE_KEY, { prompted: true, requestedAt: Date.now() });

    if (typeof window.Notification.requestPermission !== 'function') {
        return getDesktopNotificationPermission();
    }

    try {
        const permissionResult = window.Notification.requestPermission();
        return typeof permissionResult === 'string' ? permissionResult : await permissionResult;
    } catch {
        return getDesktopNotificationPermission();
    }
}

export function shouldUseDesktopNotifications() {
    if (!hasDocument()) return false;
    return document.visibilityState === 'hidden';
}

export function buildDesktopReminderPayloads({ development, onboarding, today = getTodayInputValue() } = {}) {
    const reminders = [
        ...buildGoalReminders(development?.goals, today),
        ...buildMeetingReminders(development?.meetings, today),
        ...buildOnboardingTaskReminders(onboarding?.tasks, today),
    ];

    return reminders.sort(compareReminders).slice(0, MAX_REMINDERS_PER_CHECK);
}

export function getUnseenReminderNotifications(reminders, { now = Date.now(), cooldownMs = REMINDER_COOLDOWN_MS } = {}) {
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
        renotify: false,
    });

    if (typeof notification.close === 'function') {
        window.setTimeout(() => notification.close(), 10_000);
    }

    return notification;
}
