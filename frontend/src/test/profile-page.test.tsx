import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.tsx';

const mockFetchJSON = vi.fn();

vi.mock('../api.ts', () => ({
  API: '',
  fetchJSON: (...args) => mockFetchJSON(...args)
}));

import ProfilePage from '../components/ProfilePage.tsx';

function createProfile() {
  return {
    identity: {
      id: 42,
      first_name: 'Іван',
      last_name: 'Петренко',
      middle_name: '',
      birth_date: '1990-01-01',
      email: 'ivan@example.com',
      phone: '+380000000000',
      address: 'Київ'
    },
    employment: {
      hire_date: '2020-01-01',
      salary: 1000,
      status: 'active',
      department_name: 'HR',
      position_title: 'Recruiter'
    },
    complaints: []
  };
}

function renderProfilePage(props = {}) {
  const actions = {
    editEmployee: vi.fn(),
    goBackToEmployees: vi.fn(),
    handleUnauthorized: vi.fn()
  };

  render(
    <AppContextProvider state={{}} actions={actions}>
      <ProfilePage
        currentUser={{ id: 2, username: 'viewer', role: 'viewer' }}
        employeeId={42}
        isActive
        refreshKey={0}
        {...props}
      />
    </AppContextProvider>
  );

  return { actions };
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the selected employee profile when employeeId is restored', async () => {
    mockFetchJSON.mockResolvedValueOnce(createProfile());

    renderProfilePage();

    await waitFor(() => {
      expect(mockFetchJSON).toHaveBeenCalledWith(
        '/api/v2/profile/42',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });
});
