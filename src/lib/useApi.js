import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Load data with explicit loading / error / data states. Pass null to skip.
export function useApi(path, { auth = true } = {}) {
  const [state, setState] = useState({ loading: Boolean(path), error: null, data: null });
  const counter = useRef(0);

  const load = useCallback(async () => {
    if (!path) return setState({ loading: false, error: null, data: null });
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path, { auth });
      if (id === counter.current) setState({ loading: false, error: null, data });
    } catch (error) {
      if (id === counter.current) setState({ loading: false, error, data: null });
    }
  }, [path, auth]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
