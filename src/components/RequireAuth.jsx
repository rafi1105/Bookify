import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, Loading } from './ui.jsx';
import { ShieldAlert } from 'lucide-react';

// Gate a page by sign-in and optionally by role. The server re-checks every request.
export default function RequireAuth({ role, children }) {
  const router = useRouter();
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (!loading && !session) router.replace(`/sign-in?next=${encodeURIComponent(router.asPath)}`);
  }, [loading, session, router]);

  if (loading || !session) return <Loading label="Checking your session" />;
  if (!profile) return <Loading label="Loading your account" />;
  if (role && profile.role_id !== role) {
    return <EmptyState icon={ShieldAlert} title="You do not have access to this page">This area is for {role === 3 ? 'administrators' : 'bus operators'}.</EmptyState>;
  }
  return children;
}
