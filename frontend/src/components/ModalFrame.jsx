import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { syncBodyModalClass } from '../modalDomUtils.js';

export default function ModalFrame({
    modalId,
    title,
    width = '480px',
    isOpen,
    onClose,
    children,
    footer
}) {
    useEffect(() => {
        if (!isOpen) {
            syncBodyModalClass();
            return undefined;
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') onClose();
        }

        document.addEventListener('keydown', handleKeyDown);
        syncBodyModalClass();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            syncBodyModalClass();
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="modal-overlay active"
            id={modalId}
            onClick={event => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="modal" style={{ width }}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose} type="button">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
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
