import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthCard from '../src/components/AuthCard.jsx';
import { Alert, Button, Field, PasswordInput } from '../src/components/ui.jsx';
import { useAuth } from '../src/context/AuthContext.jsx';
import { supabaseBrowser } from '../src/lib/supabaseBrowser.js';

function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function SignIn() {
  const router = useRouter();
  const { session, loading, profile, configured } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(router.query.next);

  useEffect(() => {
    if (loading || !session || !profile) return;
    // Without an explicit destination, operators and admins land on their dashboards.
    const explicit = typeof router.query.next === 'string';
    router.replace(explicit ? next : profile.role_id === 3 ? '/admin' : profile.role_id === 2 ? '/operator' : '/');
  }, [loading, session, profile, next, router]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const { error: failure } = await supabaseBrowser().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (failure) {
      setError(/confirm/i.test(failure.message)
        ? 'Please confirm your e-mail address first. Check your inbox for the link we sent.'
        : 'That e-mail and password do not match.');
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back. Sign in to see your tickets and book faster."
      footer={<>New to Bookify? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link><br />Bus company? <Link href="/operator/register">Register as an operator</Link> · Operators and admins sign in here with their own e-mail and password.</>}
    >
      <Head><title>Sign in · Bookify</title></Head>
      {!configured && <Alert kind="error">Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="E-mail" id="email">
          <input id="email" className="input" type="email" autoComplete="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" autoComplete="current-password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Button type="submit" size="large" block loading={busy} disabled={!configured || !form.email || !form.password}>Sign in</Button>
      </form>
      <Link href="/forgot-password" className="small">Forgot your password?</Link>
    </AuthCard>
  );
}
