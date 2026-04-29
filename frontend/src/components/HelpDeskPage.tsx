import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import PlatformCard from './platform/PlatformCard.tsx';
import PlatformListPage from './platform/PlatformListPage.tsx';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function HelpDeskPage({ currentUser }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [busy, setBusy] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  async function createTicket(event, reload) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      await fetchJSON(ENDPOINTS.tickets, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      event.currentTarget.reset();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id, status, reload) {
    await fetchJSON(ENDPOINTS.ticketStatusById(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  async function removeTicket(id, reload) {
    if (!confirm('Видалити тікет?')) return;
    await fetchJSON(ENDPOINTS.ticketById(id), { method: 'DELETE' });
    await reload();
  }

  return (
    <PlatformListPage
      title="Help Desk"
      description="Внутрішні заявки IT, HR, facilities та payroll."
      endpoint={ENDPOINTS.tickets}
      icon="support_agent"
      actions={({ reload }) => (
        <form className="platform-inline-form" onSubmit={event => createTicket(event, reload)}>
          <input name="title" placeholder="Тема" required />
          <input name="description" placeholder="Опис" required />
          <select name="category" className="form-input">
            {['general', 'it', 'hr', 'facilities', 'payroll'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="priority" className="form-input">
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input name="requester_name" placeholder="Заявник" />
          <button className="btn btn-primary" disabled={busy} type="submit">Створити</button>
        </form>
      )}
      renderItem={(item, { reload }) => {
        const statusMatch = filterStatus === 'all' || item.status === filterStatus;
        const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
        if (!statusMatch || !priorityMatch) return null;
        return (
          <PlatformCard key={item.id} icon="confirmation_number" title={item.title} meta={item.category}>
            <p>{item.description}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <span className={`ticket-priority--${item.priority}`} style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>{item.priority}</span>
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>{item.status}</span>
              {item.requester_name ? <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>{item.requester_name}</span> : null}
            </div>
            <div className="platform-actions" style={{ marginTop: 10 }}>
              {STATUSES.map(s => (
                <button key={s} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => updateStatus(item.id, s, reload)} type="button">{s}</button>
              ))}
              {isAdmin ? (
                <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => removeTicket(item.id, reload)} type="button">Видалити</button>
              ) : null}
            </div>
          </PlatformCard>
        );
      }}
    >
      <div className="ticket-filters">
        <button className={filterStatus === 'all' ? 'active' : ''} onClick={() => setFilterStatus('all')}>Всі статуси</button>
        {STATUSES.map(s => <button key={s} className={filterStatus === s ? 'active' : ''} onClick={() => setFilterStatus(s)}>{s}</button>)}
      </div>
      <div className="ticket-filters">
        <button className={filterPriority === 'all' ? 'active' : ''} onClick={() => setFilterPriority('all')}>Всі пріоритети</button>
        {PRIORITIES.map(p => <button key={p} className={filterPriority === p ? 'active' : ''} onClick={() => setFilterPriority(p)}>{p}</button>)}
      </div>
    </PlatformListPage>
  );
}
