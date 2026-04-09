import { useRef, useState } from 'react';
import { AppContextProvider } from './appContext.jsx';
import ConfirmDeleteHost from './components/ConfirmDeleteHost.jsx';
import AppShell from './components/AppShell.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import DepartmentsPage from './components/DepartmentsPage.jsx';
import DevelopmentOnboardingModalsHost from './components/DevelopmentOnboardingModalsHost.jsx';
import DevelopmentPage from './components/DevelopmentPage.jsx';
import EmployeeModalsHost from './components/EmployeeModalsHost.jsx';
import EmployeesPage from './components/EmployeesPage.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import OnboardingPage from './components/OnboardingPage.jsx';
import OrganizationModalsHost from './components/OrganizationModalsHost.jsx';
import PositionsPage from './components/PositionsPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import {
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
    const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(() => getDesktopNotificationsPreference());

    const isDesktopNotificationsSupported = isDesktopNotificationSupported();

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
    }

    const appState = {
        authStatus,
        badgeCounts: dataController.badgeCounts,
        currentPage,
        currentUser,
        isAdmin: currentUser?.role === 'admin',
        isSidebarOpen
    };

    const appActions = {
        afterDepartmentMutation: actionsController.afterDepartmentMutation,
        afterDevelopmentOnboardingMutation: actionsController.afterDevelopmentOnboardingMutation,
        afterEmployeeMutation: actionsController.afterEmployeeMutation,
        afterPositionMutation: actionsController.afterPositionMutation,
        confirmDelete: actionsController.confirmDelete,
        editDepartment: actionsController.editDepartment,
        editEmployee: actionsController.editEmployee,
        editFeedback: actionsController.editFeedback,
        editGoal: actionsController.editGoal,
        editMeeting: actionsController.editMeeting,
        editPosition: actionsController.editPosition,
        editTask: actionsController.editTask,
        goBackToEmployees,
        handleFab: actionsController.handleFab,
        handleUnauthorized: handleSessionUnauthorized,
        moveRecord: actionsController.moveRecord,
        navigateTo,
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

    return (
        <AppContextProvider actions={appActions} state={appState}>
            <LoginScreen
                isVisible={authStatus !== 'authenticated'}
                username={username}
                password={password}
                errorMessage={loginError}
                isBusy={authStatus === 'loading' || isSubmitting}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onSubmit={handleLoginSubmit}
            />
            <AppShell
                badgeCounts={dataController.badgeCounts}
                isVisible={authStatus === 'authenticated'}
                currentUser={currentUser}
                currentPage={currentPage}
                desktopNotificationsEnabled={desktopNotificationsEnabled}
                isDesktopNotificationsSupported={isDesktopNotificationsSupported}
                isSidebarOpen={isSidebarOpen}
                pageViews={{
                    dashboard: (
                        <DashboardPage
                            isActive={authStatus === 'authenticated' && currentPage === 'dashboard'}
                            snapshot={dataController.dashboardSnapshot}
                        />
                    ),
                    employees: (
                        <EmployeesPage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'employees'}
                            refreshKey={dataController.employeesRefreshKey}
                        />
                    ),
                    departments: (
                        <DepartmentsPage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'departments'}
                            refreshKey={dataController.departmentsRefreshKey}
                        />
                    ),
                    positions: (
                        <PositionsPage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'positions'}
                            refreshKey={dataController.positionsRefreshKey}
                        />
                    ),
                    development: (
                        <DevelopmentPage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'development'}
                            snapshot={dataController.developmentSnapshot}
                        />
                    ),
                    onboarding: (
                        <OnboardingPage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'onboarding'}
                            snapshot={dataController.onboardingSnapshot}
                        />
                    ),
                    profile: (
                        <ProfilePage
                            currentUser={currentUser}
                            isActive={authStatus === 'authenticated' && currentPage === 'profile'}
                            employeeId={dataController.profileEmployeeId}
                            refreshKey={dataController.profileRefreshKey}
                        />
                    )
                }}
                onNavigate={navigateTo}
                onToggleSidebar={() => setSidebarOpen(isOpen => !isOpen)}
                onDesktopNotificationsToggle={handleDesktopNotificationsToggle}
                onLogout={handleLogout}
                onFab={actionsController.handleFab}
            />
            <ConfirmDeleteHost
                modalState={actionsController.confirmDeleteState}
                onClose={actionsController.closeConfirmDelete}
            />
            <EmployeeModalsHost
                currentUser={authStatus === 'authenticated' ? currentUser : null}
                modalState={actionsController.employeeModalState}
                onClose={actionsController.closeEmployeeModal}
            />
            <OrganizationModalsHost
                currentUser={authStatus === 'authenticated' ? currentUser : null}
                modalState={actionsController.organizationModalState}
                onClose={actionsController.closeOrganizationModal}
            />
            <DevelopmentOnboardingModalsHost
                currentUser={authStatus === 'authenticated' ? currentUser : null}
                modalState={actionsController.developmentOnboardingModalState}
                developmentData={dataController.developmentSnapshot.data}
                onboardingData={dataController.onboardingSnapshot.data}
                onClose={actionsController.closeDevelopmentOnboardingModal}
            />
        </AppContextProvider>
    );
}
