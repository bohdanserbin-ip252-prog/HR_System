import ConfirmDeleteModal from './ConfirmDeleteModal.jsx';

export default function ConfirmDeleteHost({ modalState, onClose }) {
    return (
        <ConfirmDeleteModal
            isOpen={Boolean(modalState?.isOpen)}
            title={modalState?.title}
            message={modalState?.message}
            confirmLabel={modalState?.confirmLabel}
            onConfirm={modalState?.onConfirm}
            onClose={onClose}
        />
    );
}
