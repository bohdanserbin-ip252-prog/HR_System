import ActivityPage from '../components/ActivityPage.tsx';
import AuditPage from '../components/AuditPage.tsx';
import ComplaintsPage from '../components/ComplaintsPage.tsx';
import DashboardPage from '../components/DashboardPage.tsx';
import DevelopmentPage from '../components/DevelopmentPage.tsx';
import EmployeesPage from '../components/EmployeesPage.tsx';
import OnboardingPage from '../components/OnboardingPage.tsx';
import OperationsPage from '../components/OperationsPage.tsx';
import OrganizationHubPage from '../components/OrganizationHubPage.tsx';
import ProfilePage from '../components/ProfilePage.tsx';
import SystemPage from '../components/SystemPage.tsx';

const PAGE_DEFINITIONS = [
  {
    page: 'dashboard',
    topNavLabel: 'Огляд',
    sidebarLabel: 'Огляд системи',
    icon: 'insights',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <DashboardPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'dashboard'}
        snapshot={dataController.dashboardSnapshot}
      />
    )
  },
  {
    page: 'employees',
    topNavLabel: 'Кадри',
    sidebarLabel: 'Кадровий склад',
    icon: 'account_balance',
    badgeKey: 'employees',
    createPolicy: 'admin',
    fabAction: 'openEmployeeCreate',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <EmployeesPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'employees'}
        refreshKey={dataController.employeesRefreshKey}
      />
    )
  },
  {
    page: 'organization',
    sidebarLabel: 'Організація',
    icon: 'account_tree',
    createPolicy: 'admin',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <OrganizationHubPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'organization'}
        departmentsRefreshKey={dataController.departmentsRefreshKey}
        positionsRefreshKey={dataController.positionsRefreshKey}
      />
    )
  },
  {
    page: 'complaints',
    sidebarLabel: 'Скарги',
    icon: 'report_problem',
    createPolicy: 'all',
    fabAction: 'openComplaintCreate',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <ComplaintsPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'complaints'}
        snapshot={dataController.complaintsSnapshot}
      />
    )
  },
  {
    page: 'onboarding',
    sidebarLabel: 'Адаптація',
    icon: 'person_add',
    createPolicy: 'admin',
    fabAction: 'openTaskCreate',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <OnboardingPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'onboarding'}
        snapshot={dataController.onboardingSnapshot}
      />
    )
  },
  {
    page: 'development',
    sidebarLabel: 'Розвиток',
    icon: 'trending_up',
    createPolicy: 'admin',
    fabAction: 'openGoalCreate',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <DevelopmentPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'development'}
        snapshot={dataController.developmentSnapshot}
      />
    )
  },
  {
    page: 'profile',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <ProfilePage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'profile'}
        employeeId={dataController.profileEmployeeId}
        refreshKey={dataController.profileRefreshKey}
      />
    )
  },
  {
    page: 'activity',
    topNavLabel: 'Активність',
    sidebarLabel: 'Активність',
    icon: 'rss_feed',
    render: ({ authStatus, currentPage, currentUser, dataController }) => (
      <ActivityPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'activity'}
        snapshot={dataController.activitySnapshot}
      />
    )
  },
  {
    page: 'audit',
    sidebarLabel: 'Аудит',
    icon: 'history',
    render: ({ authStatus, currentPage, currentUser }) => (
      <AuditPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'audit'}
      />
    )
  },
  {
    page: 'operations',
    topNavLabel: 'Operations',
    sidebarLabel: 'Operations',
    icon: 'hub',
    createPolicy: 'admin',
    render: ({ authStatus, currentPage, currentUser }) => (
      <OperationsPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'operations'}
      />
    )
  },
  {
    page: 'system',
    sidebarLabel: 'System',
    icon: 'settings',
    createPolicy: 'admin',
    render: ({ authStatus, currentPage, currentUser }) => (
      <SystemPage
        currentUser={currentUser}
        isActive={authStatus === 'authenticated' && currentPage === 'system'}
      />
    )
  }
];

const PAGE_LOOKUP = new Map(PAGE_DEFINITIONS.map(definition => [definition.page, definition]));

export const PAGE_ORDER = PAGE_DEFINITIONS.map(definition => definition.page);

export const TOP_NAV_ITEMS = PAGE_DEFINITIONS
  .filter(definition => definition.topNavLabel)
  .map(definition => ({ page: definition.page, label: definition.topNavLabel }));

export const SIDEBAR_ITEMS = PAGE_DEFINITIONS
  .filter(definition => definition.sidebarLabel)
  .map(definition => ({
    page: definition.page,
    label: definition.sidebarLabel,
    icon: definition.icon,
    badgeKey: definition.badgeKey
  }));

export function getFabActionForPage(page) {
  return PAGE_LOOKUP.get(page)?.fabAction || null;
}

export function hasFabAction(page) {
  return Boolean(getFabActionForPage(page));
}

export function canCreateOnPage(role, page) {
  const createPolicy = PAGE_LOOKUP.get(page)?.createPolicy || 'none';
  if (createPolicy === 'all') return true;
  return createPolicy === 'admin' && role === 'admin';
}

export function createRenderedPages(context) {
  return PAGE_DEFINITIONS.reduce((views, definition) => {
    views[definition.page] = definition.render(context);
    return views;
  }, {});
}
