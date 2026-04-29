import DepartmentsPage from './DepartmentsPage.tsx';
import OrgChartPage from './OrgChartPage.tsx';
import PositionsPage from './PositionsPage.tsx';
import RbacPage from './RbacPage.tsx';

export function createOrganizationTabs({
  currentUser,
  isActive,
  departmentsRefreshKey = 0,
  positionsRefreshKey = 0
}) {
  const isAdmin = currentUser?.role === 'admin';

  return [
    {
      key: 'departments',
      label: 'Departments',
      icon: 'apartment',
      render: ({ isActive: isTabActive }) => (
        <DepartmentsPage
          currentUser={currentUser}
          isActive={Boolean(isActive && isTabActive)}
          refreshKey={departmentsRefreshKey}
        />
      )
    },
    {
      key: 'positions',
      label: 'Positions',
      icon: 'work',
      render: ({ isActive: isTabActive }) => (
        <PositionsPage
          currentUser={currentUser}
          isActive={Boolean(isActive && isTabActive)}
          refreshKey={positionsRefreshKey}
        />
      )
    },
    {
      key: 'chart',
      label: 'Org Chart',
      icon: 'account_tree',
      render: ({ isActive: isTabActive }) => (
        <OrgChartPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} />
      )
    },
    {
      key: 'access',
      label: 'Access',
      icon: 'admin_panel_settings',
      hidden: !isAdmin,
      render: ({ isActive: isTabActive }) => (
        <RbacPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} />
      )
    }
  ];
}
