import React from 'react';
import { Link } from 'react-router-dom';
import brandLogoImg from '../assets/images/bookify-brand-logo.jpg';

export default function Logo({ size = 'md' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <Link to="/" className={`logo-container ${isSm ? 'logo-sm' : ''} ${isLg ? 'logo-lg' : ''}`}>
      {/* Brand Emblem Image */}
      <div className={`logo-emblem ${isSm ? 'sm' : ''} ${isLg ? 'lg' : ''}`}>
        <img src={brandLogoImg} alt="Bookify Brand Emblem" />
      </div>

      <div className="logo-text-block">
        <div className="logo-title-row">
          <span className={`logo-title ${isSm ? 'sm' : ''} ${isLg ? 'lg' : ''}`}>
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
