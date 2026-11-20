import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
        <span className="page-badge">DEMO TRACKER</span>
        <h1 className="page-title">Simulated Bus Tracker</h1>
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
        </div>
      )}

    </div>
  );
}
