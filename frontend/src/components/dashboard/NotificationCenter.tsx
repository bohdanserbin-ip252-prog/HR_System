import { useEffect, useState } from 'react';
import { fetchJSON } from '../../api.ts';
import { ENDPOINTS } from '../../app/endpoints.ts';

const ACTION_LABELS = {
  'complaint.created': 'Створено скаргу',
  'complaint.updated': 'Оновлено скаргу',
  'complaint.deleted': 'Видалено скаргу',
  'employee.created': 'Створено працівника',
  'employee.updated': 'Оновлено профіль',
  'employee.deleted': 'Видалено працівника',
  'employee.salary_changed': 'Змінено зарплату'
};

export default function NotificationCenter({ currentUser }) {
  const [events, setEvents] = useState([]);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    fetchJSON(ENDPOINTS.auditByLimit(8), { signal: controller.signal, suppressAuthRedirect: true })
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(error => {
        if (error.name !== 'AbortError') setEvents([]);
      });
    return () => controller.abort();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="card card-padded notification-center">
      <div className="notification-center__head">
        <h3><span className="material-symbols-outlined">notifications</span> Центр сповіщень</h3>
      </div>
      <div className="notification-center__list">
        {events.length > 0 ? events.map(event => (
          <div className="notification-center__item" key={event.id}>
            <strong>{ACTION_LABELS[event.action] || event.action}</strong>
            <span>{event.entityName || event.details || 'Системна подія'}</span>
            <small>{event.actorUsername || 'system'} · {event.createdAt}</small>
          </div>
        )) : <p className="muted-text">Нових службових подій немає.</p>}
      </div>
    </div>
  );
}
