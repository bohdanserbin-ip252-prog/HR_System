import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
    CLOSED_CONFIRM_DELETE_STATE,
    CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE,
    CLOSED_EMPLOYEE_MODAL_STATE,
    CLOSED_ORGANIZATION_MODAL_STATE,
    DEFAULT_BADGE_COUNTS,
    createDashboardSnapshot,
    createDevelopmentSnapshot,
    createOnboardingSnapshot,
    createPageSnapshot,
} from '../appStateBuilders.js';
import {
    getTodayInputValue,
    nextDisplayOrder,
    parseFiniteNumberInput,
    parseIntegerInput,
    parseNonNegativeIntegerInput,
} from '../developmentOnboardingFormUtils.js';
import FormErrorMessage from '../components/FormErrorMessage.jsx';
import { syncBodyModalClass } from '../modalDomUtils.js';
import { showToast } from '../toast.js';

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.className = '';
    document.body.innerHTML = '';
});

describe('shared runtime utils', () => {
    describe('appStateBuilders', () => {
        it('exposes the expected closed/default constants', () => {
            expect(DEFAULT_BADGE_COUNTS).toEqual({ employees: '—', departments: '—', positions: '—' });
            expect(CLOSED_CONFIRM_DELETE_STATE).toEqual({
                isOpen: false,
                title: 'Підтвердження',
                message: '',
                confirmLabel: 'Видалити',
                onConfirm: null,
            });
            expect(CLOSED_EMPLOYEE_MODAL_STATE).toEqual({ isOpen: false, mode: 'create', employeeId: null });
            expect(CLOSED_ORGANIZATION_MODAL_STATE).toEqual({ type: null, mode: 'create', entityId: null });
            expect(CLOSED_DEVELOPMENT_ONBOARDING_MODAL_STATE).toEqual({ type: null, mode: 'create', entityId: null });
        });

        it('builds default snapshots with fresh nested state and supports overrides', () => {
            const developmentA = createDevelopmentSnapshot();
            const developmentB = createDevelopmentSnapshot({ status: 'success', reason: 'loaded' });
            const onboardingA = createOnboardingSnapshot();
            const onboardingB = createOnboardingSnapshot();
            const custom = createPageSnapshot({ items: [1] }, { revision: 4, errorMessage: 'oops' });
            const dashboard = createDashboardSnapshot();

            expect(developmentA).toMatchObject({
                status: 'idle',
                errorMessage: '',
                reason: 'initial',
                revision: 0,
                data: { goals: [], feedback: [], meetings: [] },
            });
            expect(developmentB.status).toBe('success');
            expect(developmentB.reason).toBe('loaded');
            expect(dashboard.data).toEqual({ stats: null });
            expect(onboardingA.data).toEqual({
                team: { avatars: [], totalCount: 0 },
                tasks: [],
                buddy: null,
                progress: { percent: 0, completedCount: 0, totalCount: 0 },
            });
            expect(onboardingA.data.tasks).not.toBe(onboardingB.data.tasks);
            expect(onboardingA.data.team.avatars).not.toBe(onboardingB.data.team.avatars);
            expect(custom).toMatchObject({
                status: 'idle',
                reason: 'initial',
                revision: 4,
                errorMessage: 'oops',
                data: { items: [1] },
            });
        });
    });

    describe('developmentOnboardingFormUtils', () => {
        it('returns an input-safe today value and computes next display order', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-04-01T15:20:00Z'));

            expect(getTodayInputValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(getTodayInputValue()).toBe('2026-04-01');
            expect(nextDisplayOrder([])).toBe(1);
            expect(nextDisplayOrder(null)).toBe(1);
            expect(nextDisplayOrder([{ displayOrder: 2 }, { display_order: 5 }, { displayOrder: 4 }])).toBe(6);
            expect(nextDisplayOrder([{ displayOrder: 'abc' }, { display_order: -2 }])).toBe(1);
            expect(nextDisplayOrder([{ displayOrder: 2 }, { display_order: 'x' }, { displayOrder: 7 }])).toBe(8);
        });

        it('parses finite numeric form values without coercing invalid text to zero', () => {
            expect(parseFiniteNumberInput('42.5')).toBe(42.5);
            expect(parseFiniteNumberInput('', { emptyValue: 0 })).toBe(0);
            expect(parseFiniteNumberInput('abc')).toBeNull();
            expect(parseIntegerInput('7')).toBe(7);
            expect(parseIntegerInput('', { emptyValue: 0 })).toBe(0);
            expect(parseIntegerInput('7.5')).toBeNull();
            expect(parseNonNegativeIntegerInput('0')).toBe(0);
            expect(parseNonNegativeIntegerInput('', { emptyValue: undefined })).toBeUndefined();
            expect(parseNonNegativeIntegerInput('-1')).toBeNull();
        });
    });

    describe('modalDomUtils', () => {
        it('toggles body modal-open class based on active overlays', () => {
            document.body.innerHTML = '<div class="modal-overlay"></div>';
            syncBodyModalClass();
            expect(document.body).not.toHaveClass('modal-open');

            document.body.innerHTML = '<div class="modal-overlay active"></div>';
            syncBodyModalClass();
            expect(document.body).toHaveClass('modal-open');

            document.body.innerHTML = '';
            syncBodyModalClass();
            expect(document.body).not.toHaveClass('modal-open');
        });
    });

    describe('toast', () => {
        it('is a no-op without a container and creates then removes toast with timers', async () => {
            vi.useFakeTimers();

            expect(() => showToast('Нічого не зламається')).not.toThrow();
            expect(document.body.querySelector('.toast')).toBeNull();

            document.body.innerHTML = '<div id="toastContainer"></div>';
            const container = document.getElementById('toastContainer');

            showToast('Зміни збережено', 'success');
            expect(container?.querySelectorAll('.toast')).toHaveLength(1);
            expect(container?.textContent).toContain('Зміни збережено');
            const toast = container?.querySelector('.toast.success');
            expect(toast).not.toBeNull();
            expect(toast).toHaveAttribute('role', 'status');
            expect(toast).toHaveAttribute('aria-live', 'polite');
            expect(toast).toHaveAttribute('aria-atomic', 'true');

            await vi.advanceTimersByTimeAsync(3000);
            const fadingToast = container?.querySelector('.toast');
            expect(fadingToast).toHaveClass('toast-exiting');

            await vi.advanceTimersByTimeAsync(300);
            expect(container?.querySelector('.toast')).toBeNull();
        });

        it('renders toast messages as text instead of HTML', () => {
            document.body.innerHTML = '<div id="toastContainer"></div>';

            showToast('<img src=x onerror="window.__toastInjected = true">Небезпечно', 'error');

            const toast = document.body.querySelector('.toast');
            expect(toast).not.toBeNull();
            expect(toast).toHaveAttribute('role', 'alert');
            expect(toast).toHaveAttribute('aria-live', 'assertive');
            expect(toast).toHaveAttribute('aria-atomic', 'true');
            expect(toast?.querySelector('img')).toBeNull();
            expect(toast?.textContent).toContain('<img src=x onerror="window.__toastInjected = true">Небезпечно');
        });
    });

    describe('FormErrorMessage', () => {
        it('announces inline form errors as alerts', () => {
            render(<FormErrorMessage id="field-error" message="Поле обов'язкове" />);

            expect(screen.getByRole('alert')).toHaveAttribute('id', 'field-error');
            expect(screen.getByRole('alert')).toHaveTextContent("Поле обов'язкове");
        });
    });
});
