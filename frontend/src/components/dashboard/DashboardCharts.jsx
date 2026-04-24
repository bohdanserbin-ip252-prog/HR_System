import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { formatMoney } from '../../uiUtils.js';

const COLORS = ['#059669', '#27655d', '#006b15', '#006944', '#475569', '#0284c7', '#7c3aed', '#b45309'];

function getMonthLabel(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' });
}

export default function DashboardCharts({ stats }) {
    const deptStats = Array.isArray(stats?.deptStats) ? stats.deptStats : [];
    const salaryByDept = Array.isArray(stats?.salaryByDept) ? stats.salaryByDept : [];
    const recentHires = Array.isArray(stats?.recentHires) ? stats.recentHires : [];

    const pieData = deptStats.map(d => ({ name: d.name || '—', value: Number(d.count || 0) }));
    const barData = salaryByDept.map(d => ({ name: d.name || '—', avg: Math.round(Number(d.avg_salary || 0)) }));

    const hiresByMonth = recentHires.reduce((acc, h) => {
        const label = getMonthLabel(h.hire_date || h.date);
        if (!label) return acc;
        const existing = acc.find(item => item.month === label);
        if (existing) {
            existing.count += 1;
        } else {
            acc.push({ month: label, count: 1 });
        }
        return acc;
    }, []);

    return (
        <div className="dashboard-charts-grid">
            <div className="card chart-card">
                <h3>Розподіл за відділами</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="card chart-card">
                <h3>Середня зарплата по відділах</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => [`${formatMoney(v)} ₴`, 'Середня зарплата']} />
                        <Bar dataKey="avg" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="card chart-card chart-card--wide">
                <h3>Динаміка наймів</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={hiresByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={v => [`${v}`, 'Нових працівників']} />
                        <Area type="monotone" dataKey="count" stroke="#059669" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
