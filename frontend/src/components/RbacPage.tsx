import { ENDPOINTS } from '../app/endpoints.ts';
import EmptyState from './EmptyState.tsx';
import PageStateBoundary from './PageStateBoundary.tsx';
import { usePlatformData } from './platform/usePlatformData.ts';

export default function RbacPage({ isActive = true }) {
  const { status: rStatus, items: roles } = usePlatformData(ENDPOINTS.rbacRoles, { enabled: isActive });
  const { status: pStatus, items: permissions } = usePlatformData(ENDPOINTS.rbacPermissions, { enabled: isActive });
  const { status: mStatus, data: matrixData } = usePlatformData(ENDPOINTS.rbacMatrix, { enabled: isActive });

  const isLoading = rStatus === 'loading' || pStatus === 'loading' || mStatus === 'loading';
  const error = rStatus === 'error' ? 'Не вдалося завантажити ролі' : pStatus === 'error' ? 'Не вдалося завантажити права' : mStatus === 'error' ? 'Не вдалося завантажити матрицю' : null;

  const matrix = new Map();
  if (matrixData?.entries) {
    matrixData.entries.forEach(e => {
      matrix.set(`${e.role_key}:${e.permission_key}`, true);
    });
  }

  return (
    <>
      <div className="page-header">
        <h1>Roles & Permissions</h1>
        <p>RBAC матриця доступу: які ролі мають які права.</p>
      </div>
      <PageStateBoundary
        loading={isLoading ? { icon: 'hourglass_top', title: 'Завантаження', description: 'Завантаження RBAC матриці' } : null}
        error={error ? { icon: 'error', title: 'Помилка', description: error } : null}
        empty={!isLoading && (!roles.length || !permissions.length) ? { icon: 'admin_panel_settings', title: 'Даних немає', description: 'RBAC ще не налаштовано.' } : null}
      >
        <div className="rbac-matrix">
          <table>
            <thead>
              <tr>
                <th>Дозвіл</th>
                {roles.map(r => <th key={r.key}>{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => (
                <tr key={perm.key}>
                  <td>{perm.label}</td>
                  {roles.map(r => (
                    <td key={r.key} style={{ textAlign: 'center' }}>
                      {matrix.has(`${r.key}:${perm.key}`) ? (
                        <span className="material-symbols-outlined rbac-check">check_circle</span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: 18 }} className="material-symbols-outlined">cancel</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageStateBoundary>
    </>
  );
}
