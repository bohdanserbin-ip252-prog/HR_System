import { useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import { getErrorMessage } from '../uiUtils.js';
import { showToast } from '../toast.js';
import PageStateBoundary from './PageStateBoundary.jsx';

export default function FeatureFlagsPage({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [flags, setFlags] = useState([]);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive && isAdmin),
    deps: [isActive, isAdmin, handleUnauthorized],
    onDisabled: () => {
      if (!isAdmin) {
        setFlags([]);
        resetAsyncStatus();
      }
    },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.systemFeatureFlags, { signal });
        if (!signal.aborted) {
          setFlags(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        failWithError(error, 'Помилка завантаження прапорців функцій');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  async function updateFlag(key, updates) {
    try {
      await fetchJSON(ENDPOINTS.systemFeatureFlagByKey(key), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setFlags(prev => prev.map(f => (f.key === key ? { ...f, ...updates } : f)));
      showToast('Оновлено успішно', 'success');
    } catch (error) {
      if (error?.status === 401) {
        handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
        return;
      }
      showToast(getErrorMessage(error, 'Помилка оновлення'), 'error');
    }
  }

  const loadingState = isLoading && !flags.length ? {
    icon: 'hourglass_top',
    title: 'Завантаження прапорців',
    description: 'Отримуємо актуальні дані з сервера...'
  } : null;

  const errorState = errorMessage ? {
    icon: 'error',
    title: 'Не вдалося завантажити прапорці',
    description: errorMessage
  } : null;

  const emptyState = !loadingState && !errorState && !flags.length ? {
    icon: 'toggle_off',
    title: 'Прапорці відсутні',
    description: 'Feature flags не налаштовано.'
  } : null;

  if (!isAdmin) {
    return (
      <PageStateBoundary
        empty={{ icon: 'block', title: 'Доступ заборонено', description: 'Ця сторінка доступна лише адміністраторам.' }}
      />
    );
  }

  return (
    <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>
      <div className="page-header">
        <h1>Feature Flags</h1>
        <p>Керування функціональністю системи.</p>
      </div>

      <div className="card">
        <div className="card-header-bar">
          <h2>Прапорці функцій</h2>
        </div>

        <div className="employees-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ключ</th>
                <th>Увімкнено</th>
                <th>Rollout %</th>
                <th>Дозволені ролі</th>
              </tr>
            </thead>
            <tbody>
              {flags.map(flag => (
                <tr key={flag.key}>
                  <td>{flag.key}</td>
                  <td>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(flag.enabled)}
                        onChange={e => updateFlag(flag.key, { enabled: e.target.checked })}
                        aria-label={`Увімкнути ${flag.key}`}
                      />
                      <span className="toggle-slider" aria-hidden="true"></span>
                    </label>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-input"
                      style={{ width: '80px' }}
                      value={flag.rollout_percentage ?? 0}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        updateFlag(flag.key, { rollout_percentage: val });
                      }}
                      aria-label={`Rollout % для ${flag.key}`}
                    />
                  </td>
                  <td>{Array.isArray(flag.allowed_roles) ? flag.allowed_roles.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageStateBoundary>
  );
}
