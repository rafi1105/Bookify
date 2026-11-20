import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const destinations = ['Chattogram', 'Bogura', 'Sylhet', "Cox's Bazar", 'Khulna', 'Rajshahi'];

export default function RoutesPage() {
  return <section className="page-container site-home-routes">
    <h1>Browse bus routes</h1>
    <ul>{destinations.map((city) => <li key={city}>
      <Link href={{ pathname: '/search', query: { from: 'Dhaka', to: city } }}>
        Dhaka to {city}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </li>)}</ul>
    <Link href="/search">Search all departures</Link>
  </section>;
}
