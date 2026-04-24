import { useAppActions } from '../appContext.jsx';
import { getErrorMessage } from '../uiUtils.js';
import PageStateBoundary from './PageStateBoundary.jsx';
import DevelopmentFeedbackCard from './development/DevelopmentFeedbackCard.jsx';
import DevelopmentGoalsSection from './development/DevelopmentGoalsSection.jsx';
import DevelopmentMeetingsCard from './development/DevelopmentMeetingsCard.jsx';

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

    return (
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
                <div className="dev-grid development-content">
                    <DevelopmentGoalsSection
                        goals={goals}
                        isAdmin={isAdmin}
                        openGoalCreate={openGoalCreate}
                        editGoal={editGoal}
                        confirmDelete={confirmDelete}
                    />
                    <section className="dev-mentorship">
                        <h2>Наставництво та зворотний зв'язок</h2>
                        <DevelopmentFeedbackCard
                            feedback={feedback}
                            isAdmin={isAdmin}
                            openFeedbackCreate={openFeedbackCreate}
                            editFeedback={editFeedback}
                            confirmDelete={confirmDelete}
                        />
                        <DevelopmentMeetingsCard
                            meetings={meetings}
                            isAdmin={isAdmin}
                            openMeetingCreate={openMeetingCreate}
                            editMeeting={editMeeting}
                            confirmDelete={confirmDelete}
                        />
                    </section>
                </div>
            </PageStateBoundary>
        </>
    );
}
