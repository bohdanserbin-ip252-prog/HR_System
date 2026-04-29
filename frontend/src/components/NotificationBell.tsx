import { useEffect, useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import {
  getReminderInboxUnreadCount,
  subscribeToReminderInboxNotifications,
} from '../desktopNotifications.ts';

export default function NotificationBell({ onNavigate }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const syncUnread = async () => {
      try {
        const data = await fetchJSON(ENDPOINTS.notificationsUnreadCount, { suppressAuthRedirect: true });
        if (!cancelled) {
          setUnreadCount(Number(data?.unread_count || 0) + getReminderInboxUnreadCount());
        }
      } catch {
        if (!cancelled) setUnreadCount(getReminderInboxUnreadCount());
      }
    };

    void syncUnread();
    const interval = setInterval(syncUnread, 30000);
    const unsubscribe = subscribeToReminderInboxNotifications(() => {
      void syncUnread();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <button
      aria-label="Сповіщення"
      className="theme-toggle-btn"
      onClick={() => onNavigate('activity')}
      title="Сповіщення"
      type="button"
      style={{ position: 'relative' }}
    >
      <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
      {unreadCount > 0 && (
        <span className="nav-badge" style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '11px', minWidth: '18px', height: '18px' }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
