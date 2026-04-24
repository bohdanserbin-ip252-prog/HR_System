import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateRequired,
  validateDate,
  validatePositiveNumber,
  validateSalaryRange,
} from '../formValidation.js';

describe('validateEmail', () => {
  it('returns true for valid emails', () => {
    expect(validateEmail('test@company.ua')).toBe(true);
    expect(validateEmail('user.name@example.com')).toBe(true);
  });

  it('returns false for invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@company.ua')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});

describe('validateRequired', () => {
  it('returns null for non-empty values', () => {
    expect(validateRequired('hello', 'Field')).toBeNull();
    expect(validateRequired('  hello  ', 'Field')).toBeNull();
    expect(validateRequired(0, 'Field')).toBeNull();
  });

  it('returns error message for empty values', () => {
    expect(validateRequired('', 'Field')).toBe('Field є обов\'язковим');
    expect(validateRequired('   ', 'Field')).toBe('Field є обов\'язковим');
    expect(validateRequired(null, 'Field')).toBe('Field є обов\'язковим');
    expect(validateRequired(undefined, 'Field')).toBe('Field є обов\'язковим');
  });
});

describe('validateDate', () => {
  it('returns true for valid YYYY-MM-DD dates', () => {
    expect(validateDate('2024-01-15')).toBe(true);
    expect(validateDate('2020-12-31')).toBe(true);
  });

  it('returns false for invalid dates', () => {
    expect(validateDate('15-01-2024')).toBe(false);
    expect(validateDate('2024/01/15')).toBe(false);
    expect(validateDate('')).toBe(false);
    expect(validateDate(null)).toBe(false);
    expect(validateDate('2024-02-30')).toBe(false);
  });
});

describe('validatePositiveNumber', () => {
  it('returns true for positive numbers', () => {
    expect(validatePositiveNumber(1)).toBe(true);
    expect(validatePositiveNumber('15000')).toBe(true);
    expect(validatePositiveNumber(0.5)).toBe(true);
  });

  it('returns false for non-positive values', () => {
    expect(validatePositiveNumber(0)).toBe(false);
    expect(validatePositiveNumber(-1)).toBe(false);
    expect(validatePositiveNumber('abc')).toBe(false);
    expect(validatePositiveNumber(null)).toBe(false);
  });
});

describe('validateSalaryRange', () => {
  it('returns true when min < max', () => {
    expect(validateSalaryRange(15000, 80000)).toBe(true);
    expect(validateSalaryRange('15000', '80000')).toBe(true);
  });

  it('returns false when min >= max or invalid', () => {
    expect(validateSalaryRange(80000, 15000)).toBe(false);
    expect(validateSalaryRange(50000, 50000)).toBe(false);
    expect(validateSalaryRange('abc', 'def')).toBe(false);
    expect(validateSalaryRange(null, 100)).toBe(false);
  });
});
