import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { BUS_TYPES } from '../data/mockData';

import sleeperBusImg from '../assets/images/sleeper-bus.jpg';
import seaterBusImg from '../assets/images/seater-bus.jpg';
import heroBusImg from '../assets/images/hero-bus.jpg';
import { Link } from 'react-router-dom';

export default function FleetPage() {
  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header">
        <span className="page-badge">
          OUR LUXURY BUS FLEET
        </span>
        <h1 className="page-title">
          Engineered For Superior Comfort & Safety
        </h1>
        <p className="page-subtitle">
          Bookify operates and partners exclusively with top-tier multi-axle luxury coaches featuring European safety air-brakes, air suspension, and ergonomic sleeper pods.
        </p>
      </div>

      {/* Fleet Categories */}
      <div className="fleet-list">
        {BUS_TYPES.map((bus, idx) => {
          const img = bus.id === 'sleeper' ? sleeperBusImg : bus.id === 'executive' ? seaterBusImg : heroBusImg;
          const isReverse = idx % 2 !== 0;

          return (
            <div
              key={bus.id}
              className={`fleet-card ${isReverse ? 'reverse' : ''}`}
            >
              {/* Image Col */}
              <div className="fleet-card-media">
                <img
                  src={img}
                  alt={bus.name}
                  className="fleet-card-img"
                />
                <div className="fleet-category-tag">
                  {bus.category}
                </div>
              </div>

              {/* Info Col */}
              <div className="fleet-card-info">
                <h3 className="fleet-bus-name">{bus.name}</h3>
                <p className="fleet-bus-meta">{bus.deck} • {bus.seatsCount} Total Capacity</p>

                <div className="fleet-features-wrapper">
                  <h5 className="fleet-features-title">Key Features</h5>
                  <div className="fleet-features-grid">
                    {bus.features.map((feat, i) => (
                      <div key={i} className="fleet-feature-item">
                        <Check className="fleet-check-icon" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fleet-card-footer">
                  <div className="fleet-fare-block">
                    <span className="fleet-fare-label">Average Fare</span>
                    <span className="fleet-fare-price">${bus.basePrice.toFixed(2)}</span>
                  </div>

                  <Link
                    to="/search"
                    className="fleet-book-btn"
                  >
                    <span>Book On This Bus</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
