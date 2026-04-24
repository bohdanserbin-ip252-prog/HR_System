import { useState } from 'react';
import { ENDPOINTS } from '../app/endpoints.js';
import ExportCsvButton from './ExportCsvButton.jsx';
import PlatformCard from './platform/PlatformCard.jsx';
import { usePlatformData } from './platform/usePlatformData.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const REPORTS = ['payroll', 'training', 'scheduling', 'audit'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [type, setType] = useState('payroll');
  const { data } = usePlatformData(ENDPOINTS.reportByKind(type));
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const columns = Object.keys(rows[0] || {}).map(key => ({ label: key, value: row => row[key] }));

  const chartData = rows.slice(0, 10).map(row => {
    const obj = { ...row };
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'number') {
        obj[key] = Number(obj[key]);
      }
    });
    return obj;
  });

  const numericKeys = chartData.length > 0
    ? Object.keys(chartData[0]).filter(k => typeof chartData[0][k] === 'number')
    : [];

  const labelKey = chartData.length > 0
    ? Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'name'
    : 'name';

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>Reports Center</h1>
          <p>Аналітичні звіти та візуалізація даних.</p>
        </div>
        <select className="form-input" value={type} onChange={event => setType(event.target.value)}>
          {REPORTS.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="platform-grid">
        {chartData.length > 0 && numericKeys.length > 0 && (
          <PlatformCard icon="insights" title={`${type} chart`} meta="Top 10 entries">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={labelKey} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {numericKeys.map((key, index) => (
                    <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PlatformCard>
        )}

        {type === 'audit' && chartData.length > 0 && (
          <PlatformCard icon="donut_large" title="Distribution" meta="By count">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => entry[labelKey]}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey={numericKeys[0] || 'count'}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </PlatformCard>
        )}

        <PlatformCard icon="summarize" title={`${type} report`} meta={`${rows.length} row(s)`}>
          <ExportCsvButton columns={columns} filename={`${type}.csv`} rows={rows} />
          <button className="btn btn-outline" onClick={() => window.print()} type="button">Print</button>
        </PlatformCard>
      </div>
    </>
  );
}
