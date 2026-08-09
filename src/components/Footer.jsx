import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Send, CheckCircle, Mail, Heart } from 'lucide-react';
import Logo from './Logo';

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
      <div className="container">
        <div className="footer-grid">
          
          {/* Brand Col */}
          <div className="footer-brand-col">
            <Logo size="lg" />
            <p className="footer-brand-desc">
              The world's premier bus booking marketplace & SaaS operating platform. Connecting millions of passengers with VIP luxury sleeper coaches, express shuttles, and instant digital tickets.
            </p>

            <div className="footer-trust-badges">
              <div className="badge-tag">
                <ShieldCheck size={16} />
                <span>SSL Encrypted Payments</span>
              </div>
              <div className="badge-tag">
                <CreditCard size={16} />
                <span>Instant E-Tickets</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-title">Passengers</h4>
            <ul className="footer-links">
              <li><Link to="/search">Search Bus Tickets</Link></li>
              <li><Link to="/routes">Popular City Routes</Link></li>
              <li><Link to="/fleet">VIP Bus Fleet Showcase</Link></li>
              <li><Link to="/my-bookings">Manage Bookings & GPS</Link></li>
              <li><Link to="/my-bookings">Track Live Bus ETA</Link></li>
            </ul>
          </div>

          {/* B2B Operators */}
          <div className="footer-links-col">
            <h4 className="footer-title">Fleet Operators</h4>
            <ul className="footer-links">
              <li><Link to="/operators">Bookify SaaS Platform</Link></li>
              <li><Link to="/operators">Operator Dashboard Demo</Link></li>
              <li><Link to="/operators">SaaS Pricing Tiers</Link></li>
              <li><Link to="/operators">List Your Fleet</Link></li>
              <li><Link to="/contact">Enterprise API Integrations</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-links-col">
            <h4 className="footer-title">Special Deals</h4>
            <p className="footer-deals-desc">Get up to 25% off weekend bus rides & flash route sales.</p>
            {subscribed ? (
              <div className="footer-subscribed-badge">
                <CheckCircle size={16} />
                <span>Subscribed! Check your inbox for your 25% discount promo code.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="footer-subscribe-form">
                <div className="input-icon-wrapper">
                  <Mail size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-search-cta"
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
            <span>•</span>
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
