import React from 'react';
import { Wifi, Zap, Star, ArrowRight, ShieldCheck, Navigation, Wind } from 'lucide-react';

export default function BusCard({ bus, onSelectSeats, isSelected = false }) {
  return (
    <div className={`bus-card-container ${isSelected ? 'selected' : ''}`}>
      <div className="bus-card-layout">
        
        {/* Operator & Bus Info */}
        <div className="bus-card-operator-col">
          <div className="bus-card-operator-row">
            <span className="bus-operator-tag">
              {bus.operator}
            </span>
            <div className="bus-rating-block">
              <Star size={14} className="fill-amber-400 text-amber-500" />
              <span>{bus.rating}</span>
              <span className="bus-rating-reviews">({bus.reviewsCount} reviews)</span>
            </div>
          </div>

          <h4 className="bus-card-name">{bus.name}</h4>
          <p className="bus-card-type">{bus.busType}</p>

          {/* Amenities Badges */}
          <div className="bus-amenities-row">
            {bus.amenities.map((amenity, i) => (
              <span key={i} className="bus-amenity-pill">
                {amenity === 'Wi-Fi' && <Wifi size={12} className="highlight-cyan" />}
                {amenity === 'Power Outlet' && <Zap size={12} className="text-amber-500" />}
                {amenity === 'Air Conditioning' && <Wind size={12} className="text-sky-400" />}
                {amenity === 'Live GPS' && <Navigation size={12} className="text-emerald-400" />}
                <span>{amenity}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Departure & Arrival Schedule */}
        <div className="bus-schedule-col">
          <div className="bus-schedule-node">
            <span className="bus-price-label">DEPART</span>
            <span className="bus-schedule-time">{bus.departureTime}</span>
            <span className="bus-schedule-city">{bus.from.split(',')[0]}</span>
          </div>

          <div className="bus-transit-route">
            <span className="bus-duration-label">{bus.duration}</span>
            <div className="bus-transit-track">
              <div className="bus-transit-dot"></div>
              <div className="bus-transit-line"></div>
              <div className="bus-transit-dot"></div>
            </div>
            <span className="bus-nonstop-label">Non-Stop Express</span>
          </div>

          <div className="bus-schedule-node dest">
            <span className="bus-price-label">ARRIVE</span>
            <span className="bus-schedule-time">{bus.arrivalTime}</span>
            <span className="bus-schedule-city">{bus.to.split(',')[0]}</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="bus-pricing-col">
          <div className="bus-price-block">
            <span className="bus-price-label">STARTING FROM</span>
            <span className="bus-price-value">${bus.price.toFixed(2)}</span>
            <span className="bus-seats-left">🔥 {bus.availableSeats} seats left</span>
          </div>

          <button
            onClick={() => onSelectSeats(bus)}
            className={`bus-select-seats-btn ${isSelected ? 'active' : ''}`}
          >
            <span>{isSelected ? 'Close Seat Map' : 'Select Seat Layout'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
