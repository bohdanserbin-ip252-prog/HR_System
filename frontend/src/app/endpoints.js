import { API } from '../api.js';

const API_V2 = `${API}/api/v2`;
const withPath = path => `${API_V2}${path}`;
const withId = (basePath, id) => `${basePath}/${id}`;
const withQuery = (path, params) => {
    const normalizedEntries = Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined);
    const query = new URLSearchParams(normalizedEntries).toString();
    return query ? `${withPath(path)}?${query}` : withPath(path);
};

export const ENDPOINTS = {
    auth: {
        me: withPath('/auth/me'),
        login: withPath('/auth/login'),
        logout: withPath('/auth/logout'),
        changePassword: withPath('/auth/change-password')
    },
    search: params => withQuery('/search', params),
    stats: withPath('/stats'),
    development: withPath('/development'),
    onboarding: withPath('/onboarding'),
    activity: withPath('/activity'),
    audit: withPath('/audit'),
    auditByLimit: limit => withQuery('/audit', { limit }),
    employees: withPath('/employees'),
    employeesQuery: params => withQuery('/employees', params),
    employeesSortedByLastName: withQuery('/employees', { sort_by: 'last_name', sort_dir: 'asc' }),
    employeeById: employeeId => withId(withPath('/employees'), employeeId),
    profileMe: withPath('/profile/me'),
    profileById: employeeId => withId(withPath('/profile'), employeeId),
    departments: withPath('/departments'),
    departmentById: departmentId => withId(withPath('/departments'), departmentId),
    positions: withPath('/positions'),
    positionById: positionId => withId(withPath('/positions'), positionId),
    organizationChart: withPath('/organization/chart'),
    rbacRoles: withPath('/rbac/roles'),
    rbacPermissions: withPath('/rbac/permissions'),
    rbacMatrix: withPath('/rbac/matrix'),
    complaints: withPath('/complaints'),
    complaintsByEmployee: employeeId => withQuery('/complaints', { employee_id: employeeId }),
    complaintById: complaintId => withId(withPath('/complaints'), complaintId),
    notifications: withPath('/notifications'),
    notificationsUnreadCount: withPath('/notifications/unread-count'),
    notificationsReadAll: withPath('/notifications/read-all'),
    notificationReadById: notificationId => withPath(`/notifications/${notificationId}/read`),
    documents: withPath('/documents'),
    documentById: documentId => withId(withPath('/documents'), documentId),
    documentDownloadById: documentId => withPath(`/documents/${documentId}/download`),
    payrollRuns: withPath('/payroll/runs'),
    payrollFinalize: runId => withPath(`/payroll/runs/${runId}/finalize`),
    trainingCourses: withPath('/training/courses'),
    trainingAssignments: withPath('/training/assignments'),
    shifts: withPath('/shifts'),
    workflows: withPath('/workflows'),
    workflowsStart: withPath('/workflows/start'),
    timeOffRequests: withPath('/time-off-requests'),
    decideTimeOffRequest: (requestId, decision) => withPath(`/time-off-requests/${requestId}/${decision}`),
    reviews: withPath('/reviews'),
    tickets: withPath('/tickets'),
    ticketById: ticketId => withId(withPath('/tickets'), ticketId),
    ticketStatusById: ticketId => withPath(`/tickets/${ticketId}/status`),
    importPreview: kind => withPath(`/import/${kind}/preview`),
    importCommit: kind => withPath(`/import/${kind}/commit`),
    reportByKind: kind => withPath(`/reports/${kind}`),
    reportCsvByKind: kind => withPath(`/reports/${kind}/csv`),
    systemFeatureFlags: withPath('/system/feature-flags'),
    systemFeatureFlagByKey: key => withPath(`/system/feature-flags/${key}`),
    onboardingTasks: withPath('/onboarding/tasks'),
    onboardingTaskById: taskId => withId(withPath('/onboarding/tasks'), taskId),
    developmentGoals: withPath('/development/goals'),
    developmentGoalById: goalId => withId(withPath('/development/goals'), goalId),
    developmentMeetings: withPath('/development/meetings'),
    developmentMeetingById: meetingId => withId(withPath('/development/meetings'), meetingId),
    developmentFeedback: withPath('/development/feedback'),
    developmentFeedbackById: feedbackId => withId(withPath('/development/feedback'), feedbackId),
    surveys: withPath('/surveys'),
    surveyVote: surveyId => withPath(`/surveys/${surveyId}/vote`),
    surveyToggle: surveyId => withPath(`/surveys/${surveyId}/toggle`),
    surveyById: surveyId => withId(withPath('/surveys'), surveyId),
    candidates: withPath('/candidates'),
    candidateStage: candidateId => withPath(`/candidates/${candidateId}/stage`),
    candidateById: candidateId => withId(withPath('/candidates'), candidateId)
};
