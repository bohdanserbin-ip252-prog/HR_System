import { ENDPOINTS } from '../app/endpoints.js';
import EmptyState from './EmptyState.jsx';
import PageStateBoundary from './PageStateBoundary.jsx';
import { usePlatformData } from './platform/usePlatformData.js';

export default function OrgChartPage({ isActive = true }) {
  const { status, items, error } = usePlatformData(ENDPOINTS.organizationChart, { enabled: isActive });
  const isLoading = status === 'idle' || status === 'loading';

  return (
    <>
      <div className="page-header">
        <h1>Оргструктура</h1>
        <p>Відділи, керівники та склад команд.</p>
      </div>
      <PageStateBoundary
        loading={isLoading ? { icon: 'hourglass_top', title: 'Завантаження', description: 'Завантаження організаційної структури' } : null}
        error={status === 'error' ? { icon: 'error', title: 'Помилка', description: error } : null}
        empty={!isLoading && items.length === 0 ? { icon: 'account_tree', title: 'Відділів немає', description: 'Додайте відділи, щоб побачити структуру.' } : null}
      >
        <div className="org-tree">
          {items.map((dept, idx) => (
            <div key={dept.id}>
              {idx > 0 ? <div className="org-connector" /> : null}
              <div className="org-node">
                <div className="org-node__icon">
                  <span className="material-symbols-outlined">groups</span>
                </div>
                <div className="org-node__content">
                  <h3>{dept.name}</h3>
                  <p>
                    {dept.head ? `Керівник: ${dept.head.firstName} ${dept.head.lastName}` : (dept.headName || 'Керівника не призначено')}
                    {' · '}{dept.employees?.length || 0} працівник(ів)
                  </p>
                  {dept.employees?.length > 0 ? (
                    <div className="org-members">
                      {dept.employees.map(e => (
                        <span className={`org-member-chip ${e.status !== 'active' ? 'org-member-chip--inactive' : ''}`} key={e.id}>
                          {e.firstName} {e.lastName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageStateBoundary>
    </>
  );
}
