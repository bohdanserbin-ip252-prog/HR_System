import { parseDateValue } from '../../uiUtils.js';
import ActionHeader from '../ActionHeader.jsx';
import SectionEmptyState from '../SectionEmptyState.jsx';
import DevelopmentItemActions from './DevelopmentItemActions.jsx';
import { DEVELOPMENT_MONTHS } from './developmentViewModel.js';

export default function DevelopmentMeetingsCard({
    meetings,
    isAdmin,
    openMeetingCreate,
    editMeeting,
    confirmDelete
}) {
    return (
        <div className="dev-card">
            <ActionHeader
                containerStyle={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}
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
                    const date = parseDateValue(meeting.date);
                    const hasValidDate = date instanceof Date && !Number.isNaN(date.getTime());
                    const month = hasValidDate ? DEVELOPMENT_MONTHS[date.getMonth()] : '—';
                    const day = hasValidDate ? date.getDate() : '—';

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
                                <DevelopmentItemActions
                                    isAdmin={isAdmin}
                                    type="developmentMeeting"
                                    id={meeting.id}
                                    index={index}
                                    total={meetings.length}
                                    onEdit={() => editMeeting(meeting.id)}
                                    onDelete={() => confirmDelete('developmentMeeting', meeting.id, meeting.title || 'Зустріч')}
                                    editTitle="Редагувати зустріч"
                                    deleteTitle="Видалити зустріч"
                                    style={{ marginTop: 0, justifyContent: 'flex-start' }}
                                />
                            ) : (
                                <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>
                                    event_available
                                </span>
                            )}
                        </div>
                    );
                })}
            </SectionEmptyState>
        </div>
    );
}
