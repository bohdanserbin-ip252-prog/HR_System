import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import PlatformCard from './platform/PlatformCard.tsx';
import PlatformListPage from './platform/PlatformListPage.tsx';

export default function PayrollPage() {
  const [busy, setBusy] = useState(false);

  async function createRun(event, reload) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      await fetchJSON(ENDPOINTS.payrollRuns, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      event.currentTarget.reset();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function finalize(id, reload) {
    await fetchJSON(ENDPOINTS.payrollFinalize(id), { method: 'POST' });
    await reload();
  }

  return (
    <PlatformListPage
      title="Payroll Engine"
      description="Payroll runs, gross/net preview, bonuses, deductions and payslips."
      endpoint={ENDPOINTS.payrollRuns}
      icon="payments"
      actions={({ reload }) => (
        <form className="platform-inline-form" onSubmit={event => createRun(event, reload)}>
          <input name="period" placeholder="2026-05" required />
          <input name="notes" placeholder="Коментар" />
          <button className="btn btn-primary" disabled={busy} type="submit">Створити run</button>
        </form>
      )}
      renderItem={(item, { reload }) => (
        <PlatformCard key={item.id} icon="payments" title={item.period} meta={item.status}>
          <p>{item.notes || 'Payroll preview готовий до фіналізації.'}</p>
          {item.status !== 'finalized' ? (
            <button className="btn btn-outline" onClick={() => finalize(item.id, reload)} type="button">Finalize</button>
          ) : null}
        </PlatformCard>
      )}
    />
  );
}
