import Head from 'next/head';
import { Ticket, Bus, CalendarClock, Radio, ClipboardCheck, LayoutDashboard, RotateCcw, Users, MapPinned } from 'lucide-react';
import Shell from './Shell.jsx';
import { ROLE_ADMIN } from '../lib/roles.js';

const LINKS = [
  { href: '/admin', label: 'Overview', exact: true, icon: LayoutDashboard },
  { href: '/admin/operators', label: 'Operators', icon: Users },
  { href: '/admin/approvals', label: 'Route approvals', icon: ClipboardCheck },
  { href: '/admin/fleet', label: 'Fleet playground', icon: Radio },
  { href: '/admin/live-map', label: 'Live map', icon: MapPinned },
  { href: '/admin/buses', label: 'Buses', icon: Bus },
  { href: '/admin/trips', label: 'Trips', icon: CalendarClock },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { href: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
];

export default function AdminShell({ title, subtitle, actions, children }) {
  return (
    <Shell role={ROLE_ADMIN} title="Administration" links={LINKS}>
      <Head><title>{title} · Admin · Bookify</title></Head>
      <div className="dash-head"><div className="stack-s"><h1 className="dash-title">{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions && <div className="dash-actions">{actions}</div>}</div>
      {children}
    </Shell>
  );
}
