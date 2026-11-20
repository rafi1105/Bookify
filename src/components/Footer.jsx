import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Send, CheckCircle, Mail, Heart, Sparkles } from 'lucide-react';
import Logo from './Logo';
import footerBgImg from '../assets/images/footer-bg.png';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="footer-container">
      {/* Background Image with Dark Atmospheric Overlay */}
      <div className="footer-bg-media">
        <img
          src={footerBgImg}
          alt="Bookify Luxury Bus Transit Network"
          className="footer-bg-img"
        />
        <div className="footer-overlay-mask"></div>
      </div>

      <div className="container footer-content-wrapper">
        <div className="footer-grid">
          
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="footer-logo-box">
              <Logo size="lg" />
            </div>
            <p className="footer-brand-desc">
              The world's premier bus booking marketplace & SaaS operating platform. Connecting millions of passengers with VIP luxury sleeper coaches, express shuttles, and instant digital tickets.
            </p>

            <div className="footer-trust-badges">
              <div className="footer-badge-item">
                <ShieldCheck size={16} className="badge-icon-cyan" />
                <span>SSL Encrypted Payments</span>
              </div>
              <div className="footer-badge-item">
                <CreditCard size={16} className="badge-icon-emerald" />
                <span>Instant E-Tickets</span>
              </div>
            </div>
          </div>

          {/* Quick Links: Passengers */}
          <div className="footer-links-col">
            <h4 className="footer-title">
              <span className="footer-title-text">Passengers</span>
              <span className="footer-title-bar"></span>
            </h4>
            <ul className="footer-links">
              <li><Link to="/search">Search Bus Tickets</Link></li>
              <li><Link to="/routes">Popular City Routes</Link></li>
              <li><Link to="/fleet">VIP Bus Fleet Showcase</Link></li>
              <li><Link to="/my-bookings">Manage Bookings</Link></li>
              <li><Link to="/demo-tracker">Simulated Bus Tracker</Link></li>
            </ul>
          </div>

          {/* Quick Links: B2B Operators */}
          <div className="footer-links-col">
            <h4 className="footer-title">
              <span className="footer-title-text">Fleet Operators</span>
              <span className="footer-title-bar"></span>
            </h4>
            <ul className="footer-links">
              <li><Link to="/operators">Bookify SaaS Platform</Link></li>
              <li><Link to="/operators">Operator Dashboard Demo</Link></li>
              <li><Link to="/operators">SaaS Pricing Tiers</Link></li>
              <li><Link to="/operators">List Your Fleet</Link></li>
              <li><Link to="/contact">Enterprise API Integrations</Link></li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="footer-links-col footer-newsletter-col">
            <h4 className="footer-title">
              <span className="footer-title-text">Special Deals</span>
              <span className="footer-title-bar"></span>
            </h4>
            <p className="footer-deals-desc">
              <Sparkles size={14} className="footer-deals-icon" />
              <span>Get up to 25% off weekend bus rides & flash route sales.</span>
            </p>
            {subscribed ? (
              <div className="footer-subscribed-badge">
                <CheckCircle size={16} />
                <span>Subscribed! Check your inbox for your 25% discount promo code.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="footer-subscribe-form">
                <div className="footer-input-wrapper">
                  <Mail size={16} className="footer-input-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="footer-email-input"
                  />
                </div>
                <button
                  type="submit"
                  className="footer-submit-btn"
                >
                  <span>Get Promo Deals</span>
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright-block">
            <span>© 2026 Bookify Inc. All rights reserved.</span>
            <span className="footer-dot-divider">•</span>
            <span>Crafted with <Heart size={12} className="footer-heart-icon" /> for global transit</span>
          </div>

          <div className="footer-legal-links">
            <Link to="/contact">Privacy Policy</Link>
            <Link to="/contact">Terms of Service</Link>
            <Link to="/contact">Security & PCI Compliance</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
