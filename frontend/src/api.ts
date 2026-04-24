export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string || '').replace(/\/$/, '');
export const API: string = API_ORIGIN;
const API_V2_PREFIX = '/api/v2';

export interface FetchJSONOptions extends RequestInit {
    suppressAuthRedirect?: boolean;
}

export interface FetchError extends Error {
    status: number;
    payload: unknown;
    suppressAuthRedirect: boolean;
}

function normalizeApiUrl(url: string): string {
    if (!url) return url;

    if (/^https?:\/\//.test(url)) {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/api/v2')) {
            return parsed.toString();
        }
        if (parsed.pathname === '/api' || parsed.pathname.startsWith('/api/')) {
            parsed.pathname = parsed.pathname.replace(/^\/api(?=\/|$)/, '/api/v2');
            return parsed.toString();
        }
        return url;
    }

    if (url.startsWith('/api/v2')) return url;
    if (url === '/api' || url.startsWith('/api/')) {
        return url.replace(/^\/api(?=\/|$)/, '/api/v2');
    }

    return url;
}

function camelToSnake(key: string): string {
    let output = '';
    for (let index = 0; index < key.length; index += 1) {
        const ch = key[index];
        if (ch >= 'A' && ch <= 'Z') {
            if (index > 0) output += '_';
            output += ch.toLowerCase();
        } else {
            output += ch === '-' ? '_' : ch;
        }
    }
    return output;
}

function addSnakeAliases(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(item => addSnakeAliases(item));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }

    const objectValue = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(objectValue)) {
        const transformed = addSnakeAliases(item);
        next[key] = transformed;

        const snake = camelToSnake(key);
        if (snake !== key && !(snake in next)) {
            next[snake] = transformed;
        }
    }

    return next;
}

function unwrapV2Payload(payload: unknown): unknown {
    if (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        'data' in (payload as Record<string, unknown>) &&
        'meta' in (payload as Record<string, unknown>)
    ) {
        return (payload as Record<string, unknown>).data;
    }

    return payload;
}

export async function fetchJSON(url: string, options: FetchJSONOptions = {}): Promise<unknown> {
    const { suppressAuthRedirect = false, ...requestOptions } = options;
    const normalizedUrl = normalizeApiUrl(url);
    const res = await fetch(normalizedUrl, {
        credentials: API_ORIGIN ? 'include' : 'same-origin',
        ...requestOptions
    });
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        const errorMessage =
            payload && typeof payload === 'object' && (payload as Record<string, unknown>).error
                ? String((payload as Record<string, unknown>).error)
                : `HTTP ${res.status}`;
        const error = new Error(errorMessage) as FetchError;
        error.status = res.status;
        error.payload = payload;
        error.suppressAuthRedirect = suppressAuthRedirect;
        throw error;
    }

    return addSnakeAliases(unwrapV2Payload(payload));
}
