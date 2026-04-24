import HubPage from './HubPage.jsx';
import { createOrganizationTabs } from './organizationTabDefinitions.jsx';

export default function OrganizationHubPage({
  currentUser,
  isActive,
  departmentsRefreshKey = 0,
  positionsRefreshKey = 0
}) {
  return (
    <HubPage
      title="Організація"
      description="Єдина структура компанії: підрозділи, посади, оргсхема та модель доступу."
      isActive={isActive}
      tabs={createOrganizationTabs({
        currentUser,
        isActive,
        departmentsRefreshKey,
        positionsRefreshKey
      })}
      pageClassName="organization-hub-page"
    />
  );
}
