import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Star, Clock, MapPin } from 'lucide-react';
import { POPULAR_ROUTES } from '../data/mockData';

import scenicRouteImg from '../assets/images/scenic-route.jpg';
import cityMetropolisImg from '../assets/images/city-metropolis.jpg';
import passengerExpImg from '../assets/images/passenger-exp.jpg';

export default function RoutesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoutes = POPULAR_ROUTES.filter((r) =>
    r.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.to.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 text-xs font-bold uppercase tracking-widest">
          INTERCITY BUS NETWORK
        </span>
        <h1 className="text-4xl font-extrabold theme-text-main font-display">
          Explore Popular Express Corridors
        </h1>
        <p className="theme-text-sub text-sm">
          Daily high-frequency bus departures connecting top metropolitan hubs across North America.
        </p>

        {/* Filter input */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="w-4 h-4 absolute left-4 top-5 theme-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city (e.g. New York, Miami, Boston...)"
            className="w-full pl-11 pr-4 py-3 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-300 rounded-2xl text-xs theme-text-main focus:outline-none focus:border-cyan-500 shadow-sm"
          />
        </div>
      </div>

      <div className="routes-cards-grid">
        {filteredRoutes.map((route) => (
          <div key={route.id} className="full-image-route-card group">
            {/* Full Background Image */}
            <img
              src={route.imageName === 'scenic-route.jpg' ? scenicRouteImg : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg : passengerExpImg}
              alt={route.from + ' to ' + route.to}
              className="full-card-bg-img"
            />

            {/* Dark Overlay Gradient */}
            <div className="full-card-gradient-overlay"></div>

            {/* Top Badges */}
            <div className="full-card-top-badges">
              <span className="full-card-top-badge">
                {route.tripsPerDay} Trips Daily
              </span>
              <span className="full-card-price-badge">
                ${route.price.toFixed(2)}
              </span>
            </div>

            {/* Card Content at Bottom */}
            <div className="full-card-bottom-content">
              <h4 className="full-card-title">{route.from} ➔ {route.to}</h4>

              <div className="full-card-meta">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{route.duration}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{route.distance}</span>
              </div>

              <div className="full-card-tags-row">
                <span className="full-card-rating-tag">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{route.rating}</span>
                </span>
                {route.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="full-card-pill-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <Link
                to={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                className="full-card-cta-btn"
              >
                <span>Check Bus Schedule</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
