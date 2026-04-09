import EmployeeModal from './EmployeeModal.jsx';

export default function EmployeeModalsHost({ currentUser, modalState, onClose }) {
    return (
        <EmployeeModal
            isOpen={Boolean(modalState?.isOpen)}
            mode={modalState?.mode || 'create'}
            employeeId={modalState?.mode === 'edit' ? modalState?.employeeId ?? null : null}
            currentUser={currentUser}
            onClose={onClose}
        />
    );
}
