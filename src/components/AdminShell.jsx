import Head from 'next/head';
import Shell from './Shell.jsx';
import { ROLE_ADMIN } from '../lib/roles.js';

const LINKS = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/operators', label: 'Operators' },
  { href: '/admin/approvals', label: 'Route approvals' },
  { href: '/admin/fleet', label: 'Fleet' },
  { href: '/admin/trips', label: 'Trips' },
  { href: '/admin/refunds', label: 'Refunds' },
];

export default function AdminShell({ title, subtitle, actions, children }) {
  return (
    <Shell role={ROLE_ADMIN} title="Administration" links={LINKS}>
      <Head><title>{title} · Admin · Bookify</title></Head>
      <div className="row-between"><div className="stack-s"><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions}</div>
      {children}
    </Shell>
  );
}
