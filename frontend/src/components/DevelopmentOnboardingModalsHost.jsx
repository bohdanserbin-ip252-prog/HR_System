import FeedbackModal from './FeedbackModal.jsx';
import GoalModal from './GoalModal.jsx';
import MeetingModal from './MeetingModal.jsx';
import TaskModal from './TaskModal.jsx';

export default function DevelopmentOnboardingModalsHost({
    currentUser,
    modalState,
    developmentData,
    onboardingData,
    onClose
}) {
    const goals = Array.isArray(developmentData?.goals) ? developmentData.goals : [];
    const feedback = Array.isArray(developmentData?.feedback) ? developmentData.feedback : [];
    const meetings = Array.isArray(developmentData?.meetings) ? developmentData.meetings : [];
    const tasks = Array.isArray(onboardingData?.tasks) ? onboardingData.tasks : [];

    return (
        <>
            <GoalModal
                isOpen={modalState?.type === 'goal'}
                mode={modalState?.mode || 'create'}
                goalId={modalState?.type === 'goal' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                goals={goals}
                onClose={onClose}
            />
            <FeedbackModal
                isOpen={modalState?.type === 'feedback'}
                mode={modalState?.mode || 'create'}
                feedbackId={modalState?.type === 'feedback' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                feedback={feedback}
                onClose={onClose}
            />
            <MeetingModal
                isOpen={modalState?.type === 'meeting'}
                mode={modalState?.mode || 'create'}
                meetingId={modalState?.type === 'meeting' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                meetings={meetings}
                onClose={onClose}
            />
            <TaskModal
                isOpen={modalState?.type === 'task'}
                mode={modalState?.mode || 'create'}
                taskId={modalState?.type === 'task' ? modalState?.entityId ?? null : null}
                currentUser={currentUser}
                tasks={tasks}
                onClose={onClose}
            />
        </>
    );
}
