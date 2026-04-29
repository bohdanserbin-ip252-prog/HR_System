import ConfirmDeleteHost from '../components/ConfirmDeleteHost.tsx';
import ComplaintModal from '../components/ComplaintModal.tsx';
import DevelopmentOnboardingModalsHost from '../components/DevelopmentOnboardingModalsHost.tsx';
import EmployeeModalsHost from '../components/EmployeeModalsHost.tsx';
import OrganizationModalsHost from '../components/OrganizationModalsHost.tsx';

export default function ModalHosts({ authStatus, currentUser, actionsController, dataController }) {
  const guardedUser = authStatus === 'authenticated' ? currentUser : null;

  return (
    <>
      <ConfirmDeleteHost
        modalState={actionsController.confirmDeleteState}
        onClose={actionsController.closeConfirmDelete}
      />
      <EmployeeModalsHost
        currentUser={guardedUser}
        modalState={actionsController.employeeModalState}
        onClose={actionsController.closeEmployeeModal}
      />
      <ComplaintModal
        currentUser={guardedUser}
        isOpen={actionsController.complaintModalState?.isOpen}
        mode={actionsController.complaintModalState?.mode || 'create'}
        complaintId={actionsController.complaintModalState?.complaintId ?? null}
        complaints={dataController.complaintsSnapshot?.data?.complaints || []}
        onClose={actionsController.closeComplaintModal}
      />
      <OrganizationModalsHost
        currentUser={guardedUser}
        modalState={actionsController.organizationModalState}
        onClose={actionsController.closeOrganizationModal}
      />
      <DevelopmentOnboardingModalsHost
        currentUser={guardedUser}
        modalState={actionsController.developmentOnboardingModalState}
        developmentData={dataController.developmentSnapshot.data}
        onboardingData={dataController.onboardingSnapshot.data}
        onClose={actionsController.closeDevelopmentOnboardingModal}
      />
    </>
  );
}
