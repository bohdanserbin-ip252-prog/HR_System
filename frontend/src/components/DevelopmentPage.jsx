import { useAppActions } from '../appContext.jsx';
import { formatDate, getAvatarColor, getErrorMessage, parseDateValue } from '../uiUtils.js';
import ActionHeader from './ActionHeader.jsx';
import MoveButtons from './MoveButtons.jsx';
import PageStateBoundary from './PageStateBoundary.jsx';
import SectionEmptyState from './SectionEmptyState.jsx';

function developmentGoalStatusLabel(status) {
    const labels = {
        'in-progress': 'В процесі',
        'on-track': 'За планом',
        completed: 'Завершено'
    };
    return labels[status] || status || '—';
}

const MONTHS = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

export default function DevelopmentPage({ currentUser, isActive, snapshot }) {
    const {
        confirmDelete,
        editFeedback,
        editGoal,
        editMeeting,
        openFeedbackCreate,
        openGoalCreate,
        openMeetingCreate
    } = useAppActions();

    const isAdmin = currentUser?.role === 'admin';
    const data = snapshot?.data || {};
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const feedback = Array.isArray(data.feedback) ? data.feedback : [];
    const meetings = Array.isArray(data.meetings) ? data.meetings : [];
    const hasAnyData = goals.length > 0 || feedback.length > 0 || meetings.length > 0;

    const content = (
        <>
            <div className="dev-hero">
                <div className="dev-hero-gradient"></div>
                <div className="dev-hero-content">
                    <div className="dev-hero-text">
                        <h1>План розвитку</h1>
                        <p>Усі записи про цілі, відгуки та зустрічі завантажуються напряму з бази даних.</p>
                    </div>
                </div>
            </div>

            <PageStateBoundary
                loading={isActive && (snapshot.status === 'idle' || (snapshot.status === 'loading' && !hasAnyData)) ? {
                    icon: 'hourglass_top',
                    title: 'Завантаження плану розвитку',
                    description: 'Отримуємо актуальні цілі, відгуки та зустрічі з бази даних.'
                } : null}
                error={snapshot.status === 'error' ? {
                    icon: 'error',
                    title: 'Не вдалося завантажити план розвитку',
                    description: getErrorMessage({ message: snapshot.errorMessage }, 'Спробуйте оновити сторінку ще раз.')
                } : null}
            >
                <div className="dev-grid">
                    <section className="dev-goals">
                        <ActionHeader
                            containerClassName="dev-section-head"
                            title="Поточні цілі"
                            titleLevel="h2"
                            showAction={isAdmin}
                            actionLabel="Додати ціль"
                            onAction={openGoalCreate}
                        />
                        <SectionEmptyState
                            hasContent={goals.length > 0}
                            icon="target"
                            title="Цілі відсутні"
                            description="У базі даних поки немає активних цілей розвитку."
                        >
                            {goals.map((goal, index) => (
                                <div key={goal.id} className="dev-goal-card">
                                    <div className="dev-goal-left">
                                        <div className="dev-goal-icon"><span className="material-symbols-outlined">{goal.icon || 'target'}</span></div>
                                        <div className="dev-goal-info">
                                            <h3>{goal.title || 'Без назви'}</h3>
                                            <p>{goal.desc || 'Опис відсутній.'}</p>
                                            <div className="dev-goal-meta">
                                                <span className={`dev-goal-badge ${goal.status || ''}`}>{developmentGoalStatusLabel(goal.status)}</span>
                                                {goal.dueDate ? (
                                                    <span className="dev-goal-due">
                                                        <span className="material-symbols-outlined">schedule</span>
                                                        {' '}
                                                        До
                                                        {' '}
                                                        {formatDate(goal.dueDate)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="dev-goal-right">
                                        <div className="dev-goal-progress">
                                            <div className="dev-goal-progress-header">
                                                <span>Прогрес</span>
                                                <span>{goal.progress}%</span>
                                            </div>
                                            <div className="progress-track"><div className="progress-fill" style={{ width: `${goal.progress}%` }}></div></div>
                                        </div>
                                        {isAdmin ? (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                                                <MoveButtons type="developmentGoal" id={goal.id} index={index} total={goals.length} />
                                                <button className="btn-icon" onClick={() => editGoal(goal.id)} title="Редагувати ціль" type="button">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                </button>
                                                <button className="btn-icon" onClick={() => confirmDelete('developmentGoal', goal.id, goal.title || 'Ціль')} title="Видалити ціль" type="button">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </SectionEmptyState>
                    </section>

                    <section className="dev-mentorship">
                        <h2>Наставництво та зворотний зв'язок</h2>

                        <div className="dev-card">
                            <ActionHeader
                                containerStyle={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}
                                title="Останні відгуки"
                                titleLevel="h3"
                                titleClassName="dev-card-title"
                                titleStyle={{ marginBottom: 0 }}
                                titleIcon="forum"
                                titleIconStyle={{ color: 'var(--primary)' }}
                                showAction={isAdmin}
                                actionLabel="Додати відгук"
                                onAction={openFeedbackCreate}
                            />
                            <SectionEmptyState
                                hasContent={feedback.length > 0}
                                icon="forum"
                                title="Відгуки відсутні"
                                description="У базі даних поки немає записів зі зворотним зв’язком."
                            >
                                {feedback.map((item, index) => {
                                    const firstName = item.employee?.first_name || '';
                                    const lastName = item.employee?.last_name || '';
                                    const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}` : '—';
                                    const displayName = item.employee ? `${lastName} ${firstName[0]}.` : 'Автор не вказаний';

                                    return (
                                        <div key={item.id} className="dev-feedback-item">
                                            <div className="dev-feedback-avatar" style={{ background: getAvatarColor(lastName), color: 'white' }}>{initials}</div>
                                            <div className="dev-feedback-bubble">
                                                <div className="dev-feedback-head">
                                                    <span className="dev-feedback-name">{displayName}</span>
                                                    <span className="dev-feedback-time">{formatDate(item.feedbackAt)}</span>
                                                </div>
                                                <p className="dev-feedback-text">«{item.text || ''}»</p>
                                                {isAdmin ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                                                        <MoveButtons type="developmentFeedback" id={item.id} index={index} total={feedback.length} />
                                                        <button className="btn-icon" onClick={() => editFeedback(item.id)} title="Редагувати відгук" type="button">
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                        </button>
                                                        <button className="btn-icon" onClick={() => confirmDelete('developmentFeedback', item.id, item.text || 'Відгук')} title="Видалити відгук" type="button">
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </SectionEmptyState>
                        </div>

                        <div className="dev-card">
                            <ActionHeader
                                containerStyle={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}
                                title="Найближчі 1:1 зустрічі"
                                titleLevel="h3"
                                titleClassName="dev-card-title"
                                titleStyle={{ marginBottom: 0 }}
                                titleIcon="event"
                                titleIconStyle={{ color: 'var(--primary)' }}
                                showAction={isAdmin}
                                actionLabel="Додати зустріч"
                                onAction={openMeetingCreate}
                            />
                            <SectionEmptyState
                                hasContent={meetings.length > 0}
                                icon="event"
                                title="Зустрічі відсутні"
                                description="Найближчі 1:1 зустрічі ще не заплановані в базі даних."
                            >
                                {meetings.map((meeting, index) => {
                                    const meetingDate = parseDateValue(meeting.date) || new Date(meeting.date);
                                    const hasValidDate = meetingDate instanceof Date && !Number.isNaN(meetingDate.getTime());
                                    const month = hasValidDate ? MONTHS[meetingDate.getMonth()] : '—';
                                    const day = hasValidDate ? meetingDate.getDate() : '—';

                                    return (
                                        <div key={meeting.id} className="dev-meeting-item">
                                            <div className="dev-meeting-left">
                                                <div className="dev-meeting-date">
                                                    <span className="dev-meeting-month">{String(month)}</span>
                                                    <span className="dev-meeting-day">{String(day)}</span>
                                                </div>
                                                <div className="dev-meeting-info">
                                                    <span>{meeting.title || 'Без назви'}</span>
                                                    <span>
                                                        <span className="material-symbols-outlined">videocam</span>
                                                        {' '}
                                                        {meeting.type || 'Тип не вказано'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isAdmin ? (
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <MoveButtons type="developmentMeeting" id={meeting.id} index={index} total={meetings.length} />
                                                    <button className="btn-icon" onClick={() => editMeeting(meeting.id)} title="Редагувати зустріч" type="button">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                    </button>
                                                    <button className="btn-icon" onClick={() => confirmDelete('developmentMeeting', meeting.id, meeting.title || 'Зустріч')} title="Видалити зустріч" type="button">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>event_available</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </SectionEmptyState>
                        </div>
                    </section>
                </div>
            </PageStateBoundary>
        </>
    );

    return content;
}
