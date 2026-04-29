import { formatDate } from '../../uiUtils.ts';
import ActionHeader from '../ActionHeader.tsx';
import SectionEmptyState from '../SectionEmptyState.tsx';
import DevelopmentItemActions from './DevelopmentItemActions.tsx';
import { developmentGoalStatusLabel } from './developmentViewModel.ts';

export default function DevelopmentGoalsSection({
    goals,
    isAdmin,
    openGoalCreate,
    editGoal,
    confirmDelete
}) {
    return (
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
                {goals.map((goal, index) => {
                    return (
                        <div key={goal.id} className="dev-goal-card">
                            <div className="dev-goal-left">
                                <div className="dev-goal-icon">
                                    <span className="material-symbols-outlined">{goal.icon || 'target'}</span>
                                </div>
                                <div className="dev-goal-info">
                                    <h3>{goal.title || 'Без назви'}</h3>
                                    <p>{goal.desc || 'Опис відсутній.'}</p>
                                    <div className="dev-goal-meta">
                                        <span className={`dev-goal-badge ${goal.status || ''}`}>
                                            {developmentGoalStatusLabel(goal.status)}
                                        </span>
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
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${goal.progress}%` }}></div>
                                    </div>
                                </div>
                                <DevelopmentItemActions
                                    isAdmin={isAdmin}
                                    type="developmentGoal"
                                    id={goal.id}
                                    index={index}
                                    total={goals.length}
                                    onEdit={() => editGoal(goal.id)}
                                    onDelete={() => confirmDelete('developmentGoal', goal.id, goal.title || 'Ціль')}
                                    editTitle="Редагувати ціль"
                                    deleteTitle="Видалити ціль"
                                />
                            </div>
                        </div>
                    );
                })}
            </SectionEmptyState>
        </section>
    );
}
