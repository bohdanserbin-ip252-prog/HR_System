import FeatureFlagsPage from './FeatureFlagsPage.jsx';
import HubPage from './HubPage.jsx';
import SettingsPage from './SettingsPage.jsx';

export default function SystemPage({ currentUser, isActive }) {
  return (
    <HubPage
      title="System"
      description="Системні налаштування облікового запису та керування feature flags."
      isActive={isActive}
      tabs={[
        { key: 'settings', label: 'Settings', icon: 'settings', render: () => <SettingsPage currentUser={currentUser} /> },
        {
          key: 'flags',
          label: 'Feature Flags',
          icon: 'toggle_on',
          render: ({ isActive: isTabActive }) => (
            <FeatureFlagsPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} />
          )
        }
      ]}
      pageClassName="system-page"
    />
  );
}
