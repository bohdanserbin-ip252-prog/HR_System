export function getTodayInputValue() {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localNow.toISOString().split('T')[0];
}

export function nextDisplayOrder(items) {
    if (!Array.isArray(items) || items.length === 0) return 1;
    const validOrders = items
        .map(item => Number(item?.displayOrder ?? item?.display_order))
        .filter(order => Number.isFinite(order) && order >= 0);
    if (validOrders.length === 0) return 1;
    return Math.max(...validOrders) + 1;
}

function resolveEmptyValue(options) {
    return Object.hasOwn(options, 'emptyValue') ? options.emptyValue : null;
}

export function parseFiniteNumberInput(value, options = {}) {
    const emptyValue = resolveEmptyValue(options);
    const normalized = String(value ?? '').trim();
    if (!normalized) return emptyValue;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function parseIntegerInput(value, options = {}) {
    const emptyValue = resolveEmptyValue(options);
    const parsed = parseFiniteNumberInput(value, { emptyValue });
    if (parsed === emptyValue) return parsed;
    return Number.isInteger(parsed) ? parsed : null;
}

export function parseNonNegativeIntegerInput(value, options = {}) {
    const emptyValue = resolveEmptyValue(options);
    const parsed = parseIntegerInput(value, { emptyValue });
    if (parsed === emptyValue) return parsed;
    return parsed !== null && parsed >= 0 ? parsed : null;
}
