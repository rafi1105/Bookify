import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Bus, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_ADMIN, ROLE_VENDOR } from '../lib/roles.js';
import ThemeToggle from './ThemeToggle.jsx';

const NAV = [
  { href: '/', label: 'Book a ticket' },
  { href: '/routes', label: 'Routes' },
  { href: '/manage-booking', label: 'Manage booking' },
  { href: '/help', label: 'Help' },
];

export default function Header() {
  const { pathname, asPath } = useRouter();
  const { loading, profile, session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => { setOpen(false); setMenu(false); }, [asPath]);

  const active = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const initials = (profile?.name || session?.user?.email || '?').trim().slice(0, 1).toUpperCase();

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand" aria-label="Bookify home">
          <span className="brand-mark"><Bus size={18} aria-hidden="true" /></span>
          Bookify
        </Link>
        <nav className="nav" data-open={open} aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}>{item.label}</Link>
          ))}
          {!session && !loading && <Link href="/operator/register" aria-current={active('/operator') ? 'page' : undefined}>For operators</Link>}
          {profile?.role_id === ROLE_VENDOR && <Link href="/operator" aria-current={active('/operator') ? 'page' : undefined}>Operator dashboard</Link>}
          {profile?.role_id === ROLE_ADMIN && <Link href="/admin" aria-current={active('/admin') ? 'page' : undefined}>Admin dashboard</Link>}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {loading ? null : session ? (
            <div className="user-menu">
              <button className="btn btn-ghost" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <span className="avatar" aria-hidden="true">{initials}</span>
                <span className="user-name">{profile?.name || 'Account'}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {menu && (
                <div className="user-menu-list" role="menu">
                  {profile?.role_id === ROLE_VENDOR && <Link href="/operator" role="menuitem">Operator dashboard</Link>}
                  {profile?.role_id === ROLE_ADMIN && <Link href="/admin" role="menuitem">Admin dashboard</Link>}
                  <Link href="/account/bookings" role="menuitem">My bookings</Link>
                  <Link href="/account" role="menuitem">Profile</Link>
                  <button role="menuitem" onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href={`/sign-in?next=${encodeURIComponent(asPath)}`} className="btn btn-ghost">Sign in</Link>
              <Link href="/sign-up" className="btn btn-primary">Create account</Link>
            </>
          )}
          <button className="btn btn-ghost menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
