import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
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
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
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
          <Link to="/search" className="btn-tourera-cta">
            <span>Book Tickets</span>
          </Link>

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
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="mobile-nav-footer">
            <Link
              to="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-tourera-cta mobile-full"
            >
              <span>Book Tickets</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
