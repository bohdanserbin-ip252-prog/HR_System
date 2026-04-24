export function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDateParts(value) {
  if (!isValidDateString(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function toUtcDayNumber(value) {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

export function differenceInDays(fromDate, toDate) {
  const fromDay = toUtcDayNumber(fromDate);
  const toDay = toUtcDayNumber(toDate);
  if (fromDay === null || toDay === null) return null;
  return toDay - fromDay;
}

export function formatReminderDate(value) {
  const parts = parseDateParts(value);
  if (!parts) return value || '—';
  return `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}.${parts.year}`;
}
