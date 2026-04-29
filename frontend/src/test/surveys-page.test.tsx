import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SurveysPage from '../components/SurveysPage.tsx';

const mockFetchJSON = vi.fn();
const mockUsePlatformData = vi.fn();

vi.mock('../api.ts', () => ({
  API: '',
  fetchJSON: (...args) => mockFetchJSON(...args),
}));

vi.mock('../components/platform/usePlatformData.ts', () => ({
  usePlatformData: (...args) => mockUsePlatformData(...args),
}));

function createSurvey(overrides = {}) {
  return {
    id: 1,
    title: 'Опитування',
    question: 'Чи задоволені ви умовами?',
    options: '["Так","Ні"]',
    vote_counts: [4, 2],
    total_votes: 6,
    active: true,
    ...overrides,
  };
}

function renderPage({ items = [createSurvey()], reload = vi.fn(async () => {}), user = { username: 'anna', role: 'admin' } } = {}) {
  mockUsePlatformData.mockReturnValue({
    status: 'ready',
    items,
    error: '',
    reload,
  });
  return { reload, ...render(<SurveysPage currentUser={user} />) };
}

describe('SurveysPage UX and resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders safely even when survey payload is malformed', () => {
    renderPage({
      items: [
        createSurvey({
          title: 'Broken Survey',
          options: '{"bad":"json"}',
          vote_counts: 'invalid',
          total_votes: null,
        }),
      ],
    });

    expect(screen.getByText('Broken Survey')).toBeInTheDocument();
    expect(screen.getByText('Варіант 1')).toBeInTheDocument();
    expect(screen.getByText('Всього голосів: 0')).toBeInTheDocument();
    expect(screen.getByText('0 (0%)')).toBeInTheDocument();
  });

  it('prevents duplicate vote requests and shows pending feedback per option', async () => {
    const { reload } = renderPage();

    let resolveVote;
    mockFetchJSON.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveVote = resolve;
        })
    );

    const voteButton = screen.getAllByRole('button', { name: 'Голосувати' })[0];
    fireEvent.click(voteButton);
    fireEvent.click(voteButton);

    expect(mockFetchJSON).toHaveBeenCalledTimes(1);
    expect(voteButton).toBeDisabled();
    expect(voteButton).toHaveTextContent('Голосуємо...');

    resolveVote({});
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('prevents duplicate admin actions while toggle/delete requests are pending', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPage();

    let resolveToggle;
    let resolveDelete;
    mockFetchJSON.mockImplementation((url, options = {}) => {
      if (url.endsWith('/toggle')) {
        return new Promise(resolve => {
          resolveToggle = resolve;
        });
      }
      if (options.method === 'DELETE') {
        return new Promise(resolve => {
          resolveDelete = resolve;
        });
      }
      return Promise.resolve({});
    });

    const toggleButton = screen.getByRole('button', { name: 'Деактивувати' });
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
    expect(mockFetchJSON).toHaveBeenCalledTimes(1);
    expect(toggleButton).toBeDisabled();
    expect(toggleButton).toHaveTextContent('Оновлення...');

    resolveToggle({});
    await waitFor(() => expect(toggleButton).toHaveTextContent('Деактивувати'));

    const deleteButton = screen.getByRole('button', { name: 'Видалити' });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);
    expect(mockFetchJSON).toHaveBeenCalledTimes(2);
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveTextContent('Видалення...');

    resolveDelete({});
    await waitFor(() => expect(deleteButton).toHaveTextContent('Видалити'));
  });

  it('validates create form options before submit', () => {
    mockUsePlatformData.mockReturnValue({
      status: 'ready',
      items: [],
      error: '',
      reload: vi.fn(),
    });

    render(<SurveysPage currentUser={{ username: 'anna', role: 'admin' }} />);

    fireEvent.change(screen.getByPlaceholderText('Назва'), { target: { value: 'Тест' } });
    fireEvent.change(screen.getByPlaceholderText('Питання'), { target: { value: 'Питання?' } });
    fireEvent.change(screen.getByPlaceholderText('Варіанти (кожен з нового рядка)'), { target: { value: 'Лише один' } });
    fireEvent.click(screen.getByRole('button', { name: 'Створити' }));

    expect(mockFetchJSON).not.toHaveBeenCalled();
    expect(screen.getByText('Додайте щонайменше два варіанти відповіді.')).toBeInTheDocument();
  });
});
