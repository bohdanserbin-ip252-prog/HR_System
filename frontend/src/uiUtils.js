export function parseDateValue(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getErrorMessage(error, fallback) {
    if (error?.message && !error.message.startsWith('HTTP ')) return error.message;
    return fallback;
}

export function formatMoney(val) {
    const numeric = Number(val);
    return new Intl.NumberFormat('uk-UA').format(Number.isFinite(numeric) ? Math.round(numeric) : 0);
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = parseDateValue(dateStr);
    return date ? date.toLocaleDateString('uk-UA') : '—';
}

export function statusLabel(status) {
    const labels = { active: 'Активний', on_leave: 'Відпустка', fired: 'Звільнений' };
    return labels[status] || status;
}

export function getAvatarColor(name = '') {
    const colors = [
        'linear-gradient(135deg, #059669, #047857)',
        'linear-gradient(135deg, #27655d, #185951)',
        'linear-gradient(135deg, #006b15, #005d11)',
        'linear-gradient(135deg, #006944, #004b30)',
        'linear-gradient(135deg, #475569, #334155)',
        'linear-gradient(135deg, #0284c7, #0369a1)',
        'linear-gradient(135deg, #7c3aed, #6d28d9)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}
