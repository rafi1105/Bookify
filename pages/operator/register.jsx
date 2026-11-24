import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import AuthCard from '../../src/components/AuthCard.jsx';
import { Alert, Button, Field } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { supabaseBrowser } from '../../src/lib/supabaseBrowser.js';

export default function RegisterOperator() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/operator/register', { method: 'POST', body: form, auth: false });
      const { error: failure } = await supabaseBrowser().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (failure) throw new Error('Your account was created. Please sign in to continue.');
      router.push('/operator');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Register your bus company" subtitle="Just your company name, e-mail and a password. You can start straight away."
      footer={<>Already registered? <Link href="/sign-in?next=/operator">Sign in</Link> · Have a passenger account? <Link href="/operator/apply">Upgrade it</Link></>}>
      <Head><title>Register as an operator · Bookify</title></Head>
      {error && <Alert kind="error">{error}</Alert>}
      <form className="stack" onSubmit={submit}>
        <Field label="Company name" id="company"><input id="company" required className="input" autoComplete="organization" value={form.companyName} onChange={set('companyName')} /></Field>
        <Field label="E-mail" id="email"><input id="email" required type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" id="password" hint="At least 8 characters"><input id="password" required type="password" className="input" autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <Button type="submit" size="large" block loading={busy} disabled={!form.companyName || !form.email || form.password.length < 8}>Create operator account</Button>
      </form>
    </AuthCard>
  );
}
