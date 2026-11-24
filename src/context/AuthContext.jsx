import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser, authConfigured } from '../lib/supabaseBrowser.js';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, session: null, profile: null });

  const loadProfile = useCallback(async (session) => {
    if (!session) return setState({ loading: false, session: null, profile: null });
    try {
      const profile = await api('/api/me');
      setState({ loading: false, session, profile });
    } catch {
      setState({ loading: false, session, profile: null });
    }
  }, []);

  useEffect(() => {
    const client = supabaseBrowser();
    if (!client) return setState({ loading: false, session: null, profile: null });
    let active = true;
    client.auth.getSession().then(({ data }) => active && loadProfile(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      // Defer: do not call Supabase from inside the auth callback.
      setTimeout(() => active && loadProfile(session), 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo(() => ({
    ...state,
    configured: authConfigured(),
    refresh: () => loadProfile(state.session),
    signOut: async () => { await supabaseBrowser()?.auth.signOut(); },
  }), [state, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
