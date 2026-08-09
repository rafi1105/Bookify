import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
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
    <div className="page-container">
      
      <div className="page-header">
        <span className="page-badge">
          INTERCITY BUS NETWORK
        </span>
        <h1 className="page-title">
          Explore Popular Express Corridors
        </h1>
        <p className="page-subtitle">
          Daily high-frequency bus departures connecting top metropolitan hubs across North America.
        </p>

        {/* Filter input */}
        <div className="routes-search-wrapper">
          <Search className="routes-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city (e.g. New York, Miami, Boston...)"
            className="routes-search-input"
          />
        </div>
      </div>

      <div className="routes-grid">
        {filteredRoutes.map((route) => (
          <div key={route.id} className="routes-page-card">
            <div className="routes-page-card-media">
              <img
                src={route.imageName === 'scenic-route.jpg' ? scenicRouteImg : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg : passengerExpImg}
                alt={route.from + ' to ' + route.to}
                className="routes-page-card-img"
              />
              <div className="routes-departure-badge">
                {route.tripsPerDay} Departures Daily
              </div>
              <div className="routes-price-badge">
                ${route.price.toFixed(2)}
              </div>
            </div>

            <div className="routes-page-card-content">
              <h4 className="routes-page-card-title">{route.from} ➔ {route.to}</h4>
              <div className="routes-page-card-meta">
                <span>⏱ {route.duration}</span>
                <span>•</span>
                <span>📍 {route.distance}</span>
              </div>
              
              <Link
                to={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                className="btn-routes-view-buses"
              >
                <span>View Daily Buses</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
