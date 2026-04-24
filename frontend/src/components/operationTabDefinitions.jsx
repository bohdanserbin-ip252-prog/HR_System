import DocumentsPage from './DocumentsPage.jsx';
import HelpDeskPage from './HelpDeskPage.jsx';
import ImportPage from './ImportPage.jsx';
import PayrollPage from './PayrollPage.jsx';
import PerformancePage from './PerformancePage.jsx';
import RecruitmentPage from './RecruitmentPage.jsx';
import ReportsPage from './ReportsPage.jsx';
import SchedulingPage from './SchedulingPage.jsx';
import SurveysPage from './SurveysPage.jsx';
import TimeOffPage from './TimeOffPage.jsx';
import TrainingPage from './TrainingPage.jsx';
import WorkflowsPage from './WorkflowsPage.jsx';

export function createOperationTabs({ currentUser, isActive }) {
  return [
    { key: 'documents', label: 'Documents', icon: 'folder_managed', render: ({ isActive: isTabActive }) => <DocumentsPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} /> },
    { key: 'recruitment', label: 'Recruitment', icon: 'group_add', render: () => <RecruitmentPage currentUser={currentUser} /> },
    { key: 'surveys', label: 'Surveys', icon: 'poll', render: () => <SurveysPage currentUser={currentUser} /> },
    { key: 'help-desk', label: 'Help Desk', icon: 'support_agent', render: () => <HelpDeskPage currentUser={currentUser} /> },
    { key: 'payroll', label: 'Payroll', icon: 'payments', render: () => <PayrollPage currentUser={currentUser} /> },
    { key: 'training', label: 'Training', icon: 'school', render: ({ isActive: isTabActive }) => <TrainingPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} /> },
    { key: 'scheduling', label: 'Scheduling', icon: 'calendar_month', render: ({ isActive: isTabActive }) => <SchedulingPage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} /> },
    { key: 'time-off-requests', label: 'Time Off', icon: 'event_busy', render: () => <TimeOffPage currentUser={currentUser} /> },
    { key: 'performance', label: 'Performance', icon: 'reviews', render: ({ isActive: isTabActive }) => <PerformancePage currentUser={currentUser} isActive={Boolean(isActive && isTabActive)} /> },
    { key: 'workflows', label: 'Workflows', icon: 'account_tree', render: () => <WorkflowsPage currentUser={currentUser} /> },
    { key: 'import', label: 'Import', icon: 'upload_file', render: () => <ImportPage currentUser={currentUser} /> },
    { key: 'reports', label: 'Reports', icon: 'summarize', render: () => <ReportsPage currentUser={currentUser} /> }
  ];
}
