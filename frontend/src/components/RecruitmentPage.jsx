import { useRef, useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import PageStateBoundary from './PageStateBoundary.jsx';
import { usePlatformData } from './platform/usePlatformData.js';
import RecruitmentCreateForm from './platform/recruitment/RecruitmentCreateForm.jsx';
import {
  STAGES,
  STAGE_INDEX_BY_KEY,
  toOptionalRating,
  toOptionalString
} from './platform/recruitment/recruitmentConfig.js';

export default function RecruitmentPage({ currentUser }) {
  const { status, items, error, reload } = usePlatformData(ENDPOINTS.candidates);
  const [createBusy, setCreateBusy] = useState(false);
  const [busyCandidateIds, setBusyCandidateIds] = useState({});
  const [actionError, setActionError] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  const createInFlightRef = useRef(false);
  const pendingCandidateIdsRef = useRef(new Set());
  const isAdmin = currentUser?.role === 'admin';

  function setCandidateBusy(id, isBusy) {
    setBusyCandidateIds(current => {
      if (isBusy) {
        return { ...current, [id]: true };
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function runCandidateAction(id, liveMessage, callback) {
    if (pendingCandidateIdsRef.current.has(id)) return;
    pendingCandidateIdsRef.current.add(id);
    setCandidateBusy(id, true);
    setActionError('');
    setLiveStatus(liveMessage);

    try {
      await callback();
    } catch (requestError) {
      setActionError(requestError?.message || 'Не вдалося виконати дію з кандидатом.');
      setLiveStatus('Дію з кандидатом не виконано.');
    } finally {
      pendingCandidateIdsRef.current.delete(id);
      setCandidateBusy(id, false);
    }
  }

  async function createCandidate(event) {
    event.preventDefault();
    if (createInFlightRef.current) return;

    const rawForm = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      full_name: String(rawForm.full_name || '').trim(),
      position_applied: String(rawForm.position_applied || '').trim(),
      email: toOptionalString(rawForm.email),
      phone: toOptionalString(rawForm.phone),
      source: toOptionalString(rawForm.source),
      notes: toOptionalString(rawForm.notes),
      rating: toOptionalRating(rawForm.rating),
    };

    createInFlightRef.current = true;
    setCreateBusy(true);
    setActionError('');
    setLiveStatus('Створення кандидата...');
    try {
      await fetchJSON(ENDPOINTS.candidates, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      event.currentTarget.reset();
      await reload();
      setLiveStatus('Кандидата створено.');
    } catch (requestError) {
      setActionError(requestError?.message || 'Не вдалося створити кандидата.');
      setLiveStatus('Кандидата не створено.');
    } finally {
      createInFlightRef.current = false;
      setCreateBusy(false);
    }
  }

  async function moveStage(id, direction) {
    const candidate = items.find(c => c.id === id);
    if (!candidate) return;
    const idx = STAGE_INDEX_BY_KEY[candidate.stage];
    if (!Number.isInteger(idx)) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    await runCandidateAction(id, `Оновлення стадії кандидата ${candidate.full_name}...`, async () => {
      await fetchJSON(ENDPOINTS.candidateStage(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: STAGES[newIdx].key }),
      });
      await reload();
    });
  }

  async function removeCandidate(id) {
    const candidate = items.find(c => c.id === id);
    if (!candidate) return;
    if (!confirm('Видалити кандидата?')) return;
    await runCandidateAction(id, `Видалення кандидата ${candidate.full_name}...`, async () => {
      await fetchJSON(ENDPOINTS.candidateById(id), { method: 'DELETE' });
      await reload();
      setLiveStatus(`Кандидата ${candidate.full_name} видалено.`);
    });
  }

  const isLoading = status === 'idle' || status === 'loading';

  return (
    <div className="recruitment-page">
      <div className="page-header platform-header recruitment-header">
        <div className="recruitment-header__copy">
          <h1>Рекрутинг</h1>
          <p>Воронка найму: кандидати, стадії та офери.</p>
        </div>
        {isAdmin ? <RecruitmentCreateForm createBusy={createBusy} onSubmit={createCandidate} /> : null}
      </div>
      {actionError ? <p className="recruitment-feedback recruitment-feedback--error" role="alert">{actionError}</p> : null}
      <p aria-live="polite" className="recruitment-live-region">{liveStatus}</p>
      <PageStateBoundary
        loading={isLoading ? { icon: 'hourglass_top', title: 'Завантаження', description: 'Завантаження кандидатів' } : null}
        error={status === 'error' ? { icon: 'error', title: 'Помилка', description: error } : null}
        empty={!isLoading && items.length === 0 ? { icon: 'group_add', title: 'Кандидатів ще немає', description: 'Додайте першого кандидата у воронку найму.' } : null}
      >
        <div className="recruitment-board">
          {STAGES.map(stage => {
            const stageCandidates = items.filter(c => c.stage === stage.key);
            return (
              <section className="recruitment-column" key={stage.key}>
                <div className="recruitment-column__header" style={{ borderTopColor: stage.color }}>
                  <h2>{stage.label}</h2>
                  <span className="recruitment-column__count">{stageCandidates.length}</span>
                </div>
                <ul className="recruitment-cards">
                  {stageCandidates.length === 0 ? (
                    <li className="recruitment-column__empty">Немає кандидатів на цій стадії</li>
                  ) : null}
                  {stageCandidates.map(candidate => {
                    const stageIndex = STAGE_INDEX_BY_KEY[candidate.stage] ?? 0;
                    const previousStage = STAGES[stageIndex - 1] ?? null;
                    const nextStage = STAGES[stageIndex + 1] ?? null;
                    const isCandidateBusy = Boolean(busyCandidateIds[candidate.id]);
                    const moveBackLabel = previousStage
                      ? `Повернути ${candidate.full_name} на стадію ${previousStage.label}`
                      : `Попередня стадія недоступна для ${candidate.full_name}`;
                    const moveForwardLabel = nextStage
                      ? `Перемістити ${candidate.full_name} на стадію ${nextStage.label}`
                      : `Наступна стадія недоступна для ${candidate.full_name}`;

                    return (
                      <li aria-busy={isCandidateBusy} className={`recruitment-card${isCandidateBusy ? ' is-busy' : ''}`} data-testid={`candidate-card-${candidate.id}`} key={candidate.id}>
                        <p className="recruitment-card__title">{candidate.full_name}</p>
                        <p className="recruitment-card__position">{candidate.position_applied}</p>
                        <div className="recruitment-card__contacts">
                          {candidate.email ? <a href={`mailto:${candidate.email}`}>{candidate.email}</a> : null}
                          {candidate.phone ? <a href={`tel:${candidate.phone}`}>{candidate.phone}</a> : null}
                        </div>
                        {candidate.notes ? <p className="recruitment-card__notes">{candidate.notes}</p> : null}
                        <div className="recruitment-card__tags">
                          {candidate.source ? <span className="recruitment-tag">{candidate.source}</span> : null}
                          {candidate.rating > 0 ? <span className="recruitment-tag recruitment-tag--rating">{'★'.repeat(candidate.rating)}</span> : null}
                        </div>
                        {isAdmin ? (
                          <div className="recruitment-card__actions">
                            <button
                              aria-label={moveBackLabel}
                              className="recruitment-action-btn"
                              disabled={isCandidateBusy || !previousStage}
                              onClick={() => moveStage(candidate.id, -1)}
                              type="button"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
                              <span>{previousStage ? previousStage.label : 'Немає'}</span>
                            </button>
                            <button
                              aria-label={`Видалити кандидата ${candidate.full_name}`}
                              className="recruitment-action-btn recruitment-action-btn--danger"
                              disabled={isCandidateBusy}
                              onClick={() => removeCandidate(candidate.id)}
                              type="button"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                              <span>{isCandidateBusy ? 'Зачекайте...' : 'Видалити'}</span>
                            </button>
                            <button
                              aria-label={moveForwardLabel}
                              className="recruitment-action-btn recruitment-action-btn--primary"
                              disabled={isCandidateBusy || !nextStage}
                              onClick={() => moveStage(candidate.id, 1)}
                              type="button"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
                              <span>{nextStage ? nextStage.label : 'Немає'}</span>
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </PageStateBoundary>
    </div>
  );
}
