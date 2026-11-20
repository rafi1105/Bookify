import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Bus, Shield, Ticket, X } from 'lucide-react';
import { api } from '../lib/bookifyApi';

const DemoSession = createContext(null);
const roles = [
  { id: 'passenger', label: 'Passenger', detail: 'Book a seat and manage tickets', Icon: Ticket },
  { id: 'vendor', label: 'Vendor', detail: 'Manage buses, routes and departures', Icon: Bus },
  { id: 'admin', label: 'Admin', detail: 'Approve routes and review operations', Icon: Shield },
];

export function DemoSessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState('');
  const [vendor, setVendor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const destination = useRef(null);
  const dialog = useRef(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api('/session').then((data) => {
      if (!active) return;
      setSession(data.user);
      setVendors(data.vendors);
    }).catch((problem) => { if (active) setSessionError(problem.message); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  function openLogin(options = {}) {
    destination.current = options.destination || null;
    setSelected(options.role || '');
    setVendor('');
    setError('');
    if (!dialog.current.open) dialog.current.showModal();
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/session', { role: selected, vendor });
      setSession(user);
      setSessionError('');
      dialog.current.close();
      await router.push(user.role === 'passenger' ? destination.current || '/my-bookings' : '/workspace');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setSessionError('');
    try {
      await api('/session', {}, 'DELETE');
      setSession(null);
      openLogin();
    } catch (problem) {
      setSessionError(problem.message);
    }
  }

  return <DemoSession.Provider value={{ user: session, ready, openLogin, signOut, sessionError }}>
    {children}
    <dialog ref={dialog} className="demo-dialog" aria-labelledby="demo-dialog-title"
      onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <form className="demo-dialog-form" onSubmit={signIn}>
        <header className="demo-dialog-header">
          <div><h2 id="demo-dialog-title">Sign in to Bookify</h2><p>Choose a demo role.</p></div>
          <button type="button" className="site-icon" aria-label="Close sign-in" disabled={busy}
            onClick={() => dialog.current.close()}><X size={20} /></button>
        </header>
        <fieldset className="demo-role-options">
          <legend className="demo-sr-only">Demo role</legend>
          {roles.map(({ id, label, detail, Icon }) => <label className="demo-role" key={id}>
            <input type="radio" name="demo-role" required checked={selected === id} onChange={() => setSelected(id)} />
            <Icon size={19} aria-hidden="true" />
            <span><strong>{label}</strong><small>{detail}</small></span>
          </label>)}
        </fieldset>
        {selected === 'vendor' && <label className="demo-vendor">Demo vendor
          <select value={vendor} required onChange={(event) => setVendor(event.target.value)}>
            <option value="">Select a vendor</option>
            {vendors.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>}
        {error && <p role="alert" className="demo-error">{error}</p>}
        <button className="site-primary" disabled={busy || !selected || (selected === 'vendor' && !vendor)}>
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </dialog>
  </DemoSession.Provider>;
}

export function useDemoSession() {
  return useContext(DemoSession);
}
