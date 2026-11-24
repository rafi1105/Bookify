import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import AuthCard from '../src/components/AuthCard.jsx';
import { Alert, Button, Field } from '../src/components/ui.jsx';
import { supabaseBrowser } from '../src/lib/supabaseBrowser.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const client = supabaseBrowser();
    const { error: failure } = client
      ? await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
      : { error: { message: 'Password reset is not configured.' } };
    setBusy(false);
    if (failure) setError(failure.message); else setDone(true);
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your e-mail and we will send you a reset link."
      footer={<Link href="/sign-in">Back to sign in</Link>}>
      <Head><title>Reset password · Bookify</title></Head>
      {error && <Alert kind="error">{error}</Alert>}
      {done ? <Alert kind="ok">If an account exists for {email.trim()}, a reset link is on its way.</Alert> : (
        <form className="stack" onSubmit={submit}>
          <Field label="E-mail" id="email">
            <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="large" block loading={busy} disabled={!email}>Send reset link</Button>
        </form>
      )}
    </AuthCard>
  );
}
