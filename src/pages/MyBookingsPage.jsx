import React, { useState } from 'react';
import { Search, Download, RefreshCw, XCircle } from 'lucide-react';
import LiveGPSTracker from '../components/LiveGPSTracker';

export default function MyBookingsPage() {
  const [bookingIdInput, setBookingIdInput] = useState('BK-894210');
  const [activeBooking, setActiveBooking] = useState({
    bookingId: 'BK-894210',
    passengerName: 'Alex Vance',
    busName: 'Bookify Royale Sleeper #802',
    from: 'New York, NY',
    to: 'Boston, MA',
    date: 'Aug 15, 2026',
    departureTime: '07:30 AM',
    seats: ['L4'],
    status: 'Confirmed & Live'
  });

  const handleLookup = (e) => {
    e.preventDefault();
    if (bookingIdInput) {
      setActiveBooking({
        bookingId: bookingIdInput.toUpperCase(),
        passengerName: 'Alex Vance',
        busName: 'Bookify Express #104',
        from: 'New York, NY',
        to: 'Boston, MA',
        date: 'Aug 15, 2026',
        departureTime: '07:30 AM',
        seats: ['L4', 'L5'],
        status: 'Confirmed & Live'
      });
    }
  };

  return (
    <div className="page-container">
      
      <div className="page-header">
        <span className="page-badge">
          MY BOOKINGS & LIVE TRACKER
        </span>
        <h1 className="page-title">
          Manage Tickets & Live Bus GPS
        </h1>
        <p className="page-subtitle">
          Enter your Booking Reference ID to view live satellite bus telemetry, download digital boarding passes, or reschedule.
        </p>

        {/* Lookup Bar */}
        <form onSubmit={handleLookup} className="booking-lookup-form">
          <input
            type="text"
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value)}
            placeholder="Enter Booking ID (e.g. BK-894210)"
            className="booking-lookup-input"
          />
          <button
            type="submit"
            className="booking-lookup-btn"
          >
            <Search size={16} />
            <span>Track</span>
          </button>
        </form>
      </div>

      {/* Active Booking Telematics View */}
      {activeBooking && (
        <div className="booking-telematics-view">
          
          {/* Real-time GPS Tracker Component */}
          <LiveGPSTracker
            busName={activeBooking.busName}
            origin={activeBooking.from}
            destination={activeBooking.to}
          />

          {/* Ticket Details & Actions */}
          <div className="booking-ticket-card">
            <div className="booking-ticket-header">
              <div className="booking-ref-block">
                <span className="booking-ref-label">BOOKING REFERENCE</span>
                <h3 className="booking-ref-val">{activeBooking.bookingId}</h3>
              </div>

              <div>
                <span className="booking-status-badge">
                  {activeBooking.status}
                </span>
              </div>
            </div>

            <div className="booking-details-grid">
              <div className="booking-detail-item">
                <span className="booking-detail-label">PASSENGER</span>
                <span className="booking-detail-val">{activeBooking.passengerName}</span>
              </div>
              <div className="booking-detail-item">
                <span className="booking-detail-label">DATE & DEPARTURE</span>
                <span className="booking-detail-val">{activeBooking.date} • {activeBooking.departureTime}</span>
              </div>
              <div className="booking-detail-item">
                <span className="booking-detail-label">CONFIRMED SEATS</span>
                <span className="booking-detail-val cyan">{activeBooking.seats.join(', ')}</span>
              </div>
              <div className="booking-detail-item">
                <span className="booking-detail-label">CANCELLATION POLICY</span>
                <span className="booking-detail-val emerald">100% Free Refund (Active)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="booking-actions-row">
              <button onClick={() => alert('Downloading E-Ticket Pass...')} className="btn-booking-download">
                <Download size={16} />
                <span>Download Boarding PDF</span>
              </button>

              <button onClick={() => alert('Change seat request sent to operator.')} className="btn-booking-reschedule">
                <RefreshCw size={16} />
                <span>Reschedule / Change Seat</span>
              </button>

              <button onClick={() => alert('Cancellation initiated. Full refund will process within 5 minutes.')} className="btn-booking-cancel">
                <XCircle size={16} />
                <span>Cancel Ticket (Instant Refund)</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
