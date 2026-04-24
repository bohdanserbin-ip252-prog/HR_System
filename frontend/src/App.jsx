import { useEffect, useRef, useState } from 'react';
import { AppContextProvider } from './appContext.jsx';
import ModalHosts from './app/ModalHosts.jsx';
import { createRenderedPages } from './app/pageRegistry.jsx';
import AppShell from './components/AppShell.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import {
  ensureDesktopNotificationPermission,
  getDesktopNotificationsPreference,
  isDesktopNotificationSupported,
  setDesktopNotificationsPreference
} from './desktopNotifications.js';
import { useAppActionsController } from './hooks/useAppActionsController.js';
import { useAppDataController } from './hooks/useAppDataController.js';
import { useDesktopNotificationController } from './hooks/useDesktopNotificationController.js';
import { useSessionController } from './hooks/useSessionController.js';

export default function App() {
  const currentUserRef = useRef(null);
  const currentPageRef = useRef('dashboard');
  const unauthorizedHandlerRef = useRef(() => {});

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(() =>
    getDesktopNotificationsPreference()
  );

  const isDesktopNotificationsSupported = isDesktopNotificationSupported();

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', isSidebarOpen);

    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isSidebarOpen]);

  function handleUnauthorized(message = '') {
    unauthorizedHandlerRef.current?.(message);
  }

  const dataController = useAppDataController({
    currentUserRef,
    currentPageRef,
    onUnauthorized: handleUnauthorized
  });

  const actionsController = useAppActionsController({
    currentUserRef,
    currentPageRef,
    setCurrentPage,
    setProfileEmployeeId: dataController.setProfileEmployeeId,
    bumpDepartmentsRefresh: dataController.bumpDepartmentsRefresh,
    bumpEmployeesRefresh: dataController.bumpEmployeesRefresh,
    bumpPositionsRefresh: dataController.bumpPositionsRefresh,
    bumpProfileRefresh: dataController.bumpProfileRefresh,
    onUnauthorized: handleUnauthorized,
    refreshAll: dataController.refreshAll
  });

  const sessionController = useSessionController({
    currentUserRef,
    currentPageRef,
    setCurrentPage,
    setSidebarOpen,
    loadPageData: dataController.loadPageData,
    refreshBadgeCounts: dataController.refreshBadgeCounts,
    resetActionState: actionsController.resetActionState,
    resetDataState: dataController.resetDataState
  });

  unauthorizedHandlerRef.current = sessionController.showLoginScreen;

  const {
    authStatus,
    currentUser,
    handleLoginSubmit,
    handleLogout,
    handleUnauthorized: handleSessionUnauthorized,
    isSubmitting,
    loginError,
    password,
    setPassword,
    setUsername,
    username
  } = sessionController;

  useDesktopNotificationController({
    authStatus,
    currentUser,
    desktopNotificationsEnabled,
    onUnauthorized: handleSessionUnauthorized
  });

  function navigateTo(page) {
    currentPageRef.current = page;
    setCurrentPage(page);
    setSidebarOpen(false);
    void dataController.loadPageData(page, 'navigate');
  }

  function openProfile(employeeId) {
    dataController.setProfileEmployeeId(employeeId ?? null);
    dataController.bumpProfileRefresh();
    currentPageRef.current = 'profile';
    setCurrentPage('profile');
    setSidebarOpen(false);
  }

  function goBackToEmployees() {
    navigateTo('employees');
  }

  function handleDesktopNotificationsToggle(nextValue) {
    const normalizedValue = setDesktopNotificationsPreference(nextValue);
    setDesktopNotificationsEnabled(normalizedValue);
    if (normalizedValue) {
      void ensureDesktopNotificationPermission({ forcePrompt: true });
    }
  }

  const appState = {
    authStatus,
    badgeCounts: dataController.badgeCounts,
    currentPage,
    currentUser,
    desktopNotificationsEnabled,
    isAdmin: currentUser?.role === 'admin',
    isDesktopNotificationsSupported,
    isSidebarOpen
  };

  const appActions = {
    afterComplaintMutation: actionsController.afterComplaintMutation,
    afterDepartmentMutation: actionsController.afterDepartmentMutation,
    afterDevelopmentOnboardingMutation: actionsController.afterDevelopmentOnboardingMutation,
    afterEmployeeMutation: actionsController.afterEmployeeMutation,
    afterPositionMutation: actionsController.afterPositionMutation,
    confirmDelete: actionsController.confirmDelete,
    editComplaint: actionsController.editComplaint,
    editDepartment: actionsController.editDepartment,
    editEmployee: actionsController.editEmployee,
    editFeedback: actionsController.editFeedback,
    editGoal: actionsController.editGoal,
    editMeeting: actionsController.editMeeting,
    editPosition: actionsController.editPosition,
    editTask: actionsController.editTask,
    goBackToEmployees,
    handleDesktopNotificationsToggle,
    handleFab: actionsController.handleFab,
    handleUnauthorized: handleSessionUnauthorized,
    moveRecord: actionsController.moveRecord,
    navigateTo,
    openComplaintCreate: actionsController.openComplaintCreate,
    openDepartmentCreate: actionsController.openDepartmentCreate,
    openEmployeeCreate: actionsController.openEmployeeCreate,
    openFeedbackCreate: actionsController.openFeedbackCreate,
    openGoalCreate: actionsController.openGoalCreate,
    openMeetingCreate: actionsController.openMeetingCreate,
    openPositionCreate: actionsController.openPositionCreate,
    openProfile,
    openTaskCreate: actionsController.openTaskCreate,
    refreshAll: dataController.refreshAll
  };

  const renderedPages = createRenderedPages({ authStatus, currentPage, currentUser, dataController });

  return (
    <AppContextProvider actions={appActions} state={appState}>
      <LoginScreen
        isVisible={authStatus === 'unauthenticated'}
        username={username}
        password={password}
        errorMessage={loginError}
        isBusy={authStatus === 'loading' || isSubmitting}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLoginSubmit}
      />
      <ErrorBoundary>
        <AppShell
          badgeCounts={dataController.badgeCounts}
          isVisible={authStatus === 'authenticated'}
          currentUser={currentUser}
          currentPage={currentPage}
          desktopNotificationsEnabled={desktopNotificationsEnabled}
          isDesktopNotificationsSupported={isDesktopNotificationsSupported}
          isSidebarOpen={isSidebarOpen}
          renderedPages={renderedPages}
          onNavigate={navigateTo}
          onToggleSidebar={() => setSidebarOpen(isOpen => !isOpen)}
          onDesktopNotificationsToggle={handleDesktopNotificationsToggle}
          onLogout={handleLogout}
          onFab={actionsController.handleFab}
        />
        <ModalHosts
          authStatus={authStatus}
          currentUser={currentUser}
          actionsController={actionsController}
          dataController={dataController}
        />
      </ErrorBoundary>
    </AppContextProvider>
  );
}
