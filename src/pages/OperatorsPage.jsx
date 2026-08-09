import React, { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import OperatorSaaSPreview from '../components/OperatorSaaSPreview';
import { SAAS_PLANS } from '../data/mockData';

export default function OperatorsPage() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <div className="page-container operators-page">
      
      {/* SaaS Hero */}
      <div className="page-header">
        <span className="page-badge page-badge-indigo">
          B2B FLEET OPERATOR MARKETPLACE
        </span>
        <h1 className="page-title">
          Scale Your Bus Fleet Revenue With <span className="highlight-cyan">Bookify SaaS</span>
        </h1>
        <p className="page-subtitle">
          List your buses on our global marketplace, automate seat reservations, and manage driver telemetry with zero upfront infrastructure cost.
        </p>
      </div>

      {/* Operator Dashboard Preview Interactive Component */}
      <OperatorSaaSPreview />

      {/* Pricing Tiers Section */}
      <div className="operators-pricing-section">
        <div className="pricing-header">
          <span className="page-badge">Predictable SaaS Pricing</span>
          <h2 className="page-title">Choose The Right Plan For Your Fleet</h2>

          {/* Billing Switch */}
          <div className="billing-toggle-container">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`billing-toggle-btn ${billingPeriod === 'monthly' ? 'active' : ''}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`billing-toggle-btn ${billingPeriod === 'yearly' ? 'active-annual' : ''}`}
            >
              <span>Annual (Save 20%)</span>
            </button>
          </div>
        </div>

        <div className="pricing-cards-grid">
          {SAAS_PLANS.map((plan, i) => (
            <div
              key={i}
              className={`pricing-tier-card ${plan.highlight ? 'highlight' : ''}`}
            >
              {plan.badge && (
                <div className="pricing-tier-badge">
                  {plan.badge}
                </div>
              )}

              <div className="pricing-tier-body">
                <div>
                  <h3 className="pricing-tier-name">{plan.name}</h3>
                  <p className="pricing-tier-desc">{plan.description}</p>
                </div>

                <div className="pricing-tier-price-row">
                  <span className="pricing-tier-amount">
                    {billingPeriod === 'yearly' ? '$' + Math.floor(parseInt(plan.price.replace('$', '')) * 0.8) : plan.price}
                  </span>
                  <span className="pricing-tier-period">{plan.period}</span>
                </div>

                <ul className="pricing-feature-list">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="pricing-feature-item">
                      <CheckCircle2 className="pricing-feature-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setSelectedPlan(plan.name)}
                className={`pricing-cta-btn ${plan.highlight ? 'highlight' : ''}`}
              >
                <span>{plan.cta}</span>
                <ArrowRight size={16} />
              </button>

            </div>
          ))}
        </div>
      </div>

      {/* Trial Modal */}
      {selectedPlan && (
        <dialog open className="modal-dialog-backdrop">
          <div className="modal-dialog-card">
            <h3 className="modal-dialog-title">Launch {selectedPlan}</h3>
            <p className="modal-dialog-desc">Enter your bus fleet details to initiate your 14-day free SaaS trial with direct bank payout setup.</p>
            
            <input type="text" placeholder="Bus Company / Operator Name" className="modal-dialog-input" />
            <input type="email" placeholder="Work Email Address" className="modal-dialog-input" />
            <input type="text" placeholder="Fleet Size (e.g. 10 buses)" className="modal-dialog-input" />
            
            <div className="modal-dialog-actions">
              <button onClick={() => setSelectedPlan(null)} className="modal-btn-cancel">Cancel</button>
              <button onClick={() => { alert('Fleet Trial Activated! Check your inbox.'); setSelectedPlan(null); }} className="modal-btn-submit">
                Activate Operator Account
              </button>
            </div>
          </div>
        </dialog>
      )}

    </div>
  );
}
