import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Star } from 'lucide-react';
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
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs theme-text-main focus:outline-none focus:border-cyan-500 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRoutes.map((route) => {
          const cardImg = route.imageName === 'scenic-route.jpg' ? scenicRouteImg : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg : passengerExpImg;
          
          return (
            <div key={route.id} className="route-cover-card group">
              
              {/* Full Bleed Background Image */}
              <div className="route-cover-bg">
                <img
                  src={cardImg}
                  alt={route.from + ' to ' + route.to}
                />
              </div>
              <div className="route-cover-gradient"></div>

              {/* Top Badges */}
              <div className="route-cover-top">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 text-cyan-400 border border-cyan-500/30 text-xs font-bold backdrop-blur-md shadow-md">
                  ⚡ {route.tripsPerDay} Trips Daily
                </span>
                <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-950/80 text-amber-400 border border-amber-500/30 text-xs font-bold backdrop-blur-md shadow-md">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{route.rating}</span>
                </div>
              </div>

              {/* Bottom Glassmorphic Content Block */}
              <div className="route-cover-bottom">
                
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-white font-display tracking-tight">
                    {route.from} ➔ {route.to}
                  </h4>
                  <span className="route-price-tag">
                    ${route.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-300">
                  <span>⏱ {route.duration}</span>
                  <span>•</span>
                  <span>📍 {route.distance}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {route.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-200 border border-slate-700/60 text-[10px] font-medium backdrop-blur-sm">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                  className="btn-search-cta mt-2"
                >
                  <span>Check Bus Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
