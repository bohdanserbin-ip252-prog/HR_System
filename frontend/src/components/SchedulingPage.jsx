import { useMemo, useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import PageStateBoundary from './PageStateBoundary.jsx';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function SchedulingPage({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [shifts, setShifts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setShifts([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.shifts, { signal });
        if (!signal.aborted) setShifts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження змін');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  async function createShift(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await fetchJSON(ENDPOINTS.shifts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, employee_id: Number(form.employee_id) })
      });
      event.currentTarget.reset();
      setShowForm(false);
      const data = await fetchJSON(ENDPOINTS.shifts);
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      failWithError(error, 'Помилка створення зміни');
    }
  }

  const calendar = useMemo(() => {
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const blanks = firstDay === 0 ? 6 : firstDay - 1;
    const grid = [];
    for (let i = 0; i < blanks; i++) grid.push(null);
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayShifts = shifts.filter(s => s.date === dateStr);
      grid.push({ day: d, date: dateStr, shifts: dayShifts });
    }
    return grid;
  }, [year, month, shifts]);

  const shiftStats = useMemo(() => {
    const total = shifts.length;
    const conflicts = shifts.filter(s => s.status === 'conflict').length;
    return { total, conflicts };
  }, [shifts]);

  const loadingState = isLoading && !shifts.length ? { icon: 'hourglass_top', title: 'Завантаження...', description: 'Отримуємо графік змін...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !shifts.length ? { icon: 'calendar_month', title: 'Змін немає', description: 'Додайте першу зміну.' } : null;

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>Shift Scheduling</h1>
          <p>Графік роботи з перевіркою конфліктів з відпустками.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} type="button">
            {showForm ? 'Скасувати' : 'Додати зміну'}
          </button>
        )}
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      <div className="card card-padded" style={{ marginBottom: '1.5rem', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: '24px', fontWeight: 700 }}>{shiftStats.total}</div><div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Всього змін</div></div>
        <div><div style={{ fontSize: '24px', fontWeight: 700, color: shiftStats.conflicts > 0 ? 'var(--error)' : 'inherit' }}>{shiftStats.conflicts}</div><div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Конфліктів</div></div>
      </div>

      {showForm && (
        <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
          <h3>Нова зміна</h3>
          <form className="platform-inline-form" onSubmit={createShift}>
            <input name="employee_id" placeholder="ID працівника" required type="number" className="form-input" />
            <input name="date" required type="date" className="form-input" />
            <input name="start_time" defaultValue="09:00" required className="form-input" />
            <input name="end_time" defaultValue="17:00" required className="form-input" />
            <input name="role" placeholder="Роль" className="form-input" />
            <button className="btn btn-primary" type="submit">Додати</button>
          </form>
        </div>
      )}

      <div className="card card-padded">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="btn btn-outline" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} type="button">←</button>
          <h3 style={{ margin: 0 }}>{new Date(year, month).toLocaleString('uk-UA', { month: 'long', year: 'numeric' })}</h3>
          <button className="btn btn-outline" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} type="button">→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
          {['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {calendar.map((cell, i) => (
            <div key={i} style={{
              minHeight: '80px',
              padding: '6px',
              borderRadius: '8px',
              background: cell ? 'var(--surface-container-low)' : 'transparent',
              border: cell ? '1px solid rgba(31,41,55,0.06)' : 'none',
              fontSize: '12px'
            }}>
              {cell && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{cell.day}</div>
                  {cell.shifts.map(s => (
                    <div key={s.id} style={{
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      marginBottom: '2px',
                      background: s.status === 'conflict' ? 'rgba(251,81,81,0.12)' : 'rgba(16,185,129,0.12)',
                      color: s.status === 'conflict' ? 'var(--error)' : 'var(--emerald-700)'
                    }}>
                      {s.start_time}-{s.end_time}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageStateBoundary>
    </>
  );
}
