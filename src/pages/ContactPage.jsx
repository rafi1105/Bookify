import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, ChevronDown, CheckCircle2, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'Booking Assistance', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const faqs = [
    {
      q: "How do I cancel my bus ticket and receive a full refund?",
      a: "Go to 'My Bookings', enter your Booking Reference ID, and click 'Cancel Ticket'. Cancellations initiated at least 4 hours before departure receive an instant 100% refund directly to your original payment method."
    },
    {
      q: "Where do I track the real-time live GPS location of my bus?",
      a: "You can track your bus live on the 'My Bookings' page or via the SMS link sent to your phone 1 hour before departure. Our satellite telemetry updates every 3 seconds."
    },
    {
      q: "Are luggage fees included in the ticket price?",
      a: "Yes! Every standard ticket includes 1 free under-bus luggage bag (up to 50 lbs) and 1 personal overhead carry-on bag."
    },
    {
      q: "How can fleet operators partner with Bookify?",
      a: "Visit our 'Operator SaaS' page and click 'Launch Pro Fleet'. You can onboard your fleet and list your routes in under 24 hours."
    }
  ];

  return (
    <div className="page-container">
      
      <div className="page-header">
        <span className="page-badge">
          24/7 SUPPORT & INQUIRIES
        </span>
        <h1 className="page-title">
          We Are Here To Help You Travel
        </h1>
        <p className="page-subtitle">
          Have questions about your ticket, fleet partnership, or corporate booking? Reach out to our team anytime.
        </p>
      </div>

      <div className="contact-grid">
        
        {/* Contact Info & Terminal HQ Details */}
        <div className="contact-info-card">
          <h3 className="contact-section-title">Bookify Global Headquarters</h3>

          <div className="contact-info-list">
            <div className="contact-info-item">
              <MapPin className="contact-icon" />
              <div className="contact-info-text">
                <strong className="contact-info-label">New York HQ Terminal</strong>
                <span className="contact-info-value">450 W 33rd Street, Midtown Transit Center, New York, NY 10001</span>
              </div>
            </div>

            <div className="contact-info-item">
              <Phone className="contact-icon" />
              <div className="contact-info-text">
                <strong className="contact-info-label">Toll-Free Support Line</strong>
                <span className="contact-info-value">+1 (800) 555-BOOK (2665)</span>
              </div>
            </div>

            <div className="contact-info-item">
              <Mail className="contact-icon" />
              <div className="contact-info-text">
                <strong className="contact-info-label">Official Email</strong>
                <span className="contact-info-value">support@bookifyexpress.com</span>
              </div>
            </div>
          </div>

          <div className="contact-sla-box">
            <h5 className="contact-sla-title">Response SLA</h5>
            <div className="contact-sla-badge">
              <MessageSquare size={16} />
              <span>Average live chat response time: <strong>&lt; 45 Seconds</strong></span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="contact-form-card">
          {submitted ? (
            <div className="contact-success-box">
              <CheckCircle2 className="contact-success-icon" />
              <h3 className="contact-success-title">Message Received!</h3>
              <p className="contact-success-desc">
                Thank you for contacting Bookify support. A passenger agent has been assigned to your inquiry.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <h3 className="contact-form-title">Send Us A Message</h3>
              
              <div className="contact-form-row">
                <div className="contact-form-group">
                  <label className="contact-form-label">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="contact-form-input"
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>
                <div className="contact-form-group">
                  <label className="contact-form-label">Your Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="contact-form-input"
                    placeholder="sarah@example.com"
                  />
                </div>
              </div>

              <div className="contact-form-group">
                <label className="contact-form-label">Inquiry Topic</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="contact-form-select"
                >
                  <option value="Booking Assistance">Ticket Booking Assistance</option>
                  <option value="Operator Partnership">Fleet Operator Partnership</option>
                  <option value="Corporate Fleet">Corporate Group Booking</option>
                  <option value="Feedback">Feedback & Suggestions</option>
                </select>
              </div>

              <div className="contact-form-group">
                <label className="contact-form-label">Your Message</label>
                <textarea
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="contact-form-textarea"
                  placeholder="How can we assist your trip today?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="contact-submit-btn"
              >
                <span>Send Support Request</span>
                <Send size={16} />
              </button>
            </form>
          )}
        </div>

      </div>

      {/* FAQ Accordions */}
      <div className="contact-faq-section">
        <div className="contact-faq-header">
          <span className="page-badge">Frequently Asked Questions</span>
          <h2 className="page-title">Common Passenger Questions</h2>
        </div>

        <div className="contact-faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-accordion-item">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="faq-accordion-trigger"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`faq-accordion-chevron ${openFaq === index ? 'rotated' : ''}`} />
              </button>
              {openFaq === index && (
                <div className="faq-accordion-content">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
