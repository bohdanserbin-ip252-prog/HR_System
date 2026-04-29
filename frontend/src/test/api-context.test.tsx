import React from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { API, API_ORIGIN, fetchJSON } from '../api.ts';
import { AppContextProvider, useAppActions, useAppState } from '../appContext.tsx';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

function mockFetchResponse({
    ok,
    status,
    contentType,
    jsonValue,
    textValue,
}) {
    return {
        ok,
        status,
        headers: {
            get: vi.fn((name) => (name === 'content-type' ? contentType : null)),
        },
        json: vi.fn(async () => jsonValue),
        text: vi.fn(async () => textValue),
    };
}

describe('api.ts', () => {
    it('exports a normalized API origin', () => {
        expect(API).toBe(API_ORIGIN);
        expect(API_ORIGIN.endsWith('/')).toBe(false);
    });

    it('returns parsed JSON and always sends same-origin credentials', async () => {
        const payload = { ok: true, user: { id: 1 } };
        const fetchMock = vi.fn().mockResolvedValue(
            mockFetchResponse({
                ok: true,
                status: 200,
                contentType: 'application/json; charset=utf-8',
                jsonValue: payload,
                textValue: '',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchJSON('/api/test', { method: 'POST', body: 'demo' })).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith('/api/v2/test', {
            credentials: 'same-origin',
            method: 'POST',
            body: 'demo',
        });
    });

    it('sends include credentials when a cross-origin API origin is configured', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com/');
        const crossOriginApi = await import('../api.js?cross-origin');
        const payload = { ok: true };
        const fetchMock = vi.fn().mockResolvedValue(
            mockFetchResponse({
                ok: true,
                status: 200,
                contentType: 'application/json',
                jsonValue: payload,
                textValue: '',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(crossOriginApi.fetchJSON(`${crossOriginApi.API}/api/test`)).resolves.toEqual(payload);
        expect(crossOriginApi.API_ORIGIN).toBe('https://api.example.com');
        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/v2/test', {
            credentials: 'include',
        });
    });

    it('returns text for successful non-json responses', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            mockFetchResponse({
                ok: true,
                status: 200,
                contentType: 'text/plain',
                jsonValue: null,
                textValue: 'plain text body',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchJSON('/api/plain')).resolves.toBe('plain text body');
    });

    it('prefers payload.error for failed JSON responses and preserves metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            mockFetchResponse({
                ok: false,
                status: 403,
                contentType: 'application/json',
                jsonValue: { error: 'Недостатньо прав' },
                textValue: '',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchJSON('/api/protected', { suppressAuthRedirect: true })).rejects.toMatchObject({
            message: 'Недостатньо прав',
            status: 403,
            payload: { error: 'Недостатньо прав' },
            suppressAuthRedirect: true,
        });
    });

    it('falls back to HTTP status for failed non-json responses', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            mockFetchResponse({
                ok: false,
                status: 502,
                contentType: 'text/plain',
                jsonValue: null,
                textValue: 'upstream failed',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchJSON('/api/downstream')).rejects.toMatchObject({
            message: 'HTTP 502',
            status: 502,
            payload: 'upstream failed',
            suppressAuthRedirect: false,
        });
    });
});

describe('appContext.tsx', () => {
    function createWrapper() {
        const state = { currentPage: 'dashboard' };
        const actions = { navigateTo: vi.fn() };
        return {
            state,
            actions,
            wrapper: ({ children }) => (
                <AppContextProvider state={state} actions={actions}>
                    {children}
                </AppContextProvider>
            ),
        };
    }

    it('provides state and actions to descendants', () => {
        const { state, actions, wrapper } = createWrapper();
        const { result: stateResult } = renderHook(() => useAppState(), { wrapper });
        const { result: actionsResult } = renderHook(() => useAppActions(), { wrapper });

        expect(stateResult.current).toBe(state);
        expect(actionsResult.current).toBe(actions);
    });

    it('throws a clear error when useAppState is used outside provider', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAppState())).toThrow(
            'useAppState must be used within AppContextProvider',
        );

        consoleErrorSpy.mockRestore();
    });

    it('throws a clear error when useAppActions is used outside provider', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAppActions())).toThrow(
            'useAppActions must be used within AppContextProvider',
        );

        consoleErrorSpy.mockRestore();
    });
});
