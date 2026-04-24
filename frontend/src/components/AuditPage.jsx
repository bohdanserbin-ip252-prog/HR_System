import AuditAnalyticsTab from './AuditAnalyticsTab.jsx';
import AuditLogTab from './AuditLogTab.jsx';
import HubPage from './HubPage.jsx';

export default function AuditPage({ currentUser, isActive }) {
  return (
    <HubPage
      title="Аудит"
      description="Єдиний адміністративний модуль для журналу подій і аналітики контролю."
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
