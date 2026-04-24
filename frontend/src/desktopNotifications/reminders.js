import { getTodayInputValue } from '../developmentOnboardingFormUtils.js';
import { SEVERITY_ORDER } from './constants.js';
import { differenceInDays, formatReminderDate } from './dateUtils.js';

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function compareReminders(left, right) {
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
    severity
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
          severity: 'error'
        })
      ];
    }

    if (daysUntilDue === 0) {
      return [
        createReminder({
          id: `development-goal-due-today:${goal.id}:${goal.dueDate}`,
          title: 'Дедлайн цілі розвитку сьогодні',
          message: `Ціль «${goal.title}» потрібно закрити сьогодні.`,
          severity: 'warning'
        })
      ];
    }

    if (daysUntilDue <= 3) {
      return [
        createReminder({
          id: `development-goal-due-soon:${goal.id}:${goal.dueDate}`,
          title: 'Наближається дедлайн цілі розвитку',
          message: `До дедлайну цілі «${goal.title}» залишилось ${daysUntilDue} дн.`,
          severity: 'info'
        })
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
          severity: 'info'
        })
      ];
    }

    return [
      createReminder({
        id: `development-meeting-tomorrow:${meeting.id}:${meeting.date}`,
        title: 'Запланована зустріч на завтра',
        message: `«${meeting.title}» запланована на ${formatReminderDate(meeting.date)}.`,
        severity: 'info'
      })
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
          severity: 'error'
        })
      ];
    }

    if (daysUntilDue === 0) {
      return [
        createReminder({
          id: `onboarding-task-due-today:${task.id}:${task.dueDate}`,
          title: 'Задача адаптації на сьогодні',
          message: `Задачу «${task.title}» потрібно виконати сьогодні.`,
          severity: task.priority ? 'warning' : 'info'
        })
      ];
    }

    if (task.priority && daysUntilDue === 1) {
      return [
        createReminder({
          id: `onboarding-task-priority-tomorrow:${task.id}:${task.dueDate}`,
          title: 'Пріоритетна задача адаптації на завтра',
          message: `Задача «${task.title}» має дедлайн ${formatReminderDate(task.dueDate)}.`,
          severity: 'info'
        })
      ];
    }

    return [];
  });
}

export function buildDesktopReminderPayloads({ development, onboarding, today = getTodayInputValue() } = {}) {
  const reminders = [
    ...buildGoalReminders(development?.goals, today),
    ...buildMeetingReminders(development?.meetings, today),
    ...buildOnboardingTaskReminders(onboarding?.tasks, today)
  ];

  return reminders.sort(compareReminders);
}
