import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.jsx';
import DevelopmentPage from '../components/DevelopmentPage.jsx';
import OnboardingPage from '../components/OnboardingPage.jsx';
import ProfileMain from '../components/profile/ProfileMain.jsx';

function renderWithActions(node, actionsOverrides = {}) {
  const actions = {
    confirmDelete: vi.fn(),
    editFeedback: vi.fn(),
    editGoal: vi.fn(),
    editMeeting: vi.fn(),
    editTask: vi.fn(),
    openFeedbackCreate: vi.fn(),
    openGoalCreate: vi.fn(),
    openMeetingCreate: vi.fn(),
    openTaskCreate: vi.fn(),
    ...actionsOverrides
  };

  return render(
    <AppContextProvider state={{}} actions={actions}>
      {node}
    </AppContextProvider>
  );
}

describe('Detail pages responsive class extraction', () => {
  it('uses profile-info-grid class for personal info instead of inline grid columns', () => {
    const employee = {
      first_name: 'Іван',
      last_name: 'Петренко',
      middle_name: 'Олексійович',
      position_title: 'Frontend Developer',
      department_name: 'IT',
      status: 'active',
      birth_date: '1994-01-10',
      email: 'ivan.petrenko@example.com',
      phone: '+380991112233',
      address: 'Київ',
      salary: 25000,
      hire_date: '2022-03-15'
    };

    const { container } = render(
      <ProfileMain
        employee={employee}
        tenure={{ tenureLabel: '4 роки', hireDateLabel: '15 березня 2022' }}
      />
    );

    const infoGrid = container.querySelector('#profileNarrative .profile-info-grid');
    expect(infoGrid).toBeInTheDocument();
    expect(infoGrid).not.toHaveAttribute('style');
  });

  it('adds onboarding-content hook on ob-bento wrapper', () => {
    const snapshot = {
      status: 'success',
      data: {
        team: { avatars: [], totalCount: 0 },
        tasks: [],
        buddy: null,
        progress: { percent: 45, completedCount: 2, totalCount: 4 }
      }
    };

    const { container } = renderWithActions(
      <OnboardingPage currentUser={{ role: 'admin' }} isActive={true} snapshot={snapshot} />
    );

    expect(container.querySelector('.ob-bento.onboarding-content')).toBeInTheDocument();
  });

  it('adds development-content hook on dev-grid wrapper', () => {
    const snapshot = {
      status: 'success',
      data: {
        goals: [],
        feedback: [],
        meetings: []
      }
    };

    const { container } = renderWithActions(
      <DevelopmentPage currentUser={{ role: 'admin' }} isActive={true} snapshot={snapshot} />
    );

    expect(container.querySelector('.dev-grid.development-content')).toBeInTheDocument();
  });
});
