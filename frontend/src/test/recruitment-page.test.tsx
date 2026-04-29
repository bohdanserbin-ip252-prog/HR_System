import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RecruitmentPage from '../components/RecruitmentPage.tsx';

const { mockFetchJSON } = vi.hoisted(() => ({
  mockFetchJSON: vi.fn(),
}));

vi.mock('../api.ts', () => ({
  API: '',
  fetchJSON: (...args) => mockFetchJSON(...args),
}));

const adminUser = { id: 1, username: 'admin', role: 'admin' };
const regularUser = { id: 2, username: 'employee', role: 'user' };

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeCandidate(overrides = {}) {
  return {
    id: 11,
    full_name: 'Анна Коваль',
    email: 'anna@example.com',
    phone: '+380501112233',
    position_applied: 'Frontend Engineer',
    stage: 'new',
    source: 'LinkedIn',
    rating: 3,
    notes: 'Сильний React досвід',
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    ...overrides,
  };
}

describe('RecruitmentPage UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('renders an accessible grouped candidate form for admins', async () => {
    mockFetchJSON.mockResolvedValueOnce([]);

    render(<RecruitmentPage currentUser={adminUser} />);

    await waitFor(() => expect(mockFetchJSON).toHaveBeenCalledWith('/api/v2/candidates'));

    expect(screen.getByRole('heading', { name: 'Рекрутинг' })).toBeInTheDocument();
    expect(screen.getByText('Новий кандидат')).toBeInTheDocument();
    expect(screen.getByLabelText('ПІБ кандидата *')).toBeInTheDocument();
    expect(screen.getByLabelText('Посада *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Телефон')).toBeInTheDocument();
    expect(screen.getByLabelText('Джерело')).toBeInTheDocument();
    expect(screen.getByLabelText('Нотатки для команди')).toBeInTheDocument();
    expect(screen.getByText('Мінімально потрібно заповнити ПІБ та посаду.')).toBeInTheDocument();
  });

  it('hides management actions for non-admin users', async () => {
    mockFetchJSON.mockResolvedValueOnce([makeCandidate()]);

    render(<RecruitmentPage currentUser={regularUser} />);

    expect(await screen.findByText('Анна Коваль')).toBeInTheDocument();
    expect(screen.queryByText('Новий кандидат')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Перемістити/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Видалити/i })).not.toBeInTheDocument();
  });

  it('disables boundary movement controls and exposes clear stage actions', async () => {
    mockFetchJSON.mockResolvedValueOnce([
      makeCandidate({ id: 1, full_name: 'Олег Новий', stage: 'new' }),
      makeCandidate({ id: 2, full_name: 'Ірина Відхилена', stage: 'rejected', position_applied: 'QA Engineer' }),
    ]);

    render(<RecruitmentPage currentUser={adminUser} />);

    const newCard = await screen.findByTestId('candidate-card-1');
    const rejectedCard = await screen.findByTestId('candidate-card-2');

    const backFromNew = within(newCard).getByRole('button', {
      name: 'Попередня стадія недоступна для Олег Новий',
    });
    const forwardFromNew = within(newCard).getByRole('button', {
      name: 'Перемістити Олег Новий на стадію Скринінг',
    });
    const forwardFromRejected = within(rejectedCard).getByRole('button', {
      name: 'Наступна стадія недоступна для Ірина Відхилена',
    });

    expect(backFromNew).toBeDisabled();
    expect(forwardFromNew).toBeEnabled();
    expect(forwardFromRejected).toBeDisabled();
  });

  it('prevents duplicate stage transitions with per-candidate busy state', async () => {
    const stageDeferred = createDeferred();
    const candidate = makeCandidate({ id: 17, full_name: 'Марія QA' });

    mockFetchJSON.mockImplementation((url, options = {}) => {
      if (url === '/api/v2/candidates' && !options.method) {
        return Promise.resolve([candidate]);
      }
      if (url === '/api/v2/candidates/17/stage') {
        return stageDeferred.promise;
      }
      return Promise.resolve({ success: true });
    });

    render(<RecruitmentPage currentUser={adminUser} />);

    const card = await screen.findByTestId('candidate-card-17');
    const forwardButton = within(card).getByRole('button', {
      name: 'Перемістити Марія QA на стадію Скринінг',
    });
    const deleteButton = within(card).getByRole('button', { name: 'Видалити кандидата Марія QA' });

    fireEvent.click(forwardButton);
    fireEvent.click(forwardButton);

    const stageCalls = mockFetchJSON.mock.calls.filter(([url]) => url === '/api/v2/candidates/17/stage');
    expect(stageCalls).toHaveLength(1);
    expect(forwardButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    stageDeferred.resolve({ success: true });
    await waitFor(() => expect(forwardButton).toBeEnabled());
  });
});
