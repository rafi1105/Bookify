import React from 'react';
import Link from 'next/link';
import brandLogoImgAsset from '../assets/images/bookify-brand-logo.jpg';
const brandLogoImg = brandLogoImgAsset.src;

export default function Logo({ size = 'md' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <Link href="/" className={`logo-container ${isSm ? 'logo-sm' : ''} ${isLg ? 'logo-lg' : ''}`}>
      {/* Brand Emblem Image */}
      <div className={`logo-emblem ${isSm ? 'lg' : ''} ${isLg ? 'sm' : ''}`}>
        <img src={brandLogoImg} alt="Bookify Brand Emblem" />
      </div>

      <div className="logo-text-block">
        <div className="logo-title-row">
          <span className={`logo-title ${isSm ? 'sm' : ''} ${isLg ? 'lg' : ''}`}>
            Bookify
          </span>
        </div>
      </div>
    </Link>
  );
}
