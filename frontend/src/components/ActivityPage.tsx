import ActivityInboxTab from './ActivityInboxTab.tsx';
import ActivityTimelineTab from './ActivityTimelineTab.tsx';
import HubPage from './HubPage.tsx';

export default function ActivityPage({ currentUser, isActive, snapshot }) {
  return (
    <HubPage
      title="Активність"
      description="Єдина точка для персональних сповіщень та загальної стрічки подій."
      isActive={isActive}
      tabs={[
        {
          key: 'inbox',
          label: 'Inbox',
          icon: 'notifications',
          render: ({ isActive: isTabActive }) => (
            <ActivityInboxTab currentUser={currentUser} isActive={isTabActive} />
          )
        },
        {
          key: 'timeline',
          label: 'Timeline',
          icon: 'rss_feed',
          render: ({ isActive: isTabActive }) => (
            <ActivityTimelineTab isActive={isTabActive} snapshot={snapshot} />
          )
        }
      ]}
      pageClassName="activity-page"
    />
  );
}
