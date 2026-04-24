import { useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import PlatformCard from './platform/PlatformCard.jsx';
import PlatformListPage from './platform/PlatformListPage.jsx';

export default function WorkflowsPage() {
  const [busy, setBusy] = useState(false);

  async function startWorkflow(event, reload) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      await fetchJSON(ENDPOINTS.workflowsStart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entity_id: Number(form.entity_id) || undefined })
      });
      event.currentTarget.reset();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformListPage
      title="Workflow Builder"
      description="Predefined workflows for time-off, HR cases and payroll finalization."
      endpoint={ENDPOINTS.workflows}
      icon="account_tree"
      actions={({ reload }) => (
        <form className="platform-inline-form" onSubmit={event => startWorkflow(event, reload)}>
          <input name="workflow_key" defaultValue="payroll_finalization" />
          <input name="entity_type" defaultValue="payroll_run" />
          <input name="entity_id" placeholder="Entity ID" type="number" />
          <button className="btn btn-primary" disabled={busy} type="submit">Start</button>
        </form>
      )}
      renderItem={item => (
        <PlatformCard key={item.id} icon="route" title={item.workflowKey} meta={item.status}>
          <p>{item.entityType}</p>
        </PlatformCard>
      )}
    />
  );
}
