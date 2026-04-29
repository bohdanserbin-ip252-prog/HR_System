import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import PageStateBoundary from './PageStateBoundary.tsx';

const STATUS_LABELS = {
  draft: 'Чернетка',
  self_review: 'Self-review',
  manager_review: 'Manager review',
  finalized: 'Фіналізовано'
};

export default function PerformancePage({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [scores, setScores] = useState([{ competency: '', score: 4, note: '' }]);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setReviews([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.reviews, { signal });
        if (!signal.aborted) setReviews(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження reviews');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  async function createReview(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await fetchJSON(ENDPOINTS.reviews, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: Number(form.employee_id),
          period: form.period,
          status: form.status,
          summary: form.summary,
          scores: scores.filter(s => s.competency).map(s => ({ competency: s.competency, score: Number(s.score), note: s.note }))
        })
      });
      event.currentTarget.reset();
      setScores([{ competency: '', score: 4, note: '' }]);
      setShowForm(false);
      const data = await fetchJSON(ENDPOINTS.reviews);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      failWithError(error, 'Помилка створення review');
    }
  }

  function addScoreField() {
    setScores(prev => [...prev, { competency: '', score: 4, note: '' }]);
  }

  function updateScore(index, field, value) {
    setScores(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function removeScore(index) {
    setScores(prev => prev.filter((_, i) => i !== index));
  }

  const loadingState = isLoading && !reviews.length ? { icon: 'hourglass_top', title: 'Завантаження...', description: 'Отримуємо performance reviews...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !reviews.length ? { icon: 'workspace_premium', title: 'Reviews відсутні', description: 'Створіть перший performance review.' } : null;

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>Performance Review</h1>
          <p>Оцінювання компетенцій, self-review та фінальні підсумки.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} type="button">
            {showForm ? 'Скасувати' : 'Створити review'}
          </button>
        )}
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      {showForm && (
        <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
          <h3>Новий Performance Review</h3>
          <form onSubmit={createReview}>
            <div className="platform-inline-form" style={{ marginBottom: '12px' }}>
              <input name="employee_id" placeholder="ID працівника" required type="number" className="form-input" />
              <input name="period" placeholder="2026 Q2" required className="form-input" />
              <select name="status" defaultValue="draft" className="form-input">
                <option value="draft">Чернетка</option>
                <option value="self_review">Self-review</option>
                <option value="manager_review">Manager review</option>
                <option value="finalized">Фіналізовано</option>
              </select>
            </div>
            <input name="summary" placeholder="Загальний підсумок" className="form-input" style={{ marginBottom: '12px', width: '100%' }} />
            <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Оцінки компетенцій</h4>
            {scores.map((s, i) => (
              <div className="platform-inline-form" key={i} style={{ marginBottom: '8px' }}>
                <input placeholder="Компетенція" value={s.competency} onChange={e => updateScore(i, 'competency', e.target.value)} className="form-input" required />
                <input type="number" min="1" max="5" value={s.score} onChange={e => updateScore(i, 'score', e.target.value)} className="form-input" style={{ maxWidth: '80px' }} />
                <input placeholder="Примітка" value={s.note} onChange={e => updateScore(i, 'note', e.target.value)} className="form-input" />
                {scores.length > 1 && (
                  <button type="button" className="btn btn-secondary" onClick={() => removeScore(i)}>×</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={addScoreField}>+ Додати оцінку</button>
              <button type="submit" className="btn btn-primary">Створити</button>
            </div>
          </form>
        </div>
      )}

      <div className="platform-grid">
        {reviews.map(review => (
          <div className="card platform-card" key={review.id}>
            <div className="platform-card__head">
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>workspace_premium</span>
              <div>
                <h3>{review.period}</h3>
                <p>Працівник #{review.employeeId} · {STATUS_LABELS[review.status] || review.status}</p>
              </div>
            </div>
            <div className="platform-card__body">
              {review.summary && <p>{review.summary}</p>}
              {Array.isArray(review.scores) && review.scores.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {review.scores.map((s, i) => (
                    <span key={i} className="tag tag-info" style={{ fontSize: '12px', padding: '4px 8px' }}>
                      {s.competency}: {s.score}/5
                    </span>
                  ))}
                </div>
              )}
              {review.finalizedAt && <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Фіналізовано: {review.finalizedAt}</div>}
            </div>
          </div>
        ))}
      </div>
    </PageStateBoundary>
    </>
  );
}
