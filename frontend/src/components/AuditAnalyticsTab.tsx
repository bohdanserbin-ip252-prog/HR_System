import { useMemo, useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import { formatDate } from '../uiUtils.ts';
import PageStateBoundary from './PageStateBoundary.tsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

export default function AuditAnalyticsTab({ isActive }) {
  const { handleUnauthorized } = useAppActions();
  const [events, setEvents] = useState([]);
  const [entityType, setEntityType] = useState('');
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setEvents([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.auditByLimit(200), { signal });
        if (!signal.aborted) setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження аудиту');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  const filteredEvents = useMemo(() => {
    return entityType ? events.filter(e => e.entityType === entityType) : events;
  }, [events, entityType]);

  const entityTypes = useMemo(() => {
    const types = new Set(events.map(e => e.entityType).filter(Boolean));
    return Array.from(types).sort();
  }, [events]);

  const actionStats = useMemo(() => {
    const counts = {};
    filteredEvents.forEach(e => { counts[e.action] = (counts[e.action] || 0) + 1; });
    return Object.entries(counts).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredEvents]);

  const entityStats = useMemo(() => {
    const counts = {};
    filteredEvents.forEach(e => { counts[e.entityType] = (counts[e.entityType] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredEvents]);

  const timelineStats = useMemo(() => {
    const counts = {};
    filteredEvents.forEach(e => {
      const date = e.createdAt?.slice(0, 10);
      if (date) counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [filteredEvents]);

  const loadingState = isLoading && !events.length ? { icon: 'hourglass_top', title: 'Завантаження...', description: 'Отримуємо дані аудиту...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !filteredEvents.length ? { icon: 'policy', title: 'Записів немає', description: 'Аудит-події відсутні.' } : null;

  return (
    <>
      <div className="page-header">
        <h1>Audit Analytics</h1>
        <p>Аналітика змін, дій та доступу до HR-даних з єдиного audit dataset.</p>
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      <div className="toolbar">
        <select className="form-input" style={{ maxWidth: '200px' }} value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="">Всі сутності</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="platform-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card platform-card">
          <h3>Активність за діями</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer><BarChart data={actionStats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="action" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#0088FE" /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="card platform-card">
          <h3>Розподіл по сутностям</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer><PieChart><Pie data={entityStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{entityStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </div>
        </div>
        {timelineStats.length > 1 && (
          <div className="card platform-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Таймлайн подій (останні 30 днів)</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer><BarChart data={timelineStats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#00C49F" /></BarChart></ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="employees-table-shell">
          <table className="data-table">
            <thead><tr><th>Час</th><th>Дія</th><th>Сутність</th><th>Назва</th><th>Актор</th><th>Деталі</th></tr></thead>
            <tbody>
              {filteredEvents.slice(0, 50).map(e => (
                <tr key={e.id}><td>{formatDate(e.createdAt)}</td><td>{e.action}</td><td>{e.entityType}</td><td>{e.entityName || '—'}</td><td>{e.actorUsername || '—'}</td><td>{e.details || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageStateBoundary>
    </>
  );
}
