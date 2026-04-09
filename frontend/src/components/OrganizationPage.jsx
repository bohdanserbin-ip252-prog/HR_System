import { useState } from 'react';
import { API, fetchJSON } from '../api.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import PageStateBoundary from './PageStateBoundary.jsx';

export default function OrganizationPage({
    endpoint,
    title,
    description,
    addButtonLabel,
    addButtonIcon = 'add',
    cardIcon,
    emptyState,
    loadingState,
    errorTitle,
    currentUser,
    isActive,
    refreshKey = 0,
    onAdd,
    onEdit,
    onDelete,
    getItemTitle,
    getItemDescription,
    getDeleteLabel,
    renderMeta
}) {
    const { handleUnauthorized } = useAppActions();
    const [records, setRecords] = useState([]);
    const {
        errorMessage,
        failWithError,
        finishLoading,
        isLoading,
        resetAsyncStatus,
        startLoading
    } = useAsyncStatus();

    const isAdmin = currentUser?.role === 'admin';

    useAbortableLoadEffect({
        enabled: Boolean(currentUser && isActive),
        deps: [currentUser, endpoint, handleUnauthorized, isActive, refreshKey, title],
        onDisabled: () => {
            if (!currentUser) {
                setRecords([]);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const data = await fetchJSON(`${API}${endpoint}`, { signal });
                if (!signal.aborted) {
                    setRecords(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }
                setRecords([]);
                failWithError(error, `Помилка завантаження сторінки "${title}"`);
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });

    return (
        <>
            <div className="page-header">
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '24px' }}>
                {isAdmin ? (
                    <button className="btn btn-primary" onClick={onAdd} type="button">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{addButtonIcon}</span>
                        {' '}
                        {addButtonLabel}
                    </button>
                ) : null}
            </div>
            <PageStateBoundary
                loading={isLoading && records.length === 0 ? loadingState : null}
                error={!isLoading && errorMessage ? {
                    icon: 'error',
                    title: errorTitle,
                    description: errorMessage
                } : null}
                empty={!isLoading && !errorMessage && records.length === 0 ? emptyState : null}
            >
                {records.length > 0 ? (
                    <div className="grid-cards">
                    {records.map(record => (
                        <div key={record.id} className="grid-card">
                            <div className="grid-card-header">
                                <h3>
                                    <span className="material-symbols-outlined">{cardIcon}</span>
                                    {' '}
                                    {getItemTitle(record)}
                                </h3>
                                {isAdmin ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="btn-icon" onClick={() => onEdit(record.id)} title="Редагувати" type="button">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => onDelete(record.id, getDeleteLabel(record))}
                                            title="Видалити"
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            <p className="desc">{getItemDescription(record)}</p>
                            <div className="meta-row">
                                {renderMeta(record)}
                            </div>
                        </div>
                    ))}
                </div>
                ) : null}
            </PageStateBoundary>
        </>
    );
}
