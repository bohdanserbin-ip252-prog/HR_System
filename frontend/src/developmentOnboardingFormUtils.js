export function getTodayInputValue() {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localNow.toISOString().split('T')[0];
}

export function nextDisplayOrder(items) {
    if (!Array.isArray(items) || items.length === 0) return 1;
    return Math.max(...items.map(item => Number(item.displayOrder ?? item.display_order ?? 0))) + 1;
}
