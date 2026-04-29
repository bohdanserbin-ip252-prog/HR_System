import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import { formatDate } from '../uiUtils.ts';
import PageStateBoundary from './PageStateBoundary.tsx';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [docs, setDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setDocs([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.documents, { signal });
        if (!signal.aborted) setDocs(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження документів');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  async function handleUpload(file, title) {
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      await fetchJSON(ENDPOINTS.documents, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name,
          filename: file.name,
          document_type: 'general',
          mime_type: file.type || 'application/octet-stream',
          content_base64: content
        })
      });
      const data = await fetchJSON(ENDPOINTS.documents);
      setDocs(Array.isArray(data) ? data : []);
    } catch (error) {
      failWithError(error, 'Помилка завантаження файлу');
    }
  }

  async function handleDelete(id) {
    try {
      await fetchJSON(ENDPOINTS.documentById(id), { method: 'DELETE' });
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      failWithError(error, 'Помилка видалення');
    }
  }

  async function handleDownload(id, filename) {
    try {
      const data = await fetchJSON(ENDPOINTS.documentDownloadById(id));
      const blob = new Blob([Uint8Array.from(atob(data.contentBase64), c => c.charCodeAt(0))], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      failWithError(error, 'Помилка завантаження');
    }
  }

  const loadingState = isLoading && !docs.length ? { icon: 'hourglass_top', title: 'Завантаження документів', description: 'Отримуємо список файлів...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !docs.length ? { icon: 'folder_open', title: 'Документів немає', description: 'Завантажте перший файл.' } : null;

  return (
    <>
      <div className="page-header">
        <h1>HR Документи</h1>
        <p>Контракти, сертифікати, накази та матеріали.</p>
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      {isAdmin && (
        <div
          className={`card card-padded${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file, file.name);
          }}
          style={{ marginBottom: '1.5rem', borderStyle: dragOver ? 'dashed' : 'solid', borderColor: dragOver ? 'var(--primary)' : undefined }}
        >
          <h3 style={{ marginBottom: '12px' }}><span className="material-symbols-outlined">cloud_upload</span> Завантаження</h3>
          <input
            type="file"
            id="doc-upload"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files[0];
              if (file) handleUpload(file, file.name);
              e.target.value = '';
            }}
          />
          <label htmlFor="doc-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
            Обрати файл
          </label>
          <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
            Або перетягніть файл сюди. Підтримуються PDF, PNG, JPEG, TXT (до 5 MB).
          </p>
        </div>
      )}

      <div className="platform-grid">
        {docs.map(doc => (
          <div className="card platform-card" key={doc.id}>
            <div className="platform-card__head">
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>description</span>
              <div>
                <h3>{doc.title}</h3>
                <p>{doc.filename} · {doc.documentType} · {doc.mimeType}</p>
              </div>
            </div>
            <div className="platform-card__body">
              <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                Створено: {formatDate(doc.createdAt)}
                {doc.expiresAt && <span> · Дійсно до: {formatDate(doc.expiresAt)}</span>}
              </div>
              <div className="platform-actions">
                <button className="btn btn-outline" onClick={() => handleDownload(doc.id, doc.filename)} type="button">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span> Завантажити
                </button>
                {isAdmin && (
                  <button className="btn btn-secondary" onClick={() => handleDelete(doc.id)} type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span> Видалити
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageStateBoundary>
    </>
  );
}
