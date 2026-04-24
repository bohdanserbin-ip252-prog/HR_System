import { useMemo, useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import { formatDate } from '../uiUtils.js';
import PageStateBoundary from './PageStateBoundary.jsx';

export default function AuditLogTab({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [logs, setLogs] = useState([]);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useAbortableLoadEffect({
    enabled: Boolean(isActive && isAdmin),
    deps: [isActive, isAdmin, handleUnauthorized],
    onDisabled: () => {
      if (!isAdmin) {
        setLogs([]);
        resetAsyncStatus();
      }
    },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.auditByLimit(50), { signal });
        if (!signal.aborted) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        failWithError(error, 'Помилка завантаження журналу аудиту');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (entityType && log.entityType !== entityType) return false;
      if (actionFilter && !log.action?.toLowerCase().includes(actionFilter.toLowerCase())) return false;
      if (dateFrom) {
        const logDate = new Date(log.createdAt);
        const from = new Date(dateFrom);
        if (logDate < from) return false;
      }
      if (dateTo) {
        const logDate = new Date(log.createdAt);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (logDate > to) return false;
      }
      return true;
    });
  }, [logs, entityType, actionFilter, dateFrom, dateTo]);

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map(l => l.entityType).filter(Boolean));
    return Array.from(types).sort();
  }, [logs]);

  const loadingState = isLoading && !logs.length ? {
    icon: 'hourglass_top',
    title: 'Завантаження журналу аудиту',
    description: 'Отримуємо актуальні дані з сервера...'
  } : null;

  const errorState = errorMessage ? {
    icon: 'error',
    title: 'Не вдалося завантажити журнал',
    description: errorMessage
  } : null;

  const emptyState = !loadingState && !errorState && !filteredLogs.length ? {
    icon: 'history',
    title: 'Записи відсутні',
    description: 'Журнал аудиту порожній або не знайдено записів за вибраним фільтром.'
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
        <h1>Журнал аудиту</h1>
        <p>Перегляд змін та дій у системі.</p>
      </div>

      <div className="card">
        <div className="card-header-bar">
          <h2>Записи аудиту</h2>
        </div>

        <div className="toolbar">
          <select
            className="form-input"
            style={{ maxWidth: '180px' }}
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
            aria-label="Фільтр за сутністю"
          >
            <option value="">Всі сутності</option>
            {entityTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="search-bar" style={{ maxWidth: '220px' }}>
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Дія..."
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              aria-label="Фільтр за дією"
            />
          </div>

          <input
            type="date"
            className="form-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            aria-label="Дата від"
            style={{ maxWidth: '150px' }}
          />
          <input
            type="date"
            className="form-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            aria-label="Дата до"
            style={{ maxWidth: '150px' }}
          />
        </div>

        <div className="employees-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Час</th>
                <th>Дія</th>
                <th>Сутність</th>
                <th>Назва сутності</th>
                <th>Актор</th>
                <th>Деталі</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType}</td>
                  <td>{log.entityName || '—'}</td>
                  <td>{log.actorUsername || '—'}</td>
                  <td>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageStateBoundary>
  );
}
