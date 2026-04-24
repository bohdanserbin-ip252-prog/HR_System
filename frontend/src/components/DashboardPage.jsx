import { useMemo } from 'react';
import { useAppActions } from '../appContext.jsx';
import { formatMoney, getErrorMessage } from '../uiUtils.js';
import DashboardCharts from './dashboard/DashboardCharts.jsx';
import NotificationCenter from './dashboard/NotificationCenter.jsx';
import RiskPanel from './dashboard/RiskPanel.jsx';
import PageStateBoundary from './PageStateBoundary.jsx';

export default function DashboardPage({ currentUser, isActive, snapshot }) {
    const { navigateTo } = useAppActions();

    const viewModel = useMemo(() => {
        const stats = snapshot.data?.stats || null;
        const totalEmployees = Number(stats?.totalEmployees || 0);
        const totalDepartments = Number(stats?.totalDepartments || 0);
        const totalPositions = Number(stats?.totalPositions || 0);
        const activeCount = Number(stats?.activeCount ?? totalEmployees ?? 0);
        const onLeaveCount = Number(stats?.onLeaveCount || 0);
        const avgSalary = Number(stats?.avgSalary || 0);
        const pct = totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;
        const salaryByDept = Array.isArray(stats?.salaryByDept) ? [...stats.salaryByDept] : [];
        const salaryByDeptSorted = salaryByDept.sort((a, b) => (b.avg_salary || 0) - (a.avg_salary || 0));
        const totalSalaryBudget = totalEmployees * avgSalary;
        const maxSalary = Math.max(...salaryByDeptSorted.map(item => item.avg_salary || 0), 1);
        const topDeptSalary = salaryByDeptSorted[0] || null;
        const topDept = Array.isArray(stats?.deptStats) ? stats.deptStats[0] : null;
        const topDeptSalaryByHeadcount = salaryByDept.find(item => item.name === topDept?.name) || topDeptSalary;
        const recentHire = Array.isArray(stats?.recentHires) ? stats.recentHires[0] : null;
        const topDeptShortName = topDept?.name?.split(/[-\s]/)[0] || '—';

        const directives = [];

        if (onLeaveCount > 0) {
            directives.push({
                icon: 'account_balance_wallet',
                cls: 'red',
                title: 'Відпустки персоналу',
                desc: `${onLeaveCount} працівник(ів) зараз у відпустці. Перевірте графік повернення та тимчасове заміщення.`,
                tag: 'ТЕРМІНОВО',
                tagCls: 'tag-urgent'
            });
        }

        if (recentHire) {
            directives.push({
                icon: 'diversity_3',
                cls: 'teal',
                title: 'Нові працівники',
                desc: `Останній прийнятий: ${recentHire.last_name} ${recentHire.first_name} — ${recentHire.position || 'без посади'}, ${recentHire.department || 'без відділу'}.`,
                tag: 'СТРАТЕГІЧНЕ',
                tagCls: 'tag-strategic'
            });
        }

        directives.push({
            icon: 'security',
            cls: 'green',
            title: 'Аналіз зарплат',
            desc: `Середня зарплата по підприємству: ${formatMoney(avgSalary)}₴. Діапазон відхилень по відділах у межах норми.`,
            tag: 'ДО УВАГИ',
            tagCls: 'tag-action'
        });

        directives.push({
            icon: 'architecture',
            cls: 'gray',
            title: 'Організаційна структура',
            desc: `Підприємство має ${totalDepartments} відділів і ${totalPositions} посад. Оновіть структуру при необхідності.`,
            tag: 'ПЛАНУВАННЯ',
            tagCls: 'tag-planning'
        });

        const insightText = topDept
            ? `Найбільший відділ «${topDept.name}» налічує ${topDept.count} працівників із середньою зарплатою ${formatMoney(topDeptSalaryByHeadcount?.avg_salary || 0)}₴. Рекомендуємо аналіз розподілу навантаження для оптимізації ефективності.`
            : 'Завантажте дані для аналізу.';

        return {
            hasStats: Boolean(stats),
            totalEmployees,
            totalDepartments,
            totalPositions,
            activeCount,
            pct,
            avgSalary,
            totalSalaryBudget,
            topDeptShortName,
            topDeptSalary,
            maxSalary,
            directives,
            insightText
        };
    }, [snapshot]);

    const isLoading = isActive && (snapshot.status === 'idle' || snapshot.status === 'loading') && !viewModel.hasStats;

    const content = (
        <>
            <div className="page-header">
                <h1>Огляд системи</h1>
                <p>Оперативна зведена інформація та ключові показники.</p>
            </div>

            <PageStateBoundary
                loading={isLoading ? {
                    icon: 'hourglass_top',
                    title: 'Завантаження огляду системи',
                    description: 'Отримуємо актуальні показники персоналу та організаційної структури.'
                } : null}
                error={snapshot.status === 'error' ? {
                    icon: 'error',
                    title: 'Не вдалося завантажити огляд системи',
                    description: getErrorMessage({ message: snapshot.errorMessage }, 'Спробуйте оновити сторінку ще раз.')
                } : null}
            >
                <div className="page-content dashboard-content">
                    <div className="dashboard-grid">
                        <div className="dashboard-left">
                            <div className="card card-padded hero-stat-card">
                                <div className="card-top">
                                    <div>
                                        <div className="label">Кадровий потенціал</div>
                                        <div className="sublabel">Агрегований показник стану</div>
                                    </div>
                                    <div className="badge-stable">СТАБІЛЬНО</div>
                                </div>
                                <div className="hero-stat-value">
                                    <span className="big-num">{viewModel.totalEmployees}</span>
                                    <div className="context">
                                        <span className="trend">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                                            {viewModel.totalDepartments} відділів
                                        </span>
                                        <span className="benchmark">{viewModel.totalPositions} посад в системі</span>
                                    </div>
                                </div>
                                <div className="hero-stat-metrics">
                                    <div className="metric">
                                        <div className="metric-label">Активних</div>
                                        <div className="metric-value">{viewModel.pct}%</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-label">Сер. зарплата</div>
                                        <div className="metric-value">{formatMoney(viewModel.avgSalary)}₴</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-label">Топ відділ</div>
                                        <div className="metric-value">{viewModel.topDeptShortName}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mini-stats-row dashboard-kpi-grid">
                                <div className="card mini-stat-card">
                                    <div className="mini-label">Бюджет на зарплати</div>
                                    <div className="mini-row">
                                        <span className="mini-value">{formatMoney(viewModel.totalSalaryBudget)}₴</span>
                                        <span className="mini-tag">Щомісяця</span>
                                    </div>
                                    <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(viewModel.pct + 5, 100)}%` }}></div></div>
                                </div>
                                <div className="card mini-stat-card">
                                    <div className="mini-label">Топ зарплата (відділ)</div>
                                    <div className="mini-row">
                                        <span className="mini-value">{formatMoney(viewModel.topDeptSalary?.avg_salary || 0)}₴</span>
                                        <span className="mini-tag">{viewModel.topDeptSalary?.name || '—'}</span>
                                    </div>
                                    <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(((viewModel.topDeptSalary?.avg_salary || 0) / viewModel.maxSalary) * 100)}%` }}></div></div>
                                </div>
                            </div>

                            <div className="insight-card">
                                <h3>Стратегічний інсайт</h3>
                                <p>“{viewModel.insightText}”</p>
                                <span className="material-symbols-outlined bg-icon">lightbulb</span>
                            </div>
                        </div>

                        <div className="dashboard-right">
                            <RiskPanel metrics={snapshot.data?.stats?.riskMetrics} />
                            <NotificationCenter currentUser={currentUser} />
                            <div className="card directives-panel">
                                <h3>
                                    <span className="material-symbols-outlined">assignment_late</span>
                                    Оперативні завдання
                                </h3>
                                <div className="directives-list">
                                    {viewModel.directives.map(item => {
                                        return (
                                        <div
                                            key={`${item.title}-${item.tag}`}
                                            className="directive"
                                        >
                                            <div className={`directive-icon ${item.cls}`}>
                                                <span className="material-symbols-outlined">{item.icon}</span>
                                            </div>
                                            <div className="directive-body">
                                                <h4>{item.title}</h4>
                                                <p>{item.desc}</p>
                                                <span className={`tag ${item.tagCls}`}>{item.tag}</span>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '32px' }}>
                                    <button className="btn btn-outline btn-full" onClick={() => navigateTo('employees')} type="button">
                                        Переглянути всі записи
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DashboardCharts stats={snapshot.data?.stats} />
                </div>
            </PageStateBoundary>
        </>
    );

    return content;
}
