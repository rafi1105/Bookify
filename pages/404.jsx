import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return <section className="page-container"><h1>Page not found</h1><Link href="/search">Search buses</Link></section>;
}
