export function parseDateValue(dateStr: string | number | Date | null | undefined): Date | null {
    if (!dateStr) return null;

    const normalized = String(dateStr);
    const strictDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (strictDateMatch) {
        const [, yearText, monthText, dayText] = strictDateMatch;
        const year = Number(yearText);
        const month = Number(monthText);
        const day = Number(dayText);
        const strictDate = new Date(year, month - 1, day);
        if (
            strictDate.getFullYear() !== year ||
            strictDate.getMonth() !== month - 1 ||
            strictDate.getDate() !== day
        ) {
            return null;
        }

        if (strictDateMatch[0].length === normalized.length) {
            return strictDate;
        }
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getErrorMessage(error: unknown, fallback: string): string {
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message?: string }).message === 'string' &&
        !(error as { message: string }).message.startsWith('HTTP ')
    ) {
        return (error as { message: string }).message;
    }
    return fallback;
}

export function formatMoney(val: string | number): string {
    const numeric = Number(val);
    return new Intl.NumberFormat('uk-UA').format(Number.isFinite(numeric) ? Math.round(numeric) : 0);
}

export function formatDate(dateStr: string | number | Date | null | undefined): string {
    if (!dateStr) return '—';
    const date = parseDateValue(dateStr);
    return date ? date.toLocaleDateString('uk-UA') : '—';
}

export function statusLabel(status: string): string {
    const labels: Record<string, string> = { active: 'Активний', on_leave: 'Відпустка', fired: 'Звільнений' };
    return labels[status] || status;
}

export function getAvatarColor(name = ''): string {
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
