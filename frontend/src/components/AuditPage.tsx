import AuditAnalyticsTab from './AuditAnalyticsTab.tsx';
import AuditLogTab from './AuditLogTab.tsx';
import HubPage from './HubPage.tsx';

export default function AuditPage({ currentUser, isActive }) {
  return (
    <HubPage
      title="Аудит"
      description="Єдиний адміністративний модуль для журналу подій і аналітики контролю."
      isActive={isActive}
      tabs={[
        {
          key: 'log',
          label: 'Log',
          icon: 'history',
          render: ({ isActive: isTabActive }) => (
            <AuditLogTab currentUser={currentUser} isActive={isTabActive} />
          )
        },
        {
          key: 'analytics',
          label: 'Analytics',
          icon: 'monitoring',
          render: ({ isActive: isTabActive }) => <AuditAnalyticsTab isActive={isTabActive} />
        }
      ]}
      pageClassName="audit-page"
    />
  );
}
