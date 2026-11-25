import Head from 'next/head';
import { BarChart3, Ticket, Bus, CalendarClock, LayoutDashboard, Radio, Route as RouteIcon, MapPinned } from 'lucide-react';
import Shell from './Shell.jsx';
import { Alert } from './ui.jsx';
import { ROLE_VENDOR } from '../lib/roles.js';
import { useApi } from '../lib/useApi.js';

const LINKS = [
  { href: '/operator', label: 'Overview', exact: true, icon: LayoutDashboard },
  { href: '/operator/playground', label: 'Fleet playground', icon: Radio },
  { href: '/operator/live-map', label: 'Live map', icon: MapPinned },
  { href: '/operator/buses', label: 'Buses', icon: Bus },
  { href: '/operator/routes', label: 'Routes and fares', icon: RouteIcon },
  { href: '/operator/trips', label: 'Trips', icon: CalendarClock },
  { href: '/operator/bookings', label: 'Bookings', icon: Ticket },
  { href: '/operator/reports', label: 'Sales reports', icon: BarChart3 },
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
      <div className="dash-head"><div className="stack-s"><h1 className="dash-title">{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions && <div className="dash-actions">{actions}</div>}</div>
      <Banner />
      {children}
    </Shell>
  );
}
