import Head from 'next/head';
import { useEffect, useState } from 'react';
import RequireAuth from '../../src/components/RequireAuth.jsx';
import { Alert, Button, Field, PageHeader } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/context/AuthContext.jsx';
import { api } from '../../src/lib/api.js';
import { normalizePhone } from '../../src/lib/validate.js';

function Profile() {
  const { profile, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile) setForm({ name: profile.name || '', phone: profile.phone || '' }); }, [profile]);

  async function save(event) {
    event.preventDefault();
    if (!normalizePhone(form.phone)) return setStatus({ kind: 'error', message: 'Enter a valid Bangladeshi mobile number.' });
    setBusy(true);
    setStatus(null);
    try {
      await api('/api/me', { method: 'PATCH', body: form });
      await refresh();
      setStatus({ kind: 'ok', message: 'Profile saved.' });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    }
    setBusy(false);
  }

  return (
    <>
      <Head><title>Profile · Bookify</title></Head>
      <PageHeader title="Your profile" subtitle="These details pre-fill your bookings." />
      <div className="container narrow">
        <form className="card card-pad stack" onSubmit={save}>
          {status && <Alert kind={status.kind}>{status.message}</Alert>}
          <Field label="Full name" id="name">
            <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Mobile number" id="phone">
            <input id="phone" className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="E-mail" id="email" hint="Your e-mail is your sign-in and cannot be changed here.">
            <input id="email" className="input" value={profile?.email || ''} disabled />
          </Field>
          <div><Button type="submit" loading={busy}>Save changes</Button></div>
        </form>
      </div>
    </>
  );
}

export default function AccountPage() {
  return <RequireAuth><Profile /></RequireAuth>;
}
