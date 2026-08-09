import React from 'react';
import { Link } from 'react-router-dom';
import brandLogoImg from '../assets/images/bookify-brand-logo.jpg';

export default function Logo({ size = 'md' }) {
  return (
    <Link to="/" className="logo-container">
      {/* Brand Emblem Image */}
      <div className={`logo-emblem ${size === 'lg' ? 'lg' : ''}`}>
        <img src={brandLogoImg} alt="Bookify Brand Emblem" />
      </div>

      <div className="logo-text-block">
        <div className="logo-title-row">
          <span className={`logo-title ${size === 'lg' ? 'lg' : ''}`}>
            Bookify
          </span>
          <span className="logo-badge">
            PRO
          </span>
        </div>
        <span className="logo-sub">
          Luxury Transit Network
        </span>
      </div>
    </Link>
  );
}
