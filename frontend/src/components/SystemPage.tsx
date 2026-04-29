import FeatureFlagsPage from './FeatureFlagsPage.tsx';
import HubPage from './HubPage.tsx';
import SettingsPage from './SettingsPage.tsx';

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
