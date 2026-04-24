import { useMemo, useState } from 'react';
import { useAppActions } from '../appContext.jsx';
import { getErrorMessage } from '../uiUtils.js';
import EmptyState from './EmptyState.jsx';
import ExportCsvButton from './ExportCsvButton.jsx';
import PageStateBoundary from './PageStateBoundary.jsx';

const SEVERITY_LABELS = {
    low: 'Низька',
    medium: 'Середня',
    high: 'Висока',
    critical: 'Критична',
};

const STATUS_LABELS = {
    open: 'Відкрита',
    in_review: 'В роботі',
    resolved: 'Вирішена',
    rejected: 'Відхилена',
};

const COMPLAINT_EXPORT_COLUMNS = [
    { label: 'Назва', value: item => item.title },
    { label: 'Працівник', value: employeeName },
    { label: 'Статус', value: item => STATUS_LABELS[item.status] || item.status },
    { label: 'Серйозність', value: item => SEVERITY_LABELS[item.severity] || item.severity },
    { label: 'Дата', value: item => item.complaintDate },
    { label: 'Заявник', value: item => item.reporterName || '' }
];

function employeeName(complaint) {
    const employee = complaint?.employee;
    if (!employee) return 'Працівника видалено';
    return `${employee.lastName || employee.last_name || ''} ${employee.firstName || employee.first_name || ''}`.trim();
}

function normalizeText(value) {
    return String(value || '').trim().toLocaleLowerCase('uk-UA');
}

function matchesSearch(complaint, search) {
    if (!search) return true;
    const haystack = [
        complaint.title,
        complaint.description,
        complaint.reporterName,
        employeeName(complaint),
    ].map(normalizeText).join(' ');
    return haystack.includes(search);
}

function filterComplaints(complaints, filters) {
    const search = normalizeText(filters.search);
    return complaints.filter(complaint => {
        if (filters.status && complaint.status !== filters.status) return false;
        if (filters.severity && complaint.severity !== filters.severity) return false;
        return matchesSearch(complaint, search);
    });
}

function countBy(items, key) {
    return items.reduce((counts, item) => {
        const value = item?.[key] || 'unknown';
        counts[value] = (counts[value] || 0) + 1;
        return counts;
    }, {});
}

function ComplaintCard({ complaint, isAdmin, onEdit, onDelete }) {
    const employee = complaint.employee;
    const department = employee?.departmentName || employee?.department_name || 'Без відділу';
    const position = employee?.positionTitle || employee?.position_title || 'Без посади';

    return (
        <article className="complaint-card">
            <div className="complaint-card__header">
                <div>
                    <span className={`complaint-pill complaint-pill--${complaint.status}`}>
                        {STATUS_LABELS[complaint.status] || complaint.status}
                    </span>
                    <h3>{complaint.title}</h3>
                </div>
                <span className={`complaint-severity complaint-severity--${complaint.severity}`}>
                    {SEVERITY_LABELS[complaint.severity] || complaint.severity}
                </span>
            </div>
            <p className="complaint-card__description">{complaint.description}</p>
            <dl className="complaint-card__meta">
                <div>
                    <dt>Працівник</dt>
                    <dd>{employeeName(complaint)}</dd>
                </div>
                <div>
                    <dt>Підрозділ</dt>
                    <dd>{department} · {position}</dd>
                </div>
                <div>
                    <dt>Дата</dt>
                    <dd>{complaint.complaintDate || '—'}</dd>
                </div>
                <div>
                    <dt>Заявник</dt>
                    <dd>{complaint.reporterName || 'Не вказано'}</dd>
                </div>
            </dl>
            {complaint.resolutionNotes ? (
                <p className="complaint-card__resolution">{complaint.resolutionNotes}</p>
            ) : null}
            {isAdmin ? (
                <div className="complaint-card__actions">
                    <button aria-label="Редагувати скаргу" className="icon-btn" onClick={onEdit} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                    <button aria-label="Видалити скаргу" className="icon-btn danger" onClick={onDelete} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            ) : null}
        </article>
    );
}

