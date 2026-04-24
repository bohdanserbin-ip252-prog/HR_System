export default function RiskPanel({ metrics }) {
  const openComplaints = Number(metrics?.openComplaints || 0);
  const criticalComplaints = Number(metrics?.criticalComplaints || 0);
  const repeatEmployees = Number(metrics?.repeatComplaintEmployees || 0);
  const overdueCases = Number(metrics?.overdueCases || 0);
  const pendingTimeOff = Number(metrics?.pendingTimeOff || 0);
  const riskLevel = criticalComplaints > 0 || repeatEmployees > 0 || overdueCases > 0 ? 'Потребує уваги' : 'Контрольовано';

  return (
    <div className="card card-padded risk-panel">
      <div className="risk-panel__head">
        <div>
          <div className="label">HR-ризики</div>
          <h3>{riskLevel}</h3>
        </div>
        <span className="material-symbols-outlined" aria-hidden="true">health_and_safety</span>
      </div>
      <div className="risk-panel__grid">
        <div><strong>{openComplaints}</strong><span>активних скарг</span></div>
        <div><strong>{criticalComplaints}</strong><span>критичних</span></div>
        <div><strong>{overdueCases}</strong><span>прострочених cases</span></div>
        <div><strong>{repeatEmployees}</strong><span>повторних кейсів</span></div>
        <div><strong>{pendingTimeOff}</strong><span>заявок на відсутність</span></div>
      </div>
    </div>
  );
}
