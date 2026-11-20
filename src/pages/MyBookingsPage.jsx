import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, XCircle } from 'lucide-react';
import LiveGPSTracker from '../components/LiveGPSTracker';
import { assignScenarios } from '../lib/tripSimulation.js';

const demoTrips = [
  { bookingId: 'BK-894210', busName: 'Demo Coach 101', from: 'Dhaka', to: 'Chattogram', departureTime: '07:30 AM', seats: ['L4'] },
  { bookingId: 'BK-894211', busName: 'Demo Coach 202', from: 'Dhaka', to: "Cox’s Bazar", departureTime: '10:30 PM', seats: ['L4', 'L5'] },
  { bookingId: 'BK-894212', busName: 'Demo Coach 303', from: 'Dhaka', to: 'Bogura', departureTime: '08:00 AM', seats: ['A2'] },
];

export default function MyBookingsPage() {
  const [selectedTrip, setSelectedTrip] = useState(0);
  const [scenarios] = useState(() => assignScenarios());
  const [tick, setTick] = useState(0);
  const activeBooking = demoTrips[selectedTrip];

  useEffect(() => {
    const timer = setInterval(() => setTick((current) => current + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <span className="page-badge">MY BOOKINGS</span>
        <h1 className="page-title">Manage Tickets & Track Your Bus</h1>
        <p className="page-subtitle">Choose a demo booking to see simulated trip progress.</p>
        <div className="booking-lookup-form">
          <select
            aria-label="Demo booking"
            className="booking-lookup-input"
            value={selectedTrip}
            onChange={(event) => setSelectedTrip(Number(event.target.value))}
          >
            {demoTrips.map((trip, index) => (
              <option key={trip.bookingId} value={index}>{trip.bookingId} · {trip.busName}</option>
            ))}
          </select>
          <button type="button" className="booking-lookup-btn" onClick={() => setTick(0)}>
            <RefreshCw size={16} />
            Replay
          </button>
        </div>
      </div>

      {activeBooking && (
        <div className="booking-telematics-view">
          <LiveGPSTracker
            busName={activeBooking.busName}
            origin={activeBooking.from}
            destination={activeBooking.to}
            scenario={scenarios[selectedTrip]}
            tick={tick}
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
                  Demo booking
                </span>
              </div>
            </div>

            <div className="booking-details-grid">
              <div className="booking-detail-item">
                <span className="booking-detail-label">PASSENGER</span>
                <span className="booking-detail-val">Demo Passenger</span>
              </div>
              <div className="booking-detail-item">
                <span className="booking-detail-label">DATE & DEPARTURE</span>
                <span className="booking-detail-val">{activeBooking.departureTime}</span>
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
