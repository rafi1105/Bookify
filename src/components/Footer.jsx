import Link from 'next/link';
import { Bus } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack-s">
            <span className="brand"><span className="brand-mark"><Bus size={18} aria-hidden="true" /></span>Bookify</span>
            <p className="muted small">Intercity bus tickets in Bangladesh. Pick a seat, pay securely and carry your ticket on your phone.</p>
          </div>
          <div>
            <h4>Travel</h4>
            <ul>
              <li><Link href="/">Book a ticket</Link></li>
              <li><Link href="/routes">Routes</Link></li>
              <li><Link href="/manage-booking">Manage booking</Link></li>
              <li><Link href="/account/bookings">My bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4>Operators</h4>
            <ul>
              <li><Link href="/operator/register">Register your company</Link></li>
              <li><Link href="/operator">Operator dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><Link href="/help">Help centre</Link></li>
              <li><Link href="/policies/refunds">Refund policy</Link></li>
              <li><Link href="/policies/terms">Terms of use</Link></li>
              <li><Link href="/policies/privacy">Privacy policy</Link></li>
            </ul>
          </div>
        </div>
        <p className="footer-base">© {new Date().getFullYear()} Bookify. Fares are in Bangladeshi Taka (BDT). Times are Bangladesh time.</p>
      </div>
    </footer>
  );
}
