import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, Moon, Sun, X } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useDemoSession } from '../context/DemoSessionContext';

export default function Navbar() {
  const { asPath, pathname } = useRouter();
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === asPath;
  const { theme, toggleTheme } = useTheme();
  const { user, ready, openLogin, signOut, sessionError } = useDemoSession();
  const links = [['Find buses', '/search'], ['My bookings', '/my-bookings'], ['Help', '/contact']];
  if (user?.role === 'vendor' || user?.role === 'admin') links.push(['Dashboard', '/workspace']);
  const role = { passenger: 'Passenger', vendor: user?.vendor, admin: 'Admin' }[user?.role];

  return <header className="site-header">
    <div className="site-header-inner">
      <Logo size="sm" />
      <button type="button" className="site-icon site-menu" aria-controls="site-navigation" aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpenOn(open ? null : asPath)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav id="site-navigation" aria-label="Main navigation" className={open ? 'site-nav site-nav-open' : 'site-nav'}>
        {links.map(([label, link]) => <Link key={link} href={link} aria-current={pathname === link ? 'page' : undefined}
          onClick={() => setOpenOn(null)}>{label}</Link>)}
      </nav>
      <div className="site-actions">
        <button className="site-icon site-theme" type="button" onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {user ? <>
          <span className="site-role">{role}</span>
          <button className="site-secondary" type="button" onClick={signOut}>Sign out</button>
        </> : <button className="site-primary" type="button" disabled={!ready} onClick={() => openLogin()}>Sign in</button>}
      </div>
    </div>
    {sessionError && <p className="site-session-error" role="alert">{sessionError}</p>}
  </header>;
}
