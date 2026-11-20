import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SearchWidget from '../components/SearchWidget';
import hero from '../assets/images/hero-full-banner.jpg';

const destinations = ['Chattogram', 'Bogura', 'Sylhet', "Cox's Bazar"];

export default function Home({ today }) {
  return <div className="site-home">
    <section className="site-home-hero">
      <div>
        <h1>Book your next bus journey</h1>
        <p>Find intercity buses across Bangladesh, choose a seat, and get your e-ticket.</p>
        <Link href="/my-bookings">Manage a booking <ArrowRight size={16} /></Link>
      </div>
      <img src={hero.src} alt="An intercity coach on a highway" fetchPriority="high" />
    </section>
    <section className="site-home-search" aria-label="Find a bus">
      <SearchWidget compact initialDate={today} />
    </section>
    <section className="site-home-routes">
      <h2>Find a route from Dhaka</h2>
      <ul>{destinations.map((city) => <li key={city}><Link href={{ pathname: '/search', query: { from: 'Dhaka', to: city } }}>
        {city}<ArrowRight size={16} aria-hidden="true" />
      </Link></li>)}</ul>
    </section>
  </div>;
}
