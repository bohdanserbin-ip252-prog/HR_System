import { useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import PlatformCard from './platform/PlatformCard.jsx';
import PlatformListPage from './platform/PlatformListPage.jsx';

export default function TimeOffPage({ currentUser }) {
  const [busy, setBusy] = useState(false);

  async function createRequest(event, reload) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      await fetchJSON(ENDPOINTS.timeOffRequests, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, employee_id: Number(form.employee_id || 0) || undefined })
      });
      event.currentTarget.reset();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function decide(id, decision, reload) {
    await fetchJSON(ENDPOINTS.decideTimeOffRequest(id, decision), { method: 'POST' });
    await reload();
  }

  return (
    <PlatformListPage
      title="Відсутності та відпустки"
      description="Заявки на відпустку, лікарняні та approval-flow."
      endpoint={ENDPOINTS.timeOffRequests}
      icon="event_busy"
      actions={({ reload }) => (
        <form className="platform-inline-form" onSubmit={event => createRequest(event, reload)}>
          <input name="employee_id" placeholder="ID працівника" type="number" />
          <input name="start_date" required type="date" />
          <input name="end_date" required type="date" />
          <input name="request_type" defaultValue="vacation" />
          <input name="reason" placeholder="Причина" />
          <button className="btn btn-primary" disabled={busy} type="submit">Подати</button>
        </form>
      )}
      renderItem={(item, { reload }) => (
        <PlatformCard key={item.id} icon="event_available" title={`${item.startDate} — ${item.endDate}`} meta={item.status}>
          <p>{item.requestType} · {item.reason || 'Без причини'}</p>
          {currentUser?.role === 'admin' && item.status === 'pending' ? (
            <div className="platform-actions">
              <button className="btn btn-outline" onClick={() => decide(item.id, 'approve', reload)}>Схвалити</button>
              <button className="btn btn-outline" onClick={() => decide(item.id, 'reject', reload)}>Відхилити</button>
            </div>
          ) : null}
        </PlatformCard>
      )}
    />
  );
}
