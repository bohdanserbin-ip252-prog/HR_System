import { formatDate, getAvatarColor } from '../../uiUtils.ts';
import ActionHeader from '../ActionHeader.tsx';
import SectionEmptyState from '../SectionEmptyState.tsx';
import DevelopmentItemActions from './DevelopmentItemActions.tsx';

export default function DevelopmentFeedbackCard({
    feedback,
    isAdmin,
    openFeedbackCreate,
    editFeedback,
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
                            <div className="dev-feedback-avatar" style={{ background: getAvatarColor(lastName), color: 'white' }}>
                                {initials}
                            </div>
                            <div className="dev-feedback-bubble">
                                <div className="dev-feedback-head">
                                    <span className="dev-feedback-name">{displayName}</span>
                                    <span className="dev-feedback-time">{formatDate(item.feedbackAt)}</span>
                                </div>
                                <p className="dev-feedback-text">«{item.text || ''}»</p>
                                <DevelopmentItemActions
                                    isAdmin={isAdmin}
                                    type="developmentFeedback"
                                    id={item.id}
                                    index={index}
                                    total={feedback.length}
                                    onEdit={() => editFeedback(item.id)}
                                    onDelete={() => confirmDelete('developmentFeedback', item.id, item.text || 'Відгук')}
                                    editTitle="Редагувати відгук"
                                    deleteTitle="Видалити відгук"
                                />
                            </div>
                        </div>
                    );
                })}
            </SectionEmptyState>
        </div>
    );
}