export default function ComplaintsPage({ currentUser, isActive, snapshot }) {
    const { confirmDelete, editComplaint, openComplaintCreate } = useAppActions();
    const [filters, setFilters] = useState({ search: '', status: '', severity: '' });
    const isAdmin = currentUser?.role === 'admin';
    const complaints = Array.isArray(snapshot?.data?.complaints) ? snapshot.data.complaints : [];
    const filteredComplaints = useMemo(
        () => filterComplaints(complaints, filters),
        [complaints, filters],
    );
    const statusCounts = useMemo(() => countBy(complaints, 'status'), [complaints]);
    const hasData = complaints.length > 0;

    function updateFilter(key, value) {
        setFilters(current => ({ ...current, [key]: value }));
    }

    return (
        <>
            <section className="complaints-hero">
                <div>
                    <h1>Скарги на працівників</h1>
                    <p>Фіксуйте звернення, відстежуйте розгляд і зберігайте історію HR-рішень.</p>
                </div>
                <div className="header-actions">
                    <ExportCsvButton columns={COMPLAINT_EXPORT_COLUMNS} filename="complaints.csv" rows={filteredComplaints} />
                    <button className="btn btn-primary" onClick={openComplaintCreate} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
                        Нова скарга
                    </button>
                </div>
            </section>

            <PageStateBoundary
                loading={isActive && (snapshot?.status === 'idle' || (snapshot?.status === 'loading' && !hasData)) ? {
                    icon: 'hourglass_top',
                    title: 'Завантаження скарг',
                    description: 'Отримуємо актуальні звернення з бази даних.'
                } : null}
                error={snapshot?.status === 'error' ? {
                    icon: 'error',
                    title: 'Не вдалося завантажити скарги',
                    description: getErrorMessage({ message: snapshot.errorMessage }, 'Спробуйте оновити сторінку ще раз.')
                } : null}
                empty={!hasData ? {
                    icon: 'report_problem',
                    title: 'Скарг ще немає',
                    description: 'Нові звернення з’являться тут після створення.'
                } : null}
            >
                <section className="complaints-toolbar">
                    <input
                        aria-label="Пошук скарг"
                        className="form-input"
                        type="search"
                        value={filters.search}
                        onChange={event => updateFilter('search', event.target.value)}
                        placeholder="Пошук за темою, описом або працівником"
                    />
                    <select
                        aria-label="Статус скарги"
                        className="form-input"
                        value={filters.status}
                        onChange={event => updateFilter('status', event.target.value)}
                    >
                        <option value="">Усі статуси</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Серйозність скарги"
                        className="form-input"
                        value={filters.severity}
                        onChange={event => updateFilter('severity', event.target.value)}
                    >
                        <option value="">Усі рівні</option>
                        {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </section>

                <section className="complaints-summary" aria-label="Підсумок скарг">
                    <span>Всього: {complaints.length}</span>
                    <span>Відкриті: {statusCounts.open || 0}</span>
                    <span>В роботі: {statusCounts.in_review || 0}</span>
                    <span>Вирішені: {statusCounts.resolved || 0}</span>
                </section>

                {filteredComplaints.length > 0 ? (
                    <div className="complaints-list">
                        {filteredComplaints.map(complaint => (
                            <ComplaintCard
                                key={complaint.id}
                                complaint={complaint}
                                isAdmin={isAdmin}
                                onEdit={() => editComplaint(complaint.id)}
                                onDelete={() => confirmDelete('complaint', complaint.id, complaint.title)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="filter_alt_off"
                        title="Нічого не знайдено"
                        description="Змініть пошук або фільтри, щоб побачити інші скарги."
                    />
                )}
            </PageStateBoundary>
        </>
    );
}
