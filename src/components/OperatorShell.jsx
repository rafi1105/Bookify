import Head from 'next/head';
import Shell from './Shell.jsx';
import { Alert } from './ui.jsx';
import { ROLE_VENDOR } from '../lib/roles.js';
import { useApi } from '../lib/useApi.js';

const LINKS = [
  { href: '/operator', label: 'Overview', exact: true },
  { href: '/operator/playground', label: 'Fleet playground' },
  { href: '/operator/buses', label: 'Buses' },
  { href: '/operator/routes', label: 'Routes and fares' },
  { href: '/operator/trips', label: 'Trips' },
  { href: '/operator/reports', label: 'Sales reports' },
];

function Banner() {
  const { data } = useApi('/api/operator/me');
  if (data && data.status !== 'ACTIVE') return <Alert kind="error">Your operator account is suspended. Existing tickets stay valid; new sales are closed. Contact support.</Alert>;
  return null;
}

export default function OperatorShell({ title, subtitle, actions, children }) {
  return (
    <Shell role={ROLE_VENDOR} title="Operator" links={LINKS}>
      <Head><title>{title} · Operator · Bookify</title></Head>
      <div className="row-between"><div className="stack-s"><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions}</div>
      <Banner />
      {children}
    </Shell>
  );
}
