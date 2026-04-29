import { useEffect, useState } from 'react';
import { getErrorMessage } from '../uiUtils.ts';
import ModalFrame from './ModalFrame.tsx';
import FormErrorMessage from './FormErrorMessage.tsx';

export default function ConfirmDeleteModal({
    isOpen,
    title,
    message,
    confirmLabel,
    onConfirm,
    onClose
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setIsSubmitting(false);
            setErrorMessage('');
            return;
        }

        setIsSubmitting(false);
        setErrorMessage('');
    }, [confirmLabel, isOpen, message, title]);

    async function handleConfirm() {
        if (!onConfirm || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            await onConfirm();
            onClose();
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Помилка видалення'));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ModalFrame
            modalId="confirmModal"
            title={title || 'Підтвердження'}
            size="compact"
            isOpen={isOpen}
            onClose={() => {
                if (isSubmitting) return;
                onClose();
            }}
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose} type="button" disabled={isSubmitting}>
                        Скасувати
                    </button>
                    <button className="btn btn-danger" id="confirmBtn" onClick={handleConfirm} type="button" disabled={isSubmitting}>
                        {isSubmitting ? 'Видалення...' : (confirmLabel || 'Видалити')}
                    </button>
                </>
            )}
        >
            <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />
            <p id="confirmMessage" style={{ fontSize: '15px', textAlign: 'center', padding: '10px 0', margin: 0 }}>
                {message}
            </p>
        </ModalFrame>
    );
}
