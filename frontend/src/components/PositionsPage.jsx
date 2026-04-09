import { useAppActions } from '../appContext.jsx';
import OrganizationPage from './OrganizationPage.jsx';
import { formatMoney } from '../uiUtils.js';

export default function PositionsPage({ currentUser, isActive, refreshKey = 0 }) {
    const { confirmDelete, editPosition, openPositionCreate } = useAppActions();

    return (
        <OrganizationPage
            endpoint="/api/positions"
            title="Посади підприємства"
            description="Каталог посад та діапазони заробітної плати."
            addButtonLabel="Додати посаду"
            addButtonIcon="add"
            cardIcon="work"
            emptyState={{
                icon: 'work_off',
                title: 'Посад поки немає',
                description: 'Додайте посаду, щоб працівників можна було пов’язати з ролями.'
            }}
            loadingState={{
                icon: 'hourglass_top',
                title: 'Завантаження посад',
                description: 'Отримуємо актуальний каталог посад із бази даних.'
            }}
            errorTitle="Не вдалося завантажити посади"
            currentUser={currentUser}
            isActive={isActive}
            refreshKey={refreshKey}
            onAdd={openPositionCreate}
            onEdit={editPosition}
            onDelete={(id, label) => confirmDelete('position', id, label)}
            getItemTitle={record => record.title}
            getItemDescription={record => record.description || 'Без опису'}
            getDeleteLabel={record => record.title}
            renderMeta={record => (
                <>
                    <span>
                        <span className="material-symbols-outlined">payments</span>
                        {' '}
                        {formatMoney(record.min_salary)}
                        {' '}
                        –
                        {' '}
                        {formatMoney(record.max_salary)}
                        {' '}
                        ₴
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
