import React, { useState } from 'react';
import { User, CheckCircle2, Info, ArrowRight, ShieldCheck, MapPin, Clock, DollarSign, Settings, Bath, Check } from 'lucide-react';

export default function SeatPicker({ bus, onComplete }) {
  const [deck, setDeck] = useState('lower');
  const [selectedSeats, setSelectedSeats] = useState(['L4']);
  const [boardingPoint, setBoardingPoint] = useState(bus.boardingPoints[0]);
  const [droppingPoint, setDroppingPoint] = useState(bus.droppingPoints[0]);

  const [passenger, setPassenger] = useState({
    fullName: 'Alex Vance',
    email: 'alex.vance@example.com',
    phone: '+1 (555) 234-5678',
    age: '28',
    gender: 'Male'
  });

  const lowerSeats = [
    { id: 'L1', label: '1L', status: 'available', price: bus.price },
    { id: 'L2', label: '2L', status: 'female', price: bus.price },
    { id: 'L3', label: '3L', status: 'occupied', price: bus.price },
    { id: 'L4', label: '4L', status: 'selected', price: bus.price },
    { id: 'L5', label: '5L', status: 'available', price: bus.price },
    { id: 'L6', label: '6L', status: 'available', price: bus.price },
    { id: 'L7', label: '7L', status: 'occupied', price: bus.price },
    { id: 'L8', label: '8L', status: 'available', price: bus.price },
    { id: 'L9', label: '9L', status: 'female', price: bus.price },
    { id: 'L10', label: '10L', status: 'available', price: bus.price },
    { id: 'L11', label: '11L', status: 'available', price: bus.price },
    { id: 'L12', label: '12L', status: 'occupied', price: bus.price },
  ];

  const upperSeats = [
    { id: 'U1', label: '1U', status: 'available', price: bus.price + 5 },
    { id: 'U2', label: '2U', status: 'available', price: bus.price + 5 },
    { id: 'U3', label: '3U', status: 'female', price: bus.price + 5 },
    { id: 'U4', label: '4U', status: 'available', price: bus.price + 5 },
    { id: 'U5', label: '5U', status: 'occupied', price: bus.price + 5 },
    { id: 'U6', label: '6U', status: 'available', price: bus.price + 5 },
    { id: 'U7', label: '7U', status: 'available', price: bus.price + 5 },
    { id: 'U8', label: '8U', status: 'available', price: bus.price + 5 },
    { id: 'U9', label: '9U', status: 'occupied', price: bus.price + 5 },
    { id: 'U10', label: '10U', status: 'available', price: bus.price + 5 },
    { id: 'U11', label: '11U', status: 'available', price: bus.price + 5 },
    { id: 'U12', label: '12U', status: 'available', price: bus.price + 5 },
  ];

  const currentSeats = deck === 'lower' ? lowerSeats : upperSeats;

  const toggleSeat = (seatId, status) => {
    if (status === 'occupied') return;

    if (selectedSeats.includes(seatId)) {
      if (selectedSeats.length > 1) {
        setSelectedSeats(selectedSeats.filter(s => s !== seatId));
      }
    } else {
      if (selectedSeats.length < 4) {
        setSelectedSeats([...selectedSeats, seatId]);
      }
    }
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((acc, seatId) => {
      const isUpper = seatId.startsWith('U');
      return acc + bus.price + (isUpper ? 5 : 0);
    }, 0);
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    const bookingDetails = {
      bus,
      seats: selectedSeats,
      totalAmount: calculateTotal(),
      boardingPoint,
      droppingPoint,
      passenger,
      bookingId: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    onComplete(bookingDetails);
  };

  return (
    <div className="seat-picker-grid">
      
      {/* Left 7 cols: Bus Deck & Seat Grid */}
      <div className="seat-picker-main-col space-y-6">
        <div className="seat-picker-card">
          
          <div className="seat-picker-header">
            <div>
              <h4 className="seat-picker-title">Select Your Seat Layout</h4>
              <p className="seat-picker-subtitle">Click on available seats to reserve (Max 4 seats)</p>
            </div>

            {/* Deck Switcher */}
            <div className="seat-deck-switcher">
              <button
                onClick={() => setDeck('lower')}
                className={`seat-deck-btn ${deck === 'lower' ? 'active' : ''}`}
              >
                Lower Deck
              </button>
              <button
                onClick={() => setDeck('upper')}
                className={`seat-deck-btn ${deck === 'upper' ? 'active-upper' : ''}`}
              >
                Upper Deck (+ $5)
              </button>
            </div>
          </div>

          {/* Seat Status Legend */}
          <div className="seat-legend-row">
            <div className="seat-legend-item">
              <div className="seat-legend-indicator available"></div>
              <span>Available</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-indicator selected">✓</div>
              <span>Selected</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-indicator female">♀</div>
              <span>Ladies Reserved</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-indicator occupied"></div>
              <span>Booked</span>
            </div>
          </div>

          {/* Bus Interior Grid */}
          <div className="seat-interior-container">
            
            <div className="seat-interior-cabin-bar">
              <div className="seat-legend-item">
                <span className="seat-interior-front-tag">FRONT</span>
                <span className="seat-picker-subtitle">Driver Cabin</span>
              </div>
              <div className="seat-interior-driver-icon">
                <Settings className="w-4 h-4 text-cyan-500" />
              </div>
            </div>

            <div className="seat-interior-grid">
              {currentSeats.map((seat) => {
                const isSelected = selectedSeats.includes(seat.id);
                const isOccupied = seat.status === 'occupied';
                const isFemale = seat.status === 'female';

                return (
                  <button
                    key={seat.id}
                    disabled={isOccupied}
                    onClick={() => toggleSeat(seat.id, seat.status)}
                    className={`seat-interior-btn ${
                      isSelected
                        ? 'selected'
                        : isOccupied
                        ? 'occupied'
                        : isFemale
                        ? 'female'
                        : ''
                    }`}
                  >
                    <span className="seat-picker-title">{seat.label}</span>
                    <span className="seat-picker-subtitle">${seat.price}</span>

                    {isSelected && (
                      <span className="seat-interior-btn-check">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="seat-interior-footer-bar flex items-center justify-between text-xs">
              <span>Back Door & Emergency Exit</span>
              <span className="flex items-center space-x-1">
                <Bath className="w-3.5 h-3.5 text-cyan-500" />
                <span>Onboard Restroom</span>
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Right 5 cols: Passenger Details & Solid CTA */}
      <div className="seat-passenger-col">
        <form onSubmit={handleCheckoutSubmit} className="seat-checkout-card">
          
          <div className="seat-checkout-header">
            <h4 className="seat-checkout-title">Passenger Information</h4>
            <p className="seat-checkout-subtitle">Tickets will be sent instantly to your email & phone</p>
          </div>

          <div className="seat-form-fields">
            <div className="seat-form-group">
              <label className="seat-form-label">Full Name</label>
              <input
                type="text"
                required
                value={passenger.fullName}
                onChange={(e) => setPassenger({ ...passenger, fullName: e.target.value })}
              />
            </div>

            <div className="seat-form-grid-2">
              <div className="seat-form-group">
                <label className="seat-form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={passenger.email}
                  onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                />
              </div>
              <div className="seat-form-group">
                <label className="seat-form-label">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={passenger.phone}
                  onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="seat-form-fields pt-2">
              <div className="seat-form-group">
                <label className="search-label">Boarding Point</label>
                <select
                  value={boardingPoint}
                  onChange={(e) => setBoardingPoint(e.target.value)}
                >
                  {bus.boardingPoints.map((bp, i) => (
                    <option key={i} value={bp}>{bp}</option>
                  ))}
                </select>
              </div>

              <div className="seat-form-group">
                <label className="search-label">Dropping Point</label>
                <select
                  value={droppingPoint}
                  onChange={(e) => setDroppingPoint(e.target.value)}
                >
                  {bus.droppingPoints.map((dp, i) => (
                    <option key={i} value={dp}>{dp}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          <div className="seat-price-summary-box space-y-2">
            <div className="flex justify-between text-xs theme-text-sub">
              <span>Selected Seat(s):</span>
              <span className="font-bold text-cyan-500">{selectedSeats.join(', ')}</span>
            </div>
            <div className="flex justify-between text-xs theme-text-sub">
              <span>Base Ticket Price:</span>
              <span>${bus.price.toFixed(2)} x {selectedSeats.length}</span>
            </div>
            <div className="flex justify-between text-xs theme-text-sub">
              <span>Service Fee & GPS Tax:</span>
              <span>$2.50</span>
            </div>
            <div className="pt-2 border-t theme-border flex justify-between items-center text-sm font-bold theme-text-main">
              <span>Total Payable Amount:</span>
              <span className="text-lg font-extrabold text-cyan-500 font-display">${(calculateTotal() + 2.5).toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-search-cta py-4"
          >
            <span>Proceed to Express Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-center theme-text-muted flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Guaranteed 100% Instant Refund on 24h Cancellation</span>
          </p>

        </form>
      </div>

    </div>
  );
}
