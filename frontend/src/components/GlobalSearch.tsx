import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';

const DEBOUNCE_MS = 300;

function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

export default function GlobalSearch() {
    const { navigateTo, openProfile } = useAppActions();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const performSearch = useCallback(async (q) => {
        if (!q.trim()) {
            setResults(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchJSON(ENDPOINTS.search({ q, entity: 'employees', limit: 5 }));
            setResults(data || {});
        } catch {
            setResults({});
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleResultClick(result, entity) {
        setIsOpen(false);
        setQuery('');
        setResults(null);
        if (entity === 'employees' && result.id != null) {
            openProfile(result.id);
        } else if (entity === 'complaints' && result.employee_id != null) {
            openProfile(result.employee_id);
        } else {
            navigateTo(entity);
        }
    }

    const employees = Array.isArray(results?.employees) ? results.employees : [];
    const complaints = Array.isArray(results?.complaints) ? results.complaints : [];
    const hasResults = employees.length > 0 || complaints.length > 0;

    return (
        <div ref={containerRef} className="global-search">
            <div className="global-search-inner">
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Пошук..."
                    aria-label="Глобальний пошук"
                />
                {query && (
                    <button
                        className="global-search-clear"
                        onClick={() => {
                            setQuery('');
                            setResults(null);
                            inputRef.current?.focus();
                        }}
                        type="button"
                        aria-label="Очистити"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                )}
            </div>
            {isOpen && debouncedQuery.trim() && (
                <div className="global-search-dropdown">
                    {isLoading ? (
                        <div className="global-search-empty">Пошук...</div>
                    ) : !hasResults ? (
                        <div className="global-search-empty">Нічого не знайдено</div>
                    ) : (
                        <>
                            {employees.length > 0 && (
                                <div className="global-search-group">
                                    <div className="global-search-group-title">Працівники</div>
                                    {employees.map(item => (
                                        <button
                                            key={`emp-${item.id}`}
                                            className="global-search-item"
                                            onClick={() => handleResultClick(item, 'employees')}
                                            type="button"
                                        >
                                            <span className="global-search-item-name">
                                                {item.last_name} {item.first_name}
                                            </span>
                                            <span className="global-search-item-meta">
                                                {item.position || item.department || ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {complaints.length > 0 && (
                                <div className="global-search-group">
                                    <div className="global-search-group-title">Скарги</div>
                                    {complaints.map(item => (
                                        <button
                                            key={`cmp-${item.id}`}
                                            className="global-search-item"
                                            onClick={() => handleResultClick(item, 'complaints')}
                                            type="button"
                                        >
                                            <span className="global-search-item-name">
                                                {item.title || 'Скарга'}
                                            </span>
                                            <span className="global-search-item-meta">
                                                {item.employee_name || ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
