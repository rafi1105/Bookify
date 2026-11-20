import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <Logo size="sm" />
      <nav aria-label="Footer navigation">
        <Link href="/routes">Routes</Link>
        <Link href="/fleet">Coach types</Link>
        <Link href="/demo-tracker">Demo tracker</Link>
        <Link href="/workspace">Operator workspace</Link>
      </nav>
    </div>
  </footer>;
}
