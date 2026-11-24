import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export const LIVE_INTERVAL_MS = 60000;

// Like useApi, but keeps the data on screen and refreshes it every minute (and when the tab
// becomes visible or the window regains focus). `updatedAt` is when the last answer arrived.
export function useLive(path, { interval = LIVE_INTERVAL_MS } = {}) {
  const [state, setState] = useState({ loading: Boolean(path), error: null, data: null, updatedAt: null });
  const seq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    if (!path) return;
    const id = ++seq.current;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path);
      if (id === seq.current) setState({ loading: false, error: null, data, updatedAt: new Date() });
    } catch (error) {
      if (id === seq.current) setState((s) => (quiet && s.data ? s : { loading: false, error, data: null, updatedAt: null }));
    }
  }, [path]);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && load(true);
    const timer = setInterval(refresh, interval);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [load, interval]);

  return { ...state, reload: () => load(false), refresh: () => load(true) };
}
