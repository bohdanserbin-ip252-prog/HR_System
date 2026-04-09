import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';

afterEach(() => {
    vi.clearAllMocks();
});

describe('shared hooks', () => {
    describe('isAbortedLoad', () => {
        it('recognizes abort errors and aborted signals', () => {
            const abortedController = new AbortController();
            abortedController.abort();
            const activeController = new AbortController();

            expect(isAbortedLoad({ name: 'AbortError' }, activeController.signal)).toBe(true);
            expect(isAbortedLoad(new Error('Other error'), abortedController.signal)).toBe(true);
            expect(isAbortedLoad(new Error('Other error'), activeController.signal)).toBe(false);
        });
    });

    describe('useAbortableLoadEffect', () => {
        it('runs load when enabled and aborts its controller on unmount', async () => {
            const load = vi.fn().mockResolvedValue(undefined);

            const { unmount } = renderHook(() =>
                useAbortableLoadEffect({
                    deps: [],
                    load,
                }),
            );

            await waitFor(() => {
                expect(load).toHaveBeenCalledTimes(1);
            });

            const firstCall = load.mock.calls[0][0];
            expect(firstCall.signal.aborted).toBe(false);
            expect(firstCall.controller.signal).toBe(firstCall.signal);

            unmount();
            expect(firstCall.signal.aborted).toBe(true);
        });

        it('calls onDisabled and skips load when disabled', async () => {
            const load = vi.fn().mockResolvedValue(undefined);
            const onDisabled = vi.fn();

            renderHook(() =>
                useAbortableLoadEffect({
                    enabled: false,
                    deps: [],
                    load,
                    onDisabled,
                }),
            );

            await waitFor(() => {
                expect(onDisabled).toHaveBeenCalledTimes(1);
            });
            expect(load).not.toHaveBeenCalled();
        });

        it('aborts the previous controller and reruns load when deps change', async () => {
            const load = vi.fn().mockResolvedValue(undefined);

            const { rerender } = renderHook(
                ({ refreshKey }) =>
                    useAbortableLoadEffect({
                        deps: [refreshKey],
                        load,
                    }),
                {
                    initialProps: { refreshKey: 0 },
                },
            );

            await waitFor(() => {
                expect(load).toHaveBeenCalledTimes(1);
            });
            const firstCall = load.mock.calls[0][0];

            rerender({ refreshKey: 1 });

            await waitFor(() => {
                expect(load).toHaveBeenCalledTimes(2);
            });
            const secondCall = load.mock.calls[1][0];

            expect(firstCall.signal.aborted).toBe(true);
            expect(secondCall.signal.aborted).toBe(false);
        });
    });

    describe('useAsyncStatus', () => {
        it('starts idle and supports loading lifecycle transitions', () => {
            const { result } = renderHook(() => useAsyncStatus());

            expect(result.current.isLoading).toBe(false);
            expect(result.current.errorMessage).toBe('');

            act(() => {
                result.current.setErrorMessage('Попередня помилка');
                result.current.startLoading();
            });

            expect(result.current.isLoading).toBe(true);
            expect(result.current.errorMessage).toBe('');

            act(() => {
                result.current.finishLoading();
            });

            expect(result.current.isLoading).toBe(false);

            act(() => {
                result.current.setIsLoading(true);
                result.current.setErrorMessage('Тимчасова помилка');
                result.current.resetAsyncStatus();
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.errorMessage).toBe('');
        });

        it('uses readable error messages and fallback for HTTP-prefixed errors', () => {
            const { result } = renderHook(() => useAsyncStatus());

            act(() => {
                result.current.failWithError(new Error('Людяне повідомлення'), 'Запасне повідомлення');
            });
            expect(result.current.errorMessage).toBe('Людяне повідомлення');

            act(() => {
                result.current.failWithError(new Error('HTTP 500'), 'Запасне повідомлення');
            });
            expect(result.current.errorMessage).toBe('Запасне повідомлення');
        });
    });
});
