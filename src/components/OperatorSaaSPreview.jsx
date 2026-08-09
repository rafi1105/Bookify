import React, { useState } from 'react';
import { TrendingUp, Cpu, CheckCircle2 } from 'lucide-react';
import dashboardImg from '../assets/images/operator-dashboard.jpg';

export default function OperatorSaaSPreview() {
  const [activeTab, setActiveTab] = useState('revenue');

  return (
    <div className="saas-preview-card">
      
      <div className="saas-preview-grid">
        
        {/* Left 5 cols: SaaS Info & Metrics */}
        <div className="saas-preview-info-col">
          
          <div className="saas-preview-badge">
            <Cpu size={14} />
            <span>B2B FLEET OPERATOR PLATFORM</span>
          </div>

          <h3 className="saas-preview-title">
            The Operating System for Modern Bus Fleets
          </h3>

          <p className="saas-preview-desc">
            Manage route dispatches, dynamic seat pricing, driver shifts, and live passenger telemetry in one centralized cloud SaaS dashboard.
          </p>

          {/* Interactive Feature Tabs */}
          <div className="saas-feature-tabs">
            <button
              onClick={() => setActiveTab('revenue')}
              className={`saas-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
            >
              <TrendingUp className="saas-tab-icon cyan" />
              <div>
                <h5 className="saas-tab-title">Dynamic AI Yield Management</h5>
                <p className="saas-tab-desc">Automated surge pricing based on real-time weekend & holiday demand.</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('telematics')}
              className={`saas-tab-btn ${activeTab === 'telematics' ? 'active' : ''}`}
            >
              <Cpu className="saas-tab-icon indigo" />
              <div>
                <h5 className="saas-tab-title">Live IoT Bus Telematics</h5>
                <p className="saas-tab-desc">Track fuel efficiency, engine health, and GPS routes in sub-seconds.</p>
              </div>
            </button>
          </div>

          <div className="saas-perks-row">
            <div className="saas-perk-item emerald">
              <CheckCircle2 size={16} />
              <span>Instant Bank Payouts</span>
            </div>
            <div className="saas-perk-item cyan">
              <CheckCircle2 size={16} />
              <span>Zero Set-up Fees</span>
            </div>
          </div>

        </div>

        {/* Right 7 cols: High-Res SaaS Visual Mockup */}
        <div className="saas-preview-mockup-col">
          <div className="saas-mockup-wrapper">
            <img
              src={dashboardImg}
              alt="Bookify Operator SaaS Dashboard"
              className="saas-mockup-img"
            />

            <div className="saas-live-metrics-tag">
              <span className="saas-live-dot animate-ping"></span>
              <span>LIVE FLEET METRICS</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
