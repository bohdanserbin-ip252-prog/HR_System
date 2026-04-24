function ensureToastContainer(): HTMLElement | null {
    return document.getElementById('toastContainer');
}

const TOAST_EXIT_DURATION_MS = 300;

export function showToast(message: unknown, type: 'success' | 'error' = 'success'): void {
    const container = ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');
    const icon = type === 'success' ? 'check_circle' : 'error';
    const iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined';
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.style.fontSize = '20px';
    iconElement.style.color = type === 'success' ? 'var(--emerald-600)' : 'var(--error)';
    iconElement.textContent = icon;
    toast.append(iconElement, ` ${String(message ?? '')}`);
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exiting');
        setTimeout(() => toast.remove(), TOAST_EXIT_DURATION_MS);
    }, 3000);
}
