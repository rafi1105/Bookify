import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Star, Clock, MapPin } from 'lucide-react';
import { POPULAR_ROUTES } from '../data/mockData';

import scenicRouteImgAsset from '../assets/images/scenic-route.jpg';
const scenicRouteImg = scenicRouteImgAsset.src;
import cityMetropolisImgAsset from '../assets/images/city-metropolis.jpg';
const cityMetropolisImg = cityMetropolisImgAsset.src;
import passengerExpImgAsset from '../assets/images/passenger-exp.jpg';
const passengerExpImg = passengerExpImgAsset.src;

export default function RoutesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoutes = POPULAR_ROUTES.filter((r) =>
    r.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.to.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container routes-page">
      
      <div className="page-header">
        <span className="page-badge">
          INTERCITY BUS NETWORK
        </span>
        <h1 className="page-title">
          Explore Popular Express Corridors
        </h1>
        <p className="page-subtitle">
          Daily high-frequency bus departures connecting top transit hubs, divisional capitals, and scenic beach destinations across Bangladesh.
        </p>

        {/* Filter input */}
        <div className="routes-search-wrapper">
          <Search size={16} className="routes-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city (e.g. Dhaka, Chattogram, Cox's Bazar, Sylhet...)"
            className="routes-search-input"
          />
        </div>
      </div>

      <div className="routes-cards-grid">
        {filteredRoutes.map((route) => (
          <div key={route.id} className="full-image-route-card">
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
                ৳{route.price.toLocaleString()}
              </span>
            </div>

            {/* Card Content at Bottom */}
            <div className="full-card-bottom-content">
              <h4 className="full-card-title">
                <span>{route.from}</span>
                <ArrowRight size={16} className="full-card-title-arrow" />
                <span>{route.to}</span>
              </h4>

              <div className="full-card-meta">
                <span className="full-card-meta-item">
                  <Clock size={14} className="meta-icon" />
                  <span>{route.duration}</span>
                </span>
                <span className="full-card-meta-divider">•</span>
                <span className="full-card-meta-item">
                  <MapPin size={14} className="meta-icon" />
                  <span>{route.distance}</span>
                </span>
              </div>

              <div className="full-card-tags-row">
                <span className="full-card-rating-tag">
                  <Star size={14} className="route-star-icon" />
                  <span>{route.rating}</span>
                </span>
                {route.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="full-card-pill-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <Link
                href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                className="full-card-cta-btn"
              >
                <span>Check Bus Schedule</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
