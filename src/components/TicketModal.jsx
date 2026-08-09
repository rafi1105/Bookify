import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Bus, CheckCircle2, Download, QrCode, Smartphone, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TicketModal({ bookingDetails, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  if (!bookingDetails) return null;

  const { bus, seats, totalAmount, boardingPoint, passenger, bookingId, issueDate } = bookingDetails;

  return (
    <dialog open className="ticket-dialog-backdrop">
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
            <CheckCircle2 size={32} className="animate-bounce" />
          </div>
          <h3 className="ticket-modal-title">Booking Confirmed!</h3>
          <p className="ticket-modal-subtitle">
            Your digital E-Ticket pass has been generated and emailed to <span className="highlight-cyan font-semibold">{passenger.email}</span>
          </p>
        </div>

        {/* Boarding Pass Ticket */}
        <div className="ticket-boarding-pass">
          
          {/* Pass Banner */}
          <div className="ticket-pass-banner">
            <div className="ticket-banner-logo-block">
              <Bus size={20} />
              <span className="ticket-banner-title">BOOKIFY OFFICIAL PASS</span>
            </div>
            <div className="ticket-banner-meta">
              <span className="ticket-banner-id">ID: {bookingId}</span>
              <span className="ticket-banner-date">{issueDate}</span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="ticket-pass-body">
            
            <div className="ticket-route-row">
              <div className="ticket-route-point">
                <span className="ticket-info-label">FROM</span>
                <h4 className="ticket-route-city">{bus.from}</h4>
                <span className="ticket-route-time">{bus.departureTime}</span>
              </div>
              <div className="ticket-direct-badge">
                {bus.duration} Direct
              </div>
              <div className="ticket-route-point dest">
                <span className="ticket-info-label">TO</span>
                <h4 className="ticket-route-city">{bus.to}</h4>
                <span className="ticket-route-time">{bus.arrivalTime}</span>
              </div>
            </div>

            <div className="ticket-info-grid">
              <div className="ticket-info-item">
                <span className="ticket-info-label">PASSENGER</span>
                <span className="ticket-info-val">{passenger.fullName}</span>
              </div>
              <div className="ticket-info-item">
                <span className="ticket-info-label">SEAT(S)</span>
                <span className="ticket-info-val cyan">{seats.join(', ')}</span>
              </div>
              <div className="ticket-info-item">
                <span className="ticket-info-label">BUS CLASS</span>
                <span className="ticket-info-val">{bus.busType.split(' ')[0]}</span>
              </div>
            </div>

            <div className="ticket-boarding-location-box">
              <MapPin size={16} className="highlight-cyan flex-shrink-0" />
              <div>
                <span className="ticket-info-val">Boarding Point: </span>
                <span className="theme-text-sub">{boardingPoint}</span>
              </div>
            </div>

            <div className="ticket-fare-qr-row">
              <div className="ticket-fare-block">
                <span className="ticket-fare-label">TOTAL FARE PAID</span>
                <span className="ticket-fare-price">${totalAmount.toFixed(2)}</span>
                <span className="ticket-pci-badge">PCI DSS Verified Receipt</span>
              </div>

              <div className="ticket-qr-container">
                <QrCode size={56} className="ticket-qr-code" />
                <span className="ticket-qr-label">SCAN BOARDING</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Actions */}
        <div className="ticket-modal-actions">
          <button
            onClick={() => alert(`Downloading E-Ticket PDF for ${bookingId}...`)}
            className="btn-ticket-download"
          >
            <Download size={16} className="highlight-cyan" />
            <span>Save PDF E-Ticket</span>
          </button>

          <button
            onClick={() => navigate('/my-bookings')}
            className="btn-ticket-track"
          >
            <Smartphone size={16} />
            <span>Track Bus Live GPS</span>
          </button>
        </div>

      </div>
    </dialog>
  );
}
