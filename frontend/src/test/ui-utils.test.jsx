import { describe, expect, it } from 'vitest';

import {
    formatDate,
    formatMoney,
    getAvatarColor,
    getErrorMessage,
    parseDateValue,
    statusLabel,
} from '../uiUtils.js';

const AVATAR_COLORS = [
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #27655d, #185951)',
    'linear-gradient(135deg, #006b15, #005d11)',
    'linear-gradient(135deg, #006944, #004b30)',
    'linear-gradient(135deg, #475569, #334155)',
    'linear-gradient(135deg, #0284c7, #0369a1)',
    'linear-gradient(135deg, #7c3aed, #6d28d9)',
];

describe('uiUtils', () => {
    describe('parseDateValue', () => {
        it('parses yyyy-mm-dd into a valid local date', () => {
            const date = parseDateValue('2026-04-01');

            expect(date).toBeInstanceOf(Date);
            expect(date?.getFullYear()).toBe(2026);
            expect(date?.getMonth()).toBe(3);
            expect(date?.getDate()).toBe(1);
        });

        it('parses iso-like values and rejects invalid strings', () => {
            const valid = parseDateValue('2026-04-01T12:30:00Z');
            const invalid = parseDateValue('not-a-date');

            expect(valid).toBeInstanceOf(Date);
            expect(Number.isNaN(valid?.getTime() ?? Number.NaN)).toBe(false);
            expect(invalid).toBeNull();
        });

        it('rejects impossible calendar dates instead of normalizing them', () => {
            expect(parseDateValue('2026-04-31')).toBeNull();
            expect(parseDateValue('2026-04-31Z')).toBeNull();
            expect(parseDateValue('2026-04-31T12:30:00Z')).toBeNull();
            expect(parseDateValue('2026-02-29Z')).toBeNull();
            expect(formatDate('2026-02-29')).toBe('—');
            expect(formatDate('2026-04-31Z')).toBe('—');
        });
    });

    describe('getErrorMessage', () => {
        it('returns custom non-http messages and falls back for http messages', () => {
            expect(getErrorMessage(new Error('Потрібно оновити дані'), 'Запасне повідомлення')).toBe(
                'Потрібно оновити дані',
            );
            expect(getErrorMessage(new Error('HTTP 500'), 'Запасне повідомлення')).toBe(
                'Запасне повідомлення',
            );
            expect(getErrorMessage(null, 'Запасне повідомлення')).toBe('Запасне повідомлення');
        });
    });

    describe('formatMoney', () => {
        it('rounds numeric input and formats it for uk-UA locale', () => {
            expect(formatMoney(1234.56)).toBe(new Intl.NumberFormat('uk-UA').format(1235));
            expect(formatMoney('9876.2')).toBe(new Intl.NumberFormat('uk-UA').format(9876));
            expect(formatMoney('NaN')).toBe(new Intl.NumberFormat('uk-UA').format(0));
        });
    });

    describe('formatDate', () => {
        it('formats valid dates and falls back to em dash', () => {
            expect(formatDate('2026-04-01')).toBe(new Date(2026, 3, 1).toLocaleDateString('uk-UA'));
            expect(formatDate('')).toBe('—');
            expect(formatDate('invalid-date')).toBe('—');
        });
    });

    describe('statusLabel', () => {
        it('maps known employee statuses and preserves unknown values', () => {
            expect(statusLabel('active')).toBe('Активний');
            expect(statusLabel('on_leave')).toBe('Відпустка');
            expect(statusLabel('fired')).toBe('Звільнений');
            expect(statusLabel('custom-status')).toBe('custom-status');
        });
    });

    describe('getAvatarColor', () => {
        it('returns deterministic gradients from the supported palette', () => {
            const first = getAvatarColor('Лисенко Катерина');
            const second = getAvatarColor('Лисенко Катерина');
            const empty = getAvatarColor('');

            expect(first).toBe(second);
            expect(AVATAR_COLORS).toContain(first);
            expect(AVATAR_COLORS).toContain(empty);
            expect(first.startsWith('linear-gradient(')).toBe(true);
        });
    });
});
