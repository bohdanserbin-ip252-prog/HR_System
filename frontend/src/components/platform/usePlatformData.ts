import { useCallback, useEffect, useState } from 'react';
import { fetchJSON } from '../../api.ts';

export function usePlatformData(endpoint, { enabled = true } = {}) {
  const [state, setState] = useState({ status: 'idle', items: [], data: null, error: '' });

  const load = useCallback(async () => {
    if (!enabled) return;
    setState(current => ({ ...current, status: 'loading', error: '' }));
    try {
      const data = await fetchJSON(endpoint);
      setState({
        status: 'ready',
        items: Array.isArray(data) ? data : [],
        data,
        error: ''
      });
    } catch (error) {
      setState({ status: 'error', items: [], data: null, error: error.message || 'Помилка завантаження' });
    }
  }, [enabled, endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
