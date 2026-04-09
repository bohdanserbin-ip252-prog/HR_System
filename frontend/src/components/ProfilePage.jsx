import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import {
    formatDate,
    formatMoney,
    getAvatarColor,
    parseDateValue,
    statusLabel
} from '../uiUtils.js';
import PageStateBoundary from './PageStateBoundary.jsx';

const SECONDARY_SKILLS = ['Корпоративна етика', 'Командна робота', 'Комунікація', 'Аналітичне мислення'];

function getLongDateLabel(dateValue) {
    const parsed = parseDateValue(dateValue);
    if (!parsed) return '—';
    return parsed.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getTenureData(hireDateValue) {
    const hireDate = parseDateValue(hireDateValue);
    if (!hireDate) {
        return {
            hireDateLabel: '—',
            tenureLabel: '—'
        };
    }

    const now = new Date();
    const diffMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;

    return {
        hireDateLabel: getLongDateLabel(hireDateValue),
        tenureLabel: years > 0 ? `${years} р. ${months} міс.` : `${months} міс.`
    };
}

export default function ProfilePage({ currentUser, isActive, employeeId, refreshKey = 0 }) {
    const { editEmployee, goBackToEmployees, handleUnauthorized } = useAppActions();
    const [employee, setEmployee] = useState(null);
    const {
        errorMessage,
        failWithError,
        finishLoading,
        isLoading,
        resetAsyncStatus,
        startLoading
    } = useAsyncStatus();

    const isAdmin = currentUser?.role === 'admin';

    useAbortableLoadEffect({
        enabled: Boolean(currentUser && isActive && employeeId),
        deps: [currentUser, employeeId, handleUnauthorized, isActive, refreshKey],
        onDisabled: () => {
            if (!currentUser || (isActive && !employeeId)) {
                setEmployee(null);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const data = await fetchJSON(`${API}/api/employees/${employeeId}`, {
                    signal
                });

                if (!signal.aborted) {
                    setEmployee(data);
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                setEmployee(null);
                failWithError(error, 'Помилка завантаження профілю');
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    const loadingState = isLoading && !employee ? {
        icon: 'hourglass_top',
        title: 'Завантаження профілю',
        description: 'Отримуємо актуальні дані працівника з бази даних.'
    } : null;

    const errorState = errorMessage ? {
        icon: 'error',
        title: 'Не вдалося завантажити профіль',
        description: errorMessage
    } : null;

    const emptyState = !loadingState && !errorState && !employee ? {
        icon: 'person_search',
        title: 'Працівника не вибрано',
        description: 'Поверніться до реєстру й відкрийте профіль потрібного працівника.'
    } : null;

    const content = (() => {
        if (!employee) return null;

        const displayName = `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
        const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`;
        const tenure = getTenureData(employee.hire_date);
        const primarySkills = employee.position_title
            ? [employee.position_title, employee.department_name || '', statusLabel(employee.status)].filter(Boolean)
            : ['Не призначено'];
        const salaryPct = employee.salary > 0 ? Math.min(Math.round(employee.salary / 100000 * 100), 100) : 0;
        const locationText = employee.address || 'Адреса не вказана';
        const canEmail = Boolean(employee.email);

        return (
            <div className="profile-layout" id="profileContent">
                <aside className="profile-sidebar">
                    <div className="profile-back">
                        <button className="btn btn-secondary btn-sm" onClick={goBackToEmployees} type="button">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                            Назад до реєстру
                        </button>
                    </div>
                    <div className="profile-identity">
                        <div className="profile-avatar-wrap">
                            <div className="profile-avatar" id="profileAvatar" style={{ background: getAvatarColor(employee.last_name) }}>
                                {initials || '—'}
                            </div>
                            <div className={`profile-status-dot ${employee.status}`} id="profileStatusDot" title={statusLabel(employee.status)}></div>
                        </div>
                        <h1 className="profile-name" id="profileName">{displayName || '—'}</h1>
                        <p className="profile-position" id="profilePosition">{employee.position_title || 'Без посади'}</p>
                        <p className="profile-location" id="profileLocation">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                            {' '}
                            {locationText}
                        </p>
                    </div>
                    <div className="profile-actions">
                        {isAdmin ? (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => editEmployee(employee.id)} type="button">
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                Редагувати
                            </button>
                        ) : null}
                        {canEmail ? (
                            <a className="btn-icon" href={`mailto:${encodeURIComponent(employee.email)}`} title="Написати">
                                <span className="material-symbols-outlined">mail</span>
                            </a>
                        ) : (
                            <button className="btn-icon" title="Email не вказано" type="button" disabled>
                                <span className="material-symbols-outlined">mail</span>
                            </button>
                        )}
                    </div>
                    <div className="profile-meta-cards">
                        <div className="profile-meta-card">
                            <div className="profile-meta-icon"><span className="material-symbols-outlined">mail</span></div>
                            <div>
                                <span className="profile-meta-label">Email</span>
                                <span className="profile-meta-value" id="profileEmail">{employee.email || '—'}</span>
                            </div>
                        </div>
                        <div className="profile-meta-card">
                            <div className="profile-meta-icon"><span className="material-symbols-outlined">group</span></div>
                            <div>
                                <span className="profile-meta-label">Відділ</span>
                                <span className="profile-meta-value" id="profileDept">{employee.department_name || '—'}</span>
                            </div>
                        </div>
                        <div className="profile-meta-card">
                            <div className="profile-meta-icon"><span className="material-symbols-outlined">phone</span></div>
                            <div>
                                <span className="profile-meta-label">Телефон</span>
                                <span className="profile-meta-value" id="profilePhone">{employee.phone || '—'}</span>
                            </div>
                        </div>
                        <div className="profile-meta-card">
                            <div className="profile-meta-icon"><span className="material-symbols-outlined">schedule</span></div>
                            <div>
                                <span className="profile-meta-label">Дата прийому</span>
                                <span className="profile-meta-value" id="profileHireDate">{formatDate(employee.hire_date)}</span>
                                <span className="profile-meta-sub" id="profileTenure">{`Стаж: ${tenure.tenureLabel}`}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="profile-main">
                    <div className="profile-hero-gradient"></div>
                    <div className="profile-main-inner">
                        <section className="profile-section">
                            <h2 className="profile-section-title">
                                <span className="material-symbols-outlined">person_book</span>
                                Персональні дані
                            </h2>
                            <div className="card card-padded" id="profileNarrative">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Повне ім&apos;я</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{displayName}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Посада</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{employee.position_title || 'Не вказано'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Дата народження</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{employee.birth_date ? formatDate(employee.birth_date) : 'Не вказано'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Email</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{employee.email || 'Не вказано'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Телефон</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{employee.phone || 'Не вказано'}</p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Адреса</p>
                                        <p style={{ fontSize: '15px', fontWeight: 500 }}>{employee.address || 'Не вказано'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="profile-section">
                            <h2 className="profile-section-title">
                                <span className="material-symbols-outlined">psychology</span>
                                Компетенції та кваліфікація
                            </h2>
                            <div id="profileSkills">
                                <div className="skills-group">
                                    <div className="skills-group-label">Основні компетенції</div>
                                    <div className="skills-tags">
                                        {primarySkills.map(skill => (
                                            <span key={skill} className="skill-tag primary">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="skills-group">
                                    <div className="skills-group-label">Загальні навички</div>
                                    <div className="skills-tags">
                                        {SECONDARY_SKILLS.map(skill => (
                                            <span key={skill} className="skill-tag secondary">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="profile-section">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <h2 className="profile-section-title" style={{ marginBottom: 0 }}>
                                    <span className="material-symbols-outlined">timeline</span>
                                    Кар&apos;єрний шлях
                                </h2>
                                <span className="badge badge-active" id="profileJourneyBadge" style={{ fontSize: '13px', padding: '6px 14px' }}>
                                    {tenure.tenureLabel}
                                </span>
                            </div>
                            <div className="profile-timeline" id="profileTimeline">
                                <div className="timeline-item">
                                    <div className="timeline-node"></div>
                                    <div className="timeline-card current">
                                        <div className="timeline-card-head">
                                            <h3>{employee.position_title || 'Працівник'}</h3>
                                            <span className="date">{`${formatDate(employee.hire_date)} — Теперішній час`}</span>
                                        </div>
                                        <div className="team-label">{employee.department_name || 'Загальний відділ'}</div>
                                        <ul className="timeline-achievements">
                                            <li>
                                                <span className="material-symbols-outlined">check_circle</span>
                                                <span>{`Зарплата: ${formatMoney(employee.salary)} ₴ / міс.`}</span>
                                            </li>
                                            <li>
                                                <span className="material-symbols-outlined">check_circle</span>
                                                <span>{`Статус: ${statusLabel(employee.status)}`}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className="timeline-node past"></div>
                                    <div className="timeline-join">
                                        <div className="timeline-join-icon">
                                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>waving_hand</span>
                                        </div>
                                        <div>
                                            <h3>Прийнятий в компанію</h3>
                                            <p>{tenure.hireDateLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="profile-section">
                            <h2 className="profile-section-title">
                                <span className="material-symbols-outlined">target</span>
                                Поточний фокус
                            </h2>
                            <div className="profile-focus-grid" id="profileFocus">
                                <div className="focus-card">
                                    <div className="focus-card-head">
                                        <div className="focus-card-icon green"><span className="material-symbols-outlined">payments</span></div>
                                        <h3>Заробітна плата</h3>
                                    </div>
                                    <p>{`Поточний рівень оплати праці працівника з урахуванням посади «${employee.position_title || '—'}» в відділі «${employee.department_name || '—'}».`}</p>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                            <span>{`${formatMoney(employee.salary)} ₴ / міс.`}</span>
                                            <span>{`${salaryPct}%`}</span>
                                        </div>
                                        <div className="progress-track"><div className="progress-fill" style={{ width: `${salaryPct}%` }}></div></div>
                                    </div>
                                </div>
                                <div className="focus-card">
                                    <div className="focus-card-head">
                                        <div className="focus-card-icon teal"><span className="material-symbols-outlined">trending_up</span></div>
                                        <h3>Стаж роботи</h3>
                                    </div>
                                    <p>{`Загальний стаж роботи на підприємстві з дати прийому ${tenure.hireDateLabel}.`}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                                        <span className="badge badge-active" style={{ fontSize: '12px', padding: '4px 12px' }}>{tenure.tenureLabel}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{`з ${formatDate(employee.hire_date)}`}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    })();

    return (
        <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>
            {content}
        </PageStateBoundary>
    );
}
