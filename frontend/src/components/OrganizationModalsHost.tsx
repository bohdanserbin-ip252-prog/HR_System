import DepartmentModal from './DepartmentModal.tsx';
import PositionModal from './PositionModal.tsx';

export default function OrganizationModalsHost({ currentUser, modalState, onClose }) {
    return (
        <>
            <DepartmentModal
                isOpen={modalState?.type === 'department'}
                mode={modalState?.mode || 'create'}
                departmentId={modalState?.type === 'department' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                onClose={onClose}
            />
            <PositionModal
                isOpen={modalState?.type === 'position'}
                mode={modalState?.mode || 'create'}
                positionId={modalState?.type === 'position' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                onClose={onClose}
            />
        </>
    );
}
