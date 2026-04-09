export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
export const API = API_ORIGIN;

export async function fetchJSON(url, options = {}) {
    const { suppressAuthRedirect = false, ...requestOptions } = options;
    const res = await fetch(url, {
        credentials: 'same-origin',
        ...requestOptions
    });
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        const errorMessage =
            payload && typeof payload === 'object' && payload.error
                ? payload.error
                : `HTTP ${res.status}`;
        const error = new Error(errorMessage);
        error.status = res.status;
        error.payload = payload;
        error.suppressAuthRedirect = suppressAuthRedirect;
        throw error;
    }

    return payload;
}
