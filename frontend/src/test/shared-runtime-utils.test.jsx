import { afterEach, describe, expect, it, vi } from 'vitest';

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
import { getTodayInputValue, nextDisplayOrder } from '../developmentOnboardingFormUtils.js';
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
            expect(container?.querySelector('.toast.success')).not.toBeNull();

            await vi.advanceTimersByTimeAsync(3000);
            const toast = container?.querySelector('.toast');
            expect(toast?.style.opacity).toBe('0');
            expect(toast?.style.transform).toBe('translateX(100%)');

            await vi.advanceTimersByTimeAsync(300);
            expect(container?.querySelector('.toast')).toBeNull();
        });
    });
});
