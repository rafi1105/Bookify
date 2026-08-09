import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Navigation, PhoneCall } from 'lucide-react';

export default function LiveGPSTracker({ busName = "Bookify Royale Sleeper #802", origin = "New York, NY", destination = "Boston, MA" }) {
  const [progress, setProgress] = useState(62);
  const [speed, setSpeed] = useState(65);
  const [eta, setEta] = useState(84);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 15 : prev + 1));
      setSpeed(62 + Math.floor(Math.random() * 8));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="gps-tracker-card">
      
      {/* Tracker Header */}
      <div className="gps-header">
        <div className="gps-header-left">
          <div className="gps-nav-icon-box">
            <Navigation size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="gps-title-row">
              <h4 className="gps-bus-name">{busName}</h4>
              <span className="gps-live-badge">
                LIVE GPS ONLINE
              </span>
            </div>
            <p className="gps-telematics-subtitle">Satellite Telematics • Real-Time Highway Feed</p>
          </div>
        </div>

        <div className="gps-header-right">
          <div className="gps-stat-block">
            <span className="gps-stat-label">Current Speed</span>
            <span className="gps-stat-value cyan">{speed} MPH</span>
          </div>
          <div className="gps-stat-divider"></div>
          <div className="gps-stat-block">
            <span className="gps-stat-label">Estimated Arrival</span>
            <span className="gps-stat-value">{Math.floor(eta / 60)}h {eta % 60}m</span>
          </div>
        </div>
      </div>

      {/* Visual Route Line Box */}
      <div className="gps-route-box">
        
        <div className="gps-route-endpoints">
          <div className="gps-endpoint-origin">
            <MapPin size={16} className="gps-endpoint-icon-origin" />
            <span>{origin} (Departed 07:30 AM)</span>
          </div>
          <div className="gps-endpoint-dest">
            <MapPin size={16} className="gps-endpoint-icon-dest" />
            <span>{destination} (ETA 11:45 AM)</span>
          </div>
        </div>

        {/* Route Progress Bar */}
        <div className="gps-progress-wrapper">
          <div className="gps-progress-track">
            <div
              className="gps-progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div
            className="gps-bus-marker-wrapper"
            style={{ left: `${progress}%` }}
          >
            <div className="gps-bus-marker-icon-box animate-pulse">
              <Bus size={16} />
            </div>
            <div className="gps-bus-tooltip">
              {progress}% Complete
            </div>
          </div>
        </div>

        {/* Next Halt & Driver Info */}
        <div className="gps-info-grid">
          <div className="gps-info-card">
            <span className="gps-info-label">NEXT SCHEDULED HALT</span>
            <span className="gps-info-val">Hartford Highway Plaza</span>
            <span className="gps-info-sub cyan">14 miles away (In 12 mins)</span>
          </div>

          <div className="gps-info-card">
            <span className="gps-info-label">LEAD DRIVER</span>
            <span className="gps-info-val">Captain Robert Vance</span>
            <span className="gps-info-sub emerald">12 Yrs Safety Record</span>
          </div>

          <div className="gps-info-card gps-info-action-card">
            <div>
              <span className="gps-info-label">BUS STATUS</span>
              <span className="gps-info-val emerald">On Time (+0m)</span>
            </div>
            <button className="gps-info-action-btn" title="Call driver">
              <PhoneCall size={16} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
