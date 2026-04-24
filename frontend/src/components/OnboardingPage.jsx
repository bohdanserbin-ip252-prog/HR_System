import { useMemo } from 'react';
import { useAppActions } from '../appContext.jsx';
import { formatDate, getAvatarColor, getErrorMessage } from '../uiUtils.js';
import ActionHeader from './ActionHeader.jsx';
import MoveButtons from './MoveButtons.jsx';
import PageStateBoundary from './PageStateBoundary.jsx';
import SectionEmptyState from './SectionEmptyState.jsx';

function onboardingTaskStatusLabel(status) {
    const labels = {
        active: 'Активне',
        pending: 'Очікує',
        completed: 'Готово'
    };
    return labels[status] || status || '—';
}

function getStepperItems(percent) {
    const labels = [
        { title: 'Оформлення' },
        { title: 'Дні 1-30' },
        { title: 'Дні 31-60' },
        { title: 'День 90+' }
    ];
    const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const currentIndex = normalizedPercent >= 100 ? labels.length : Math.floor(normalizedPercent / 25);

    return labels.map((item, index) => {
        const isCompleted = index < currentIndex || (normalizedPercent >= 100 && index === labels.length - 1);
        const isActive = !isCompleted && index === currentIndex;
        const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
        const icon = state === 'completed'
            ? 'check'
            : state === 'active'
                ? (index === 1 ? 'person_search' : index === 2 ? 'groups' : index === 3 ? 'rocket_launch' : 'description')
                : (index === 1 ? 'person_search' : index === 2 ? 'groups' : index === 3 ? 'rocket_launch' : 'description');
        const subtitle = isCompleted ? 'Завершено' : isActive ? 'В процесі' : 'Попереду';
        return { ...item, state, icon, subtitle };
    });
}

