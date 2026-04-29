import { useEffect, useMemo, useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import {
  listReminderInboxNotifications,
  markAllReminderInboxNotificationsRead,
  markReminderInboxNotificationRead,
  subscribeToReminderInboxNotifications,
} from '../desktopNotifications.ts';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import { formatDate } from '../uiUtils.ts';
import PageStateBoundary from './PageStateBoundary.tsx';

export default function ActivityInboxTab({ isActive }) {
  const { handleUnauthorized } = useAppActions();
  const [notifications, setNotifications] = useState([]);
  const [reminderNotifications, setReminderNotifications] = useState(() =>
    listReminderInboxNotifications()
  );
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useEffect(() => {
    return subscribeToReminderInboxNotifications(setReminderNotifications);
  }, []);

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setNotifications([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.notifications, { signal });
        if (!signal.aborted) setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження сповіщень');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  const combinedNotifications = useMemo(
    () =>
      [...reminderNotifications, ...notifications].sort((left, right) =>
        String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
      ),
    [notifications, reminderNotifications]
  );

  async function markRead(notification) {
    if (notification?.source === 'reminder') {
      markReminderInboxNotificationRead(notification.id);
      return;
    }

    try {
      await fetchJSON(ENDPOINTS.notificationReadById(notification.id), { method: 'POST' });
      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    } catch (error) {
      failWithError(error, 'Помилка');
    }
  }

  async function markAllRead() {
    markAllReminderInboxNotificationsRead();

    try {
      if (notifications.some(item => !item.readAt)) {
        await fetchJSON(ENDPOINTS.notificationsReadAll, { method: 'POST' });
      }
      setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    } catch (error) {
      failWithError(error, 'Помилка');
    }
  }

  const unreadCount = combinedNotifications.filter(n => !n.readAt).length;

  const loadingState = isLoading && combinedNotifications.length === 0 ? { icon: 'hourglass_top', title: 'Завантаження...', description: 'Отримуємо сповіщення...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !combinedNotifications.length ? { icon: 'notifications_off', title: 'Сповіщень немає', description: 'У вас немає нових сповіщень.' } : null;

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>Сповіщення</h1>
          <p>Inbox для персональних та системних сповіщень.</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllRead} type="button">
            Позначити всі прочитаними ({unreadCount})
          </button>
        )}
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      <div className="platform-grid">
        {combinedNotifications.map(n => (
          <div className={`card platform-card${n.readAt ? ' opacity-60' : ''}`} key={n.id} style={{ borderLeft: n.readAt ? undefined : '4px solid var(--primary)' }}>
            <div className="platform-card__head">
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: n.readAt ? 'var(--on-surface-variant)' : 'var(--primary)' }}>
                {n.readAt ? 'drafts' : 'mark_email_unread'}
              </span>
              <div>
                <h3>{n.title}</h3>
                <p>{formatDate(n.createdAt)}</p>
              </div>
            </div>
            <div className="platform-card__body">
              <p>{n.body || 'Без опису'}</p>
              {!n.readAt && (
                <button className="btn btn-outline" onClick={() => markRead(n)} type="button">
                  Позначити прочитаним
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageStateBoundary>
    </>
  );
}
