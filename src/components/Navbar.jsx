import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useDemoSession } from '../context/DemoSessionContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useRouter();
  const { user, ready, openLogin, signOut } = useDemoSession();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Search Routes', path: '/search' },
    { name: 'Luxury Fleet', path: '/fleet' },
    { name: 'Popular Routes', path: '/routes' },
    { name: 'Operator SaaS', path: '/operators' },
    { name: 'My Bookings', path: '/my-bookings' },
    ...(user?.role === 'vendor' || user?.role === 'admin' ? [{ name: 'Dashboard', path: '/workspace' }] : []),
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className={`floating-glass-navbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
      <div className="floating-glass-capsule">
        
        {/* Brand Logo Section */}
        <div className="nav-brand-section">
          <Logo size="sm" />
        </div>

        {/* Vertical Divider */}
        <div className="nav-vertical-divider" />

        {/* Center Navigation Links */}
        <nav className="nav-links-center">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-capsule-link ${isActive ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="nav-capsule-actions">
          
          {/* Tourera-style Mini Pill Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="theme-switch-pill"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            type="button"
          >
            <span className={`theme-switch-icon ${theme === 'light' ? 'active-icon' : ''}`}>
              <Sun size={13} />
            </span>
            <span className={`theme-switch-icon ${theme === 'dark' ? 'active-icon' : ''}`}>
              <Moon size={13} />
            </span>
          </button>

          {/* Solid White Pill CTA */}
          {user
            ? <button type="button" className="btn-tourera-cta" onClick={signOut}><span>Sign out</span></button>
            : <button type="button" className="btn-tourera-cta" disabled={!ready} onClick={() => openLogin()}><span>Sign in</span></button>}

        </div>

        {/* Mobile Nav Toggle */}
        <div className="mobile-nav-toggle-group">
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn mobile-only"
            type="button"
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="theme-toggle-btn"
            type="button"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer-glass">
          <div className="mobile-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`mobile-nav-link ${pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="mobile-nav-footer">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-tourera-cta mobile-full"
            >
              <span>Book Tickets</span>
            </Link>
            {user
              ? <button type="button" className="btn-tourera-cta mobile-full" onClick={() => { setMobileMenuOpen(false); signOut(); }}><span>Sign out</span></button>
              : <button type="button" className="btn-tourera-cta mobile-full" disabled={!ready} onClick={() => { setMobileMenuOpen(false); openLogin(); }}><span>Sign in</span></button>}
          </div>
        </div>
      )}
    </header>
  );
}
