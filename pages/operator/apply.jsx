import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthCard from '../../src/components/AuthCard.jsx';
import RequireAuth from '../../src/components/RequireAuth.jsx';
import { Alert, Button, Field } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/context/AuthContext.jsx';
import { api } from '../../src/lib/api.js';

function Form() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile?.role_id === 2) router.replace('/operator'); }, [profile, router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/operator/apply', { method: 'POST', body: { companyName: company } });
      await refresh();
      router.push('/operator');
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <AuthCard title="Become an operator" subtitle="Turn this account into a bus company account. No approval is needed.">
      <Head><title>Become an operator · Bookify</title></Head>
      {error && <Alert kind="error">{error}</Alert>}
      <form className="stack" onSubmit={submit}>
        <Field label="Company name" id="company"><input id="company" required className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
        <Button type="submit" size="large" block loading={busy} disabled={company.trim().length < 2}>Continue as operator</Button>
      </form>
    </AuthCard>
  );
}

export default function Apply() {
  return <RequireAuth><Form /></RequireAuth>;
}
