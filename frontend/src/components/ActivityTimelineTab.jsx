import { useMemo, useState } from 'react';
import { formatDate } from '../uiUtils.js';
import PageStateBoundary from './PageStateBoundary.jsx';

const CATEGORY_ICONS = {
  audit: 'history',
  complaint: 'report_problem',
  time_off_request: 'event_busy'
};

const CATEGORY_LABELS = {
  audit: 'Аудит',
  complaint: 'Скарга',
  time_off_request: 'Відсутність'
};

export default function ActivityTimelineTab({ isActive, snapshot }) {
  const [filter, setFilter] = useState('');

  const viewModel = useMemo(() => {
    const items = Array.isArray(snapshot?.data?.items) ? snapshot.data.items : [];
    const filtered = filter
      ? items.filter(item =>
          item.action?.toLowerCase().includes(filter.toLowerCase()) ||
          item.entity_type?.toLowerCase().includes(filter.toLowerCase()) ||
          item.actor?.toLowerCase().includes(filter.toLowerCase())
        )
      : items;
    return { items, filtered, hasData: items.length > 0 };
  }, [snapshot, filter]);

  const isLoading = isActive && (snapshot?.status === 'idle' || snapshot?.status === 'loading') && !viewModel.hasData;

  const loadingState = isLoading ? {
    icon: 'hourglass_top',
    title: 'Завантаження стрічки активності',
    description: 'Отримуємо актуальні події з усіх модулів системи...'
  } : null;

  const errorState = snapshot?.status === 'error' ? {
    icon: 'error',
    title: 'Не вдалося завантажити стрічку',
    description: snapshot?.errorMessage || 'Спробуйте оновити сторінку ще раз.'
  } : null;

  const emptyState = !loadingState && !errorState && !viewModel.filtered.length ? {
    icon: 'rss_feed',
    title: 'Події відсутні',
    description: 'У системі ще не відбулося жодних подій або фільтр занадто строгий.'
  } : null;

  return (
    <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>
      <div className="page-header">
        <h1>Стрічка активності</h1>
        <p>Уніфікований таймлайн подій з усіх модулів системи.</p>
      </div>

      <div className="toolbar">
        <div className="search-bar" style={{ maxWidth: '300px' }}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Фільтр подій..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Фільтр подій"
          />
        </div>
      </div>

      <div className="card">
        <div className="activity-timeline">
          {viewModel.filtered.map((item, index) => (
            <div className="activity-item" key={`${item.id}-${index}`}>
              <div className="activity-icon">
                <span className="material-symbols-outlined">{CATEGORY_ICONS[item.category] || 'info'}</span>
              </div>
              <div className="activity-body">
                <div className="activity-meta">
                  <span className="activity-category">{CATEGORY_LABELS[item.category] || item.category}</span>
                  <span className="activity-time">{formatDate(item.timestamp)}</span>
                </div>
                <div className="activity-title">
                  <strong>{item.action}</strong>
                  {item.entity_name && <span> — {item.entity_name}</span>}
                </div>
                {item.details && <div className="activity-details">{item.details}</div>}
                <div className="activity-actor">{item.actor}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageStateBoundary>
  );
}
