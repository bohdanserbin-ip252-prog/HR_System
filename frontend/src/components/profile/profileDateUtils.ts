import { parseDateValue } from '../../uiUtils.ts';

export function getLongDateLabel(dateValue) {
  const parsed = parseDateValue(dateValue);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function getTenureData(hireDateValue) {
  const hireDate = parseDateValue(hireDateValue);
  if (!hireDate) {
    return {
      hireDateLabel: '—',
      tenureLabel: '—'
    };
  }

  const now = new Date();
  const diffMonths =
    (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
  const years = Math.floor(diffMonths / 12);
  const months = diffMonths % 12;

  return {
    hireDateLabel: getLongDateLabel(hireDateValue),
    tenureLabel: years > 0 ? `${years} р. ${months} міс.` : `${months} міс.`
  };
}
