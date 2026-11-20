import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Bus, CheckCircle2, Download, QrCode, Smartphone, X, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/router';

export default function TicketModal({ bookingDetails, onClose }) {
  const { push: navigate } = useRouter();

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5 }
    });
  }, []);

  if (!bookingDetails) return null;

  const { bus, seats, totalAmount, boardingPoint, passenger, bookingId, issueDate } = bookingDetails;

  return (
    <div className="ticket-dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ticket-modal-card">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="ticket-modal-close-btn"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Success Header */}
        <div className="ticket-modal-success-header">
          <div className="ticket-success-icon-box">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="ticket-modal-title">Booking Confirmed!</h3>
          <p className="ticket-modal-subtitle">
            Your official digital E-Ticket has been generated and sent to <span className="highlight-cyan font-semibold">{passenger.email}</span>
          </p>
        </div>

        {/* Luxury Boarding Pass Ticket */}
        <div className="ticket-boarding-pass">
          
          {/* Top Gradient Banner */}
          <div className="ticket-pass-banner">
            <div className="ticket-banner-logo-block">
              <div className="ticket-bus-icon-wrap">
                <Bus size={18} />
              </div>
              <div className="ticket-banner-titles">
                <span className="ticket-banner-title">BOOKIFY OFFICIAL E-PASS</span>
                <span className="ticket-banner-operator">{bus.operator || 'Green Line Paribahan'}</span>
              </div>
            </div>
            <div className="ticket-banner-meta">
              <span className="ticket-banner-id">PASS #{bookingId}</span>
              <span className="ticket-banner-date">{issueDate}</span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="ticket-pass-body">
            
            {/* Origin -> Destination Route Row */}
            <div className="ticket-route-row">
              <div className="ticket-route-point">
                <span className="ticket-info-label">DEPARTURE</span>
                <h4 className="ticket-route-city">{bus.from}</h4>
                <span className="ticket-route-time">{bus.departureTime}</span>
              </div>

              <div className="ticket-route-middle">
                <span className="ticket-direct-badge">{bus.duration} Direct Express</span>
                <div className="ticket-route-track">
                  <span className="ticket-track-dot"></span>
                  <span className="ticket-track-line"></span>
                  <ArrowRight size={14} className="ticket-track-arrow" />
                  <span className="ticket-track-line"></span>
                  <span className="ticket-track-dot"></span>
                </div>
              </div>

              <div className="ticket-route-point dest">
                <span className="ticket-info-label">ARRIVAL</span>
                <h4 className="ticket-route-city">{bus.to}</h4>
                <span className="ticket-route-time">{bus.arrivalTime}</span>
              </div>
            </div>

            {/* Passenger / Seat / Class Grid */}
            <div className="ticket-info-grid">
              <div className="ticket-info-item">
                <span className="ticket-info-label">PASSENGER NAME</span>
                <span className="ticket-info-val">{passenger.fullName}</span>
                <span className="ticket-info-sub-val">{passenger.phone}</span>
              </div>
              <div className="ticket-info-item">
                <span className="ticket-info-label">CONFIRMED SEATS</span>
                <span className="ticket-info-val cyan">{seats.join(', ')}</span>
                <span className="ticket-info-sub-val">{seats.length} Passenger(s)</span>
              </div>
              <div className="ticket-info-item">
                <span className="ticket-info-label">COACH TYPE</span>
                <span className="ticket-info-val">{bus.busType ? bus.busType.split('(')[0].trim() : 'Luxury AC'}</span>
                <span className="ticket-info-sub-val">Air Suspension</span>
              </div>
            </div>

            {/* Boarding Point Box */}
            <div className="ticket-boarding-location-box">
              <div className="ticket-pin-icon-wrap">
                <MapPin size={16} />
              </div>
              <div className="ticket-boarding-text">
                <span className="ticket-info-label">DESIGNATED BOARDING COUNTER</span>
                <span className="ticket-boarding-name">{boardingPoint}</span>
              </div>
            </div>

            {/* Perforated Divider Line with Cutout Notches */}
            <div className="ticket-tear-line">
              <span className="ticket-notch notch-left"></span>
              <div className="ticket-dash-line"></div>
              <span className="ticket-notch notch-right"></span>
            </div>

            {/* Fare & QR Scanner Stub */}
            <div className="ticket-fare-qr-row">
              <div className="ticket-fare-block">
                <span className="ticket-fare-label">TOTAL FARE PAID</span>
                <div className="ticket-fare-price-wrap">
                  <span className="ticket-fare-price">৳{totalAmount.toLocaleString()}</span>
                  <span className="ticket-fare-all-in">All Taxes Included</span>
                </div>
                <div className="ticket-pci-badge">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Verified E-Ticket • MFS & Bank Authorized</span>
                </div>
              </div>

              <div className="ticket-qr-container">
                <QrCode size={54} className="ticket-qr-code" />
                <span className="ticket-qr-label">SCAN TO BOARD</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="ticket-modal-actions">
          <button
            onClick={() => alert(`Downloading official PDF E-Ticket for Booking #${bookingId}...`)}
            className="btn-ticket-download"
          >
            <Download size={16} className="btn-icon-cyan" />
            <span>Save PDF Boarding Pass</span>
          </button>

          <button
            onClick={() => {
              onClose();
              navigate('/my-bookings');
            }}
            className="btn-ticket-track"
          >
            <Smartphone size={16} />
            <span>Track Bus Live GPS</span>
          </button>
        </div>

      </div>
    </div>
  );
}
