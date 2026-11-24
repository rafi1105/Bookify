import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthCard from '../src/components/AuthCard.jsx';
import { Alert, Button, Field } from '../src/components/ui.jsx';
import { useAuth } from '../src/context/AuthContext.jsx';
import { supabaseBrowser } from '../src/lib/supabaseBrowser.js';
import { EMAIL_RE, normalizePhone } from '../src/lib/validate.js';

export default function SignUp() {
  const router = useRouter();
  const { session, loading, configured } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', accept: false });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = typeof router.query.next === 'string' && router.query.next.startsWith('/') && !router.query.next.startsWith('//') ? router.query.next : '/';

  useEffect(() => { if (!loading && session) router.replace(next); }, [loading, session, next, router]);

  async function submit(event) {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name';
    if (!normalizePhone(form.phone)) found.phone = 'Enter a Bangladeshi mobile number, e.g. 01712345678';
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Enter a valid e-mail address';
    if (form.password.length < 8) found.password = 'Use at least 8 characters';
    if (!form.accept) found.accept = 'Please accept the terms to continue';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFailure('');
    const { data, error } = await supabaseBrowser().auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { name: form.name.trim(), phone: normalizePhone(form.phone) },
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    });
    setBusy(false);
    if (error) return setFailure(error.message);
    if (!data.session) setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`We sent a confirmation link to ${form.email.trim()}.`}>
        <Head><title>Confirm your e-mail · Bookify</title></Head>
        <Alert kind="info">Open the link to activate your account, then sign in. It can take a minute to arrive; check spam too.</Alert>
        <Link href="/sign-in" className="btn btn-secondary">Go to sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="Keep your tickets in one place and check out in seconds."
      footer={<>Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link> · Bus company? <Link href="/operator/register">Register as an operator</Link></>}>
      <Head><title>Create account · Bookify</title></Head>
      {!configured && <Alert kind="error">Sign-up is not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.</Alert>}
      {failure && <Alert kind="error">{failure}</Alert>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Full name" id="name" error={errors.name}>
          <input id="name" className="input" autoComplete="name" value={form.name} aria-invalid={Boolean(errors.name)}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Mobile number" id="phone" error={errors.phone} hint="Used for ticket SMS and boarding contact">
          <input id="phone" className="input" type="tel" autoComplete="tel" inputMode="numeric" value={form.phone} aria-invalid={Boolean(errors.phone)}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="E-mail" id="email" error={errors.email}>
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} aria-invalid={Boolean(errors.email)}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" id="password" error={errors.password} hint="At least 8 characters">
          <input id="password" className="input" type="password" autoComplete="new-password" value={form.password} aria-invalid={Boolean(errors.password)}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="stack-s">
          <label className="checkbox">
            <input type="checkbox" checked={form.accept} onChange={(e) => setForm({ ...form, accept: e.target.checked })} />
            <span>I agree to the <Link href="/policies/terms">Terms of use</Link>, <Link href="/policies/privacy">Privacy policy</Link> and <Link href="/policies/refunds">Refund policy</Link>.</span>
          </label>
          {errors.accept && <span className="field-error" role="alert">{errors.accept}</span>}
        </div>
        <Button type="submit" size="large" block loading={busy} disabled={!configured}>Create account</Button>
      </form>
    </AuthCard>
  );
}
