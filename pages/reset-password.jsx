import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import AuthCard from '../src/components/AuthCard.jsx';
import { Alert, Button, Field, PasswordInput } from '../src/components/ui.jsx';
import { useAuth } from '../src/context/AuthContext.jsx';
import { supabaseBrowser } from '../src/lib/supabaseBrowser.js';

export default function ResetPassword() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters');
    setBusy(true);
    setError('');
    const { error: failure } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (failure) setError(failure.message); else router.replace('/account');
  }

  return (
    <AuthCard title="Choose a new password">
      <Head><title>New password · Bookify</title></Head>
      {!loading && !session ? (
        <>
          <Alert kind="warn">This reset link is invalid or has expired.</Alert>
          <Link href="/forgot-password" className="btn btn-secondary">Request a new link</Link>
        </>
      ) : (
        <form className="stack" onSubmit={submit}>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="New password" id="password" hint="At least 8 characters">
            <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="large" block loading={busy} disabled={loading}>Save password</Button>
        </form>
      )}
    </AuthCard>
  );
}
