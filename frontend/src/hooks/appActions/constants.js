import { ENDPOINTS } from '../../app/endpoints.js';

export const MOVE_ENDPOINTS = {
  developmentGoal: id => `${ENDPOINTS.developmentGoalById(id)}/move`,
  developmentFeedback: id => `${ENDPOINTS.developmentFeedbackById(id)}/move`,
  developmentMeeting: id => `${ENDPOINTS.developmentMeetingById(id)}/move`,
  onboardingTask: id => `${ENDPOINTS.onboardingTaskById(id)}/move`
};

export const DELETE_ENDPOINTS = {
  complaint: ENDPOINTS.complaintById,
  employee: ENDPOINTS.employeeById,
  department: ENDPOINTS.departmentById,
  position: ENDPOINTS.positionById,
  developmentGoal: ENDPOINTS.developmentGoalById,
  developmentFeedback: ENDPOINTS.developmentFeedbackById,
  developmentMeeting: ENDPOINTS.developmentMeetingById,
  onboardingTask: ENDPOINTS.onboardingTaskById
};

export const MOVE_CACHE_KEYS = {
  developmentGoal: ['development'],
  developmentFeedback: ['development'],
  developmentMeeting: ['development'],
  onboardingTask: ['onboarding']
};

export const DELETE_CACHE_KEYS = {
  complaint: ['complaints'],
  employee: ['stats'],
  department: ['stats'],
  position: ['stats'],
  developmentGoal: ['development'],
  developmentFeedback: ['development'],
  developmentMeeting: ['development'],
  onboardingTask: ['onboarding']
};