export default function OnboardingPage({ currentUser, isActive, snapshot }) {
    const { confirmDelete, editTask, openTaskCreate } = useAppActions();
    const isAdmin = currentUser?.role === 'admin';
    const data = snapshot?.data || {};
    const team = data.team || {};
    const avatars = Array.isArray(team.avatars) ? team.avatars : [];
    const totalCount = Number(team.totalCount || 0);
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const buddy = data.buddy || null;
    const progress = data.progress || {};
    const percent = Number(progress.percent || 0);
    const completedCount = Number(progress.completedCount || 0);
    const totalTaskCount = Number(progress.totalCount || tasks.length);
    const hasAnyData = avatars.length > 0 || tasks.length > 0 || totalCount > 0 || buddy !== null;
    const stepperItems = useMemo(() => getStepperItems(percent), [percent]);

    return (
        <>
            <div className="page-header">
                <div className="onboarding-header">
                    <div className="onboarding-header-left">
                        <span className="onboarding-progress-badge">Прогрес адаптації: {percent}%</span>
                        <h1>Адаптація працівника</h1>
                        <p>Стан адаптації відображається лише за даними, що зберігаються в базі.</p>
                    </div>
                    <div className="onboarding-avatars">
                        {avatars.map(employee => {
                            return (
                                <div
                                    key={employee.id}
                                    className="ob-avatar"
                                    style={{ background: getAvatarColor(employee.last_name) }}
                                >
                                    {`${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}` || '—'}
                                </div>
                            );
                        })}
                        {Math.max(totalCount - avatars.length, 0) > 0 ? (
                            <div className="ob-avatar extra">+{Math.max(totalCount - avatars.length, 0)}</div>
                        ) : null}
                    </div>
                </div>
            </div>

            <PageStateBoundary
                loading={isActive && (snapshot.status === 'idle' || (snapshot.status === 'loading' && !hasAnyData)) ? {
                    icon: 'hourglass_top',
                    title: 'Завантаження адаптації',
                    description: 'Отримуємо поточний прогрес, задачі й наставника з бази даних.'
                } : null}
                error={snapshot.status === 'error' ? {
                    icon: 'error',
                    title: 'Не вдалося завантажити адаптацію',
                    description: getErrorMessage({ message: snapshot.errorMessage }, 'Спробуйте оновити сторінку ще раз.')
                } : null}
            >
                <>
                    <div className="ob-stepper">
                        <div className="ob-stepper-track">
                            <div className="ob-stepper-fill" style={{ width: `${Math.max(percent, 15)}%` }}></div>
                        </div>
                        <div className="ob-stepper-nodes">
                            {stepperItems.map(item => (
                                <div key={item.title} className={`ob-step ${item.state}`}>
                                    <div className={`ob-step-circle ${item.state}`}>
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <span className="ob-step-label">{item.title}</span>
                                    <span className="ob-step-sub">{item.subtitle}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="ob-bento onboarding-content">
                        <div className="ob-tasks">
                            <ActionHeader
                                containerClassName="ob-tasks-header"
                                title="Тиждень 1: Основи"
                                titleLevel="h3"
                                showAction={isAdmin}
                                actionLabel="Додати задачу"
                                onAction={openTaskCreate}
                            />
                            <SectionEmptyState
                                hasContent={tasks.length > 0}
                                icon="checklist"
                                title="Завдань поки немає"
                                description="У базі даних ще немає завдань адаптації."
                            >
                                {tasks.map((task, index) => {
                                    let actionLabel = onboardingTaskStatusLabel(task.status || '');
                                    if (task.status === 'completed') actionLabel = 'Готово';
                                    else if (task.dueDate) actionLabel = `До ${formatDate(task.dueDate)}`;

                                    return (
                                        <div
                                            key={task.id}
                                            className={`ob-task ${task.status || ''}`.trim()}
                                        >
                                            <div className="ob-task-icon">
                                                <span className="material-symbols-outlined" style={task.status === 'active' ? { fontVariationSettings: "'FILL' 1" } : undefined}>{task.icon || 'task_alt'}</span>
                                            </div>
                                            <div className="ob-task-body">
                                                <h4>
                                                    {task.title || 'Без назви'}
                                                    {task.priority ? <span className="ob-task-priority">ПРІОРИТЕТ</span> : null}
                                                </h4>
                                                <p>{task.desc || 'Опис відсутній.'}</p>
                                                {isAdmin ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                                                        <MoveButtons type="onboardingTask" id={task.id} index={index} total={tasks.length} />
                                                        <button className="btn-icon" onClick={() => editTask(task.id)} title="Редагувати задачу" type="button">
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                        </button>
                                                        <button className="btn-icon" onClick={() => confirmDelete('onboardingTask', task.id, task.title || 'Задача')} title="Видалити задачу" type="button">
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <span className="ob-task-action time-badge">{actionLabel}</span>
                                        </div>
                                    );
                                })}
                            </SectionEmptyState>
                        </div>

                        <div className="ob-contextual">
                            <div className="ob-buddy-card">
                                <div className="ob-buddy-glow"></div>
                                <h3><span className="material-symbols-outlined">contact_support</span> Ваш наставник</h3>
                                {buddy ? (
                                    <div className="ob-buddy-info">
                                        <div className="ob-buddy-avatar" style={{ background: getAvatarColor(buddy.last_name) }}>
                                            {`${buddy.first_name?.[0] || ''}${buddy.last_name?.[0] || ''}` || '—'}
                                        </div>
                                        <div>
                                            <div className="ob-buddy-name">{`${buddy.last_name || ''} ${buddy.first_name || ''}`.trim() || '—'}</div>
                                            <div className="ob-buddy-role">{buddy.role || 'Роль не вказана'}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ob-buddy-info">
                                        <div className="ob-buddy-avatar" style={{ background: 'var(--outline-variant)' }}>—</div>
                                        <div>
                                            <div className="ob-buddy-name">Наставника ще не призначено</div>
                                            <div className="ob-buddy-role">Очікується оновлення даних</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="ob-insight-card">
                                <div className="ob-insight-icon">
                                    <span className="material-symbols-outlined">emoji_events</span>
                                </div>
                                <p className="ob-insight-title">Чудовий прогрес!</p>
                                <p className="ob-insight-desc">Ви виконали {completedCount} з {totalTaskCount} завдань першого тижня.</p>
                                <div className="progress-track" style={{ marginTop: '12px' }}>
                                    <div className="progress-fill" style={{ width: `${percent}%`, background: 'var(--tertiary-container)', boxShadow: '0 0 8px rgba(0,252,64,0.5)' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            </PageStateBoundary>
        </>
    );
}
