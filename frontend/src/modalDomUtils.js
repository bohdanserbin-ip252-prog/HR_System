export function syncBodyModalClass() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-overlay.active')));
}
