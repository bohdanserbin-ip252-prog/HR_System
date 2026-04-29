import { useAppActions } from '../appContext.tsx';
import { ENDPOINTS } from '../app/endpoints.ts';
import OrganizationEntityTabShell from './OrganizationEntityTabShell.tsx';

export default function DepartmentsPage({ currentUser, isActive, refreshKey = 0 }) {
    const { confirmDelete, editDepartment, openDepartmentCreate } = useAppActions();

    return (
        <OrganizationEntityTabShell
            endpoint={ENDPOINTS.departments}
            title="Відділи підприємства"
            description="Організаційна структура та розподіл персоналу."
            addButtonLabel="Додати відділ"
            addButtonIcon="add"
            cardIcon="apartment"
            emptyState={{
                icon: 'domain_disabled',
                title: 'Відділів поки немає',
                description: 'Створіть перший відділ, щоб побудувати структуру підприємства.'
            }}
            loadingState={{
                icon: 'hourglass_top',
                title: 'Завантаження відділів',
                description: 'Отримуємо актуальну організаційну структуру.'
            }}
            errorTitle="Не вдалося завантажити відділи"
            currentUser={currentUser}
            isActive={isActive}
            refreshKey={refreshKey}
            onAdd={openDepartmentCreate}
            onEdit={editDepartment}
            onDelete={(id, label) => confirmDelete('department', id, label)}
            getItemTitle={record => record.name}
            getItemDescription={record => record.description || 'Без опису'}
            getDeleteLabel={record => record.name}
            renderMeta={record => (
                <>
                    <span>
                        <span className="material-symbols-outlined">person</span>
                        {' '}
                        Керівник:
                        {' '}
                        {record.head_name || '—'}
                    </span>
                    <span className="count-badge">
                        <span className="material-symbols-outlined">group</span>
                        {' '}
                        {record.employee_count}
                    </span>
                </>
            )}
        />
    );
}
