import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { getTripSnapshot } from '../lib/tripSimulation.js';

export default function LiveGPSTracker({ busName, origin, destination, scenario, tick }) {
  const { progress, speed, eta, status } = getTripSnapshot(scenario, tick);

  return (
    <div className="gps-tracker-card">
      <div className="gps-header">
        <div className="gps-header-left">
          <div className="gps-nav-icon-box"><Navigation size={20} /></div>
          <div>
            <div className="gps-title-row">
              <h4 className="gps-bus-name">{busName}</h4>
              <span className="gps-live-badge">SIMULATION</span>
            </div>
            <p className="gps-telematics-subtitle">Demo trip movement and delays</p>
          </div>
        </div>
        <div className="gps-header-right">
          <div className="gps-stat-block">
            <span className="gps-stat-label">Current speed</span>
            <span className="gps-stat-value cyan">{speed} KM/H</span>
          </div>
          <div className="gps-stat-divider" />
          <div className="gps-stat-block">
            <span className="gps-stat-label">Time remaining</span>
            <span className="gps-stat-value">{Math.floor(eta / 60)}h {eta % 60}m</span>
          </div>
        </div>
      </div>
      <div className="gps-route-box">
        <div className="gps-route-endpoints">
          <div className="gps-endpoint-origin"><MapPin size={16} />{origin}</div>
          <div className="gps-endpoint-dest"><MapPin size={16} />{destination}</div>
        </div>
        <div className="gps-progress-wrapper">
          <progress className="gps-progress-track" max={100} value={progress} aria-label="Trip progress" />
          <span className="gps-stat-label">{progress}% complete</span>
        </div>
        <div className="gps-info-card">
          <span className="gps-info-label">BUS STATUS</span>
          <span className="gps-info-val" role="status">{status}</span>
        </div>
      </div>
    </div>
  );
}
