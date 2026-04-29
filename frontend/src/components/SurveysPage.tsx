import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import PageStateBoundary from './PageStateBoundary.tsx';
import { usePlatformData } from './platform/usePlatformData.ts';
import { normalizeSurvey } from './platform/surveys/surveyNormalization.ts';

export default function SurveysPage({ currentUser }) {
  const { status, items, error, reload } = usePlatformData(ENDPOINTS.surveys);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionError, setActionError] = useState('');
  const [voteBusyBySurvey, setVoteBusyBySurvey] = useState({});
  const [voteBusyByOption, setVoteBusyByOption] = useState({});
  const [toggleBusyBySurvey, setToggleBusyBySurvey] = useState({});
  const [deleteBusyBySurvey, setDeleteBusyBySurvey] = useState({});
  const isAdmin = currentUser?.role === 'admin';

  function updateBusyState(setter, key, value) {
    setter(current => {
      const mapKey = String(key);
      if (value) return { ...current, [mapKey]: true };
      if (!current[mapKey]) return current;
      const next = { ...current };
      delete next[mapKey];
      return next;
    });
  }

  async function createSurvey(event) {
    event.preventDefault();
    const formNode = event.currentTarget;
    const form = Object.fromEntries(new FormData(formNode).entries());
    const options = String(form.options || '').split('\n').map(option => option.trim()).filter(Boolean);
    if (options.length < 2) {
      setCreateError('Додайте щонайменше два варіанти відповіді.');
      return;
    }
    setCreateError('');
    setActionError('');
    setCreateBusy(true);
    try {
      await fetchJSON(ENDPOINTS.surveys, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, question: form.question, options }),
      });
      formNode.reset();
      await reload();
    } catch (requestError) {
      setCreateError(requestError?.message || 'Не вдалося створити опитування.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function vote(surveyId, choiceIndex) {
    if (surveyId === null || surveyId === undefined) return;
    const surveyKey = String(surveyId);
    const optionKey = `${surveyKey}:${choiceIndex}`;
    if (voteBusyBySurvey[surveyKey] || voteBusyByOption[optionKey]) return;

    setActionError('');
    updateBusyState(setVoteBusyBySurvey, surveyKey, true);
    updateBusyState(setVoteBusyByOption, optionKey, true);
    try {
      await fetchJSON(ENDPOINTS.surveyVote(surveyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice_index: choiceIndex, voter_name: currentUser?.username || 'Anonymous' }),
      });
      await reload();
    } catch (requestError) {
      setActionError(requestError?.message || 'Не вдалося надіслати голос.');
    } finally {
      updateBusyState(setVoteBusyBySurvey, surveyKey, false);
      updateBusyState(setVoteBusyByOption, optionKey, false);
    }
  }

  async function toggleSurvey(id) {
    if (id === null || id === undefined) return;
    const surveyKey = String(id);
    if (toggleBusyBySurvey[surveyKey]) return;

    setActionError('');
    updateBusyState(setToggleBusyBySurvey, surveyKey, true);
    try {
      await fetchJSON(ENDPOINTS.surveyToggle(id), { method: 'POST' });
      await reload();
    } catch (requestError) {
      setActionError(requestError?.message || 'Не вдалося змінити статус опитування.');
    } finally {
      updateBusyState(setToggleBusyBySurvey, surveyKey, false);
    }
  }

  async function removeSurvey(id) {
    if (id === null || id === undefined) return;
    const surveyKey = String(id);
    if (deleteBusyBySurvey[surveyKey]) return;
    if (!confirm('Видалити опитування?')) return;

    setActionError('');
    updateBusyState(setDeleteBusyBySurvey, surveyKey, true);
    try {
      await fetchJSON(ENDPOINTS.surveyById(id), { method: 'DELETE' });
      await reload();
    } catch (requestError) {
      setActionError(requestError?.message || 'Не вдалося видалити опитування.');
    } finally {
      updateBusyState(setDeleteBusyBySurvey, surveyKey, false);
    }
  }

  const isLoading = status === 'idle' || status === 'loading';
  const normalizedItems = Array.isArray(items) ? items.map((survey, index) => normalizeSurvey(survey, index)) : [];

  return (
    <div className="surveys-page">
      <div className="page-header platform-header">
        <div>
          <h1>Опитування</h1>
          <p>Залученість працівників: голосування та зворотний звʼязок.</p>
        </div>
        {isAdmin ? (
          <form className="platform-inline-form surveys-create-form" onSubmit={createSurvey}>
            <input name="title" placeholder="Назва" required />
            <input name="question" placeholder="Питання" required />
            <textarea
              className="form-input surveys-create-form__options"
              defaultValue="Так&#10;Ні"
              name="options"
              placeholder="Варіанти (кожен з нового рядка)"
              rows={4}
            />
            <div className="surveys-create-form__actions">
              <button className="btn btn-primary" disabled={createBusy} type="submit">
                {createBusy ? 'Створюємо...' : 'Створити'}
              </button>
              <p className="surveys-create-form__hint">Кожен варіант відповіді з нового рядка.</p>
            </div>
            {createError ? (
              <p className="surveys-alert surveys-alert--error" role="alert">{createError}</p>
            ) : null}
          </form>
        ) : null}
      </div>
      {actionError ? (
        <p className="surveys-alert surveys-alert--error" role="alert">{actionError}</p>
      ) : null}
      <PageStateBoundary
        loading={isLoading ? { icon: 'hourglass_top', title: 'Завантаження', description: 'Завантаження опитувань' } : null}
        error={status === 'error' ? { icon: 'error', title: 'Помилка', description: error } : null}
        empty={!isLoading && normalizedItems.length === 0 ? { icon: 'poll', title: 'Опитувань ще немає', description: 'Створіть перше опитування.' } : null}
      >
        <div className="platform-grid surveys-grid">
          {normalizedItems.map(survey => {
            const surveyKey = String(survey.key);
            const canMutate = survey.id !== null && survey.id !== undefined;
            const isToggleBusy = Boolean(toggleBusyBySurvey[surveyKey]);
            const isDeleteBusy = Boolean(deleteBusyBySurvey[surveyKey]);
            const isVoteBusy = Boolean(voteBusyBySurvey[surveyKey]);
            return (
              <div className="platform-card surveys-card" key={survey.key}>
                <div className="platform-card__head">
                  <span className="material-symbols-outlined surveys-card__icon" style={{ color: survey.active ? 'var(--primary)' : '#9ca3af' }}>poll</span>
                  <div>
                    <h3>{survey.title}</h3>
                    <p>{survey.question}</p>
                  </div>
                  <span className={`surveys-card__status ${survey.active ? 'is-active' : 'is-inactive'}`}>
                    {survey.active ? 'Активне' : 'Неактивне'}
                  </span>
                </div>
                <div className="platform-card__body">
                  <div className="surveys-options">
                    {survey.options.map((optionLabel, optionIndex) => {
                      const optionVotes = survey.voteCounts[optionIndex] || 0;
                      const percentage = survey.totalVotes > 0 ? Math.round((optionVotes / survey.totalVotes) * 100) : 0;
                      const optionBusyKey = `${surveyKey}:${optionIndex}`;
                      const isOptionBusy = Boolean(voteBusyByOption[optionBusyKey]);
                      return (
                        <div className="survey-option" key={optionBusyKey}>
                          <div className="survey-option__head">
                            <span className="survey-option__label">{optionLabel}</span>
                            <span className="survey-option__meta">{optionVotes} ({percentage}%)</span>
                          </div>
                          <div className="survey-option__line">
                            <div className="survey-option__track">
                              <div className="survey-option__fill" style={{ width: `${percentage}%` }} />
                            </div>
                            {survey.active ? (
                              <button
                                className="btn btn-outline survey-option__vote-btn"
                                disabled={!canMutate || isVoteBusy || isOptionBusy}
                                onClick={() => vote(survey.id, optionIndex)}
                                type="button"
                              >
                                {isOptionBusy ? 'Голосуємо...' : 'Голосувати'}
                              </button>
                            ) : (
                              <span className="survey-option__closed">Голосування закрите</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isVoteBusy ? (
                    <p className="surveys-inline-status" role="status">Надсилаємо ваш голос...</p>
                  ) : null}
                  <p className="surveys-total-votes">Всього голосів: {survey.totalVotes}</p>
                  {isAdmin ? (
                    <div className="platform-actions">
                      <button
                        className="btn btn-outline"
                        disabled={!canMutate || isToggleBusy || isDeleteBusy}
                        onClick={() => toggleSurvey(survey.id)}
                        type="button"
                      >
                        {isToggleBusy ? 'Оновлення...' : survey.active ? 'Деактивувати' : 'Активувати'}
                      </button>
                      <button
                        className="btn btn-outline"
                        disabled={!canMutate || isDeleteBusy || isToggleBusy}
                        onClick={() => removeSurvey(survey.id)}
                        type="button"
                      >
                        {isDeleteBusy ? 'Видалення...' : 'Видалити'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </PageStateBoundary>
    </div>
  );
}
