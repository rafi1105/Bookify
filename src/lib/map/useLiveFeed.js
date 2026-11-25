import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '../supabaseBrowser.js';
import { api } from '../api.js';

// Live map feed: server-sent events read with fetch, so the sign-in token travels in a header.
// Falls back to polling the snapshot every 15 s if streaming keeps failing (some proxies buffer it).
export function useLiveFeed({ onFixes } = {}) {
  const [state, setState] = useState({ data: null, error: null, mode: 'connecting', updatedAt: null });
  const fixesRef = useRef(onFixes);
  fixesRef.current = onFixes;
  const stop = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/tracking/snapshot');
      setState((s) => ({ ...s, data, error: null, updatedAt: new Date() }));
    } catch (error) { setState((s) => ({ ...s, error })); }
  }, []);

  useEffect(() => {
    stop.current = false;
    let failures = 0;
    let controller = null;
    let pollTimer = null;

    async function poll() {
      setState((s) => ({ ...s, mode: 'polling' }));
      while (!stop.current) {
        await refresh();
        await new Promise((r) => { pollTimer = setTimeout(r, 15000); });
      }
    }

    async function connect() {
      while (!stop.current) {
        controller = new AbortController();
        try {
          const { data } = (await supabaseBrowser()?.auth.getSession()) || { data: {} };
          const headers = { Accept: 'text/event-stream' };
          if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
          const res = await fetch('/api/tracking/stream', { headers, signal: controller.signal, cache: 'no-store' });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const error = Object.assign(new Error(body.error || 'The live map could not load'), { status: res.status });
            if (res.status === 401 || res.status === 403 || res.status === 503) { setState((s) => ({ ...s, error, mode: 'error' })); return; }
            throw error;
          }
          setState((s) => ({ ...s, mode: 'live' }));
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let gotEvent = false;
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
              let event = 'message'; let payload = '';
              for (const line of chunk.split('\n')) {
                if (line.startsWith('event: ')) event = line.slice(7);
                else if (line.startsWith('data: ')) payload += line.slice(6);
              }
              if (!payload) continue;
              gotEvent = true;
              const msg = JSON.parse(payload);
              if (event === 'snapshot') setState((s) => ({ ...s, data: msg, error: null, updatedAt: new Date() }));
              else if (event === 'fixes') fixesRef.current?.(msg);
              else if (event === 'failure') setState((s) => ({ ...s, error: new Error(msg.error) }));
            }
          }
          failures = gotEvent ? 0 : failures + 1;
        } catch {
          if (stop.current) return;
          failures += 1;
          if (failures >= 3) { poll(); return; }
        }
        if (failures >= 3) { poll(); return; }
        if (failures) setState((s) => ({ ...s, mode: 'connecting' }));
        await new Promise((r) => setTimeout(r, failures ? 2000 * failures : 300));
      }
    }
    connect();
    return () => { stop.current = true; controller?.abort(); clearTimeout(pollTimer); };
  }, [refresh]);

  return { ...state, refresh };
}
