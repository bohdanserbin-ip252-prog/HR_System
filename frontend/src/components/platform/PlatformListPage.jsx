import EmptyState from '../EmptyState.jsx';
import PageStateBoundary from '../PageStateBoundary.jsx';
import { usePlatformData } from './usePlatformData.js';

export default function PlatformListPage({ title, description, endpoint, icon, renderItem, actions = null, children = null }) {
  const { status, items, error, reload } = usePlatformData(endpoint);
  const isLoading = status === 'idle' || status === 'loading';

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? actions({ reload }) : null}
      </div>
      <PageStateBoundary
        loading={isLoading ? { icon: 'hourglass_top', title: 'Завантаження', description } : null}
        error={status === 'error' ? { icon: 'error', title: 'Не вдалося завантажити дані', description: error } : null}
        empty={!isLoading && items.length === 0 ? { icon, title: 'Даних ще немає', description } : null}
      >
        {children}
        {items.length > 0 ? (
          <div className="platform-grid">
            {items.map(item => renderItem(item, { reload }))}
          </div>
        ) : <EmptyState icon={icon} title="Нічого не знайдено" description={description} />}
      </PageStateBoundary>
    </>
  );
}
