import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { syncBodyModalClass } from '../modalDomUtils.js';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

export default function ModalFrame({
    modalId,
    title,
    size = 'standard',
    isOpen,
    onClose,
    children,
    footer
}) {
    const normalizedSize = ['compact', 'standard', 'wide'].includes(size) ? size : 'standard';
    const modalRef = useRef(null);
    const closeButtonRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const titleId = `${modalId || 'modal'}-title`;
    const bodyId = `${modalId || 'modal'}-body`;
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) {
            syncBodyModalClass();
            return undefined;
        }

        previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const initialFocusTarget = closeButtonRef.current || modalRef.current;
        initialFocusTarget?.focus();

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onCloseRef.current?.();
                return;
            }

            if (event.key !== 'Tab') return;
            const modalElement = modalRef.current;
            if (!modalElement) return;

            const focusable = Array.from(modalElement.querySelectorAll(FOCUSABLE_SELECTOR));
            if (!focusable.length) {
                event.preventDefault();
                modalElement.focus();
                return;
            }

            const activeElement = document.activeElement;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const isOutsideModal = !modalElement.contains(activeElement);

            if (event.shiftKey) {
                if (activeElement === first || activeElement === modalElement || isOutsideModal) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (activeElement === last || isOutsideModal) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        syncBodyModalClass();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            syncBodyModalClass();
            const previouslyFocused = previouslyFocusedRef.current;
            if (previouslyFocused && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [isOpen]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="modal-overlay active"
            id={modalId}
            onClick={event => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className={`modal modal--${normalizedSize}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                ref={modalRef}
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h2 id={titleId}>{title}</h2>
                    <button className="modal-close" onClick={onClose} type="button" ref={closeButtonRef}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body" id={bodyId}>
                    {children}
                </div>
                <div className="modal-footer">
                    {footer}
                </div>
            </div>
        </div>,
        document.body
    );
}
