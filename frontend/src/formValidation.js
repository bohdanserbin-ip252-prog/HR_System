export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

export function validateRequired(value, fieldName) {
  if (value === null || value === undefined) return `${fieldName} є обов'язковим`;
  const str = String(value).trim();
  return str.length > 0 ? null : `${fieldName} є обов'язковим`;
}

export function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function validatePositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

export function validateSalaryRange(min, max) {
  if (min === null || min === undefined || max === null || max === undefined) {
    return false;
  }
  const minNum = Number(min);
  const maxNum = Number(max);
  return !isNaN(minNum) && !isNaN(maxNum) && minNum < maxNum;
}
