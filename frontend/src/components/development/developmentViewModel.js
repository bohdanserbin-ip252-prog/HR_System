export const DEVELOPMENT_MONTHS = [
    'Січ',
    'Лют',
    'Бер',
    'Кві',
    'Тра',
    'Чер',
    'Лип',
    'Сер',
    'Вер',
    'Жов',
    'Лис',
    'Гру'
];

export function developmentGoalStatusLabel(status) {
    const labels = {
        'in-progress': 'В процесі',
        'on-track': 'За планом',
        completed: 'Завершено'
    };
    return labels[status] || status || '—';
}
