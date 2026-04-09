function ensureToastContainer() {
    return document.getElementById('toastContainer');
}

export function showToast(message, type = 'success') {
    const container = ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check_circle' : 'error';
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;color:${type === 'success' ? 'var(--emerald-600)' : 'var(--error)'}">${icon}</span> ${String(message ?? '')}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
