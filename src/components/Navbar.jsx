import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Menu, X, Ticket, ChevronRight, Sun, Moon } from 'lucide-react';
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
    <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-inner">
          
          {/* Brand Logo */}
          <Logo />

          {/* Desktop Navigation Links */}
          <nav className="nav-links-pill">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="nav-actions">
            
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
            </button>

            {/* Currency Selector */}
            <div className="currency-select-box">
              <Globe size={14} className="highlight-cyan" />
              <select defaultValue="USD">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Book Tickets CTA */}
            <Link to="/search" className="btn-book-cta">
              <Ticket size={16} />
              <span>Book Tickets</span>
              <ChevronRight size={14} />
            </Link>

          </div>

          {/* Mobile Right Controls */}
          <div className="mobile-nav-toggle-group">
            <button onClick={toggleTheme} className="theme-toggle-btn">
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="theme-toggle-btn">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
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
                className="mobile-nav-search-btn"
              >
                <Ticket size={16} />
                <span>Search & Book Bus</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
