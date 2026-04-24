import { useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import PlatformCard from './platform/PlatformCard.jsx';

export default function ImportPage() {
  const [kind, setKind] = useState('departments');
  const [csv, setCsv] = useState('name,description\nQA,Quality team');
  const [preview, setPreview] = useState(null);

  async function runPreview() {
    const data = await fetchJSON(ENDPOINTS.importPreview(kind), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    });
    setPreview(data);
  }

  async function commit() {
    const data = await fetchJSON(ENDPOINTS.importCommit(kind), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    });
    setPreview(data);
  }

  return (
    <>
      <div className="page-header">
        <h1>Data Import</h1>
        <p>CSV preview and commit for HR operational data.</p>
      </div>
      <div className="platform-grid">
        <PlatformCard icon="upload_file" title="CSV Preview" meta={kind}>
          <select className="form-input" value={kind} onChange={event => setKind(event.target.value)}>
            {['employees', 'departments', 'positions', 'payroll_adjustments', 'training_assignments', 'shifts'].map(item => <option key={item}>{item}</option>)}
          </select>
          <textarea className="form-input" rows="8" value={csv} onChange={event => setCsv(event.target.value)} />
          <div className="platform-actions">
            <button className="btn btn-primary" onClick={runPreview} type="button">Preview</button>
            <button className="btn btn-outline" onClick={commit} type="button">Commit valid rows</button>
          </div>
          <p>{preview ? `${preview.validRows?.length ?? preview.committedRows ?? 0} row(s)` : 'Paste CSV to preview.'}</p>
        </PlatformCard>
      </div>
    </>
  );
}
