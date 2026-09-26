import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Navigation, PhoneCall } from 'lucide-react';

export default function LiveGPSTracker({ busName = "Green Line Scania Double Decker #GL-701", origin = "Dhaka (Sayedabad Hub)", destination = "Chattogram (Dampara Station)" }) {
  const [progress, setProgress] = useState(62);
  const [speed, setSpeed] = useState(82);
  const [eta, setEta] = useState(115);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 15 : prev + 1));
      setSpeed(78 + Math.floor(Math.random() * 8));
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
            <span className="gps-stat-value cyan">{speed} KM/H</span>
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
            <span>{destination} (ETA 01:00 PM)</span>
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
            <span className="gps-info-val">Highway Inn Food Court, Cumilla</span>
            <span className="gps-info-sub cyan">24 km away (In 18 mins)</span>
          </div>

          <div className="gps-info-card">
            <span className="gps-info-label">LEAD DRIVER</span>
            <span className="gps-info-val">Md. Rafiqul Islam (Lead Pilot)</span>
            <span className="gps-info-sub emerald">14 Yrs Safety Record</span>
          </div>

          <div className="gps-info-card gps-info-action-card">
            <div className="gps-status-col">
              <span className="gps-info-label">BUS STATUS</span>
              <span className="gps-info-val emerald">On Time (+0m)</span>
            </div>
            <button className="gps-info-action-btn" title="Call Highway Dispatch / Driver">
              <PhoneCall size={14} />
              <span>Call Dispatch</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
