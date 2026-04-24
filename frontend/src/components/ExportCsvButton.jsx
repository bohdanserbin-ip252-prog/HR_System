import { downloadCsv } from '../exportUtils.js';

export default function ExportCsvButton({ columns, filename, rows }) {
  return (
    <button
      className="btn btn-outline"
      disabled={!rows?.length}
      onClick={() => downloadCsv(filename, rows, columns)}
      type="button"
    >
      <span className="material-symbols-outlined" aria-hidden="true">download</span>
      Експорт CSV
    </button>
  );
}
