import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ShieldCheck } from 'lucide-react';

import SearchWidget from '../components/SearchWidget';
import BusCard from '../components/BusCard';
import SeatPicker from '../components/SeatPicker';
import TicketModal from '../components/TicketModal';
import { MOCK_BUSES } from '../data/mockData';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || 'New York, NY';
  const to = searchParams.get('to') || 'Boston, MA';

  const [selectedBusId, setSelectedBusId] = useState(null);
  const [activeBookingDetails, setActiveBookingDetails] = useState(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState(60);
  const [sortBy, setSortBy] = useState('departure');

  // Filter Buses
  const filteredBuses = MOCK_BUSES.filter((bus) => {
    if (selectedCategory === 'sleeper' && !bus.busType.toLowerCase().includes('sleeper')) return false;
    if (selectedCategory === 'seater' && !bus.busType.toLowerCase().includes('seater')) return false;
    if (bus.price > maxPrice) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return a.departureTime.localeCompare(b.departureTime);
  });

  const handleSelectSeats = (bus) => {
    if (selectedBusId === bus.id) {
      setSelectedBusId(null);
    } else {
      setSelectedBusId(bus.id);
    }
  };

  const handleBookingComplete = (bookingDetails) => {
    setActiveBookingDetails(bookingDetails);
    setSelectedBusId(null);
  };

  return (
    <div className="page-container search-page container">
      
      {/* Sleek Hero Header Block with Embedded Search Widget */}
      <div className="search-header-container">
        <div className="search-header-top">
          <div className="search-header-title-block">
            <span className="page-badge">VERIFIED LUXURY EXPRESS</span>
            <h1 className="search-page-title">Bus Search Results</h1>
            <p className="search-page-subtitle">
              Showing available luxury coaches from <span className="search-highlight">{from}</span> to <span className="search-highlight">{to}</span>
            </p>
          </div>
          <div className="search-guarantee-pill">
            <ShieldCheck size={16} />
            <span>Guaranteed Seat Availability</span>
          </div>
        </div>

        <SearchWidget compact={true} initialFrom={from} initialTo={to} />
      </div>

      {/* Main Grid: Sidebar Filters + Bus Results */}
      <div className="search-layout-grid">
        
        {/* Left Filters Sidebar */}
        <aside className="search-filters-sidebar">
          
          <div className="filters-header">
            <div className="filters-title-group">
              <SlidersHorizontal size={16} className="highlight-cyan" />
              <span>Filter Results</span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setMaxPrice(60);
                setSortBy('departure');
              }}
              className="filters-reset-btn"
            >
              Reset
            </button>
          </div>

          {/* Sort By */}
          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="departure">Departure Time (Earliest)</option>
              <option value="price">Lowest Fare First</option>
              <option value="rating">Top Passenger Rating</option>
            </select>
          </div>

          {/* Bus Category */}
          <div className="filter-group">
            <label className="filter-label">Bus Class</label>
            <div className="filter-category-buttons">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                All Bus Classes
              </button>
              <button
                onClick={() => setSelectedCategory('sleeper')}
                className={`filter-btn ${selectedCategory === 'sleeper' ? 'active' : ''}`}
              >
                Pod-Sleeper Only
              </button>
              <button
                onClick={() => setSelectedCategory('seater')}
                className={`filter-btn ${selectedCategory === 'seater' ? 'active' : ''}`}
              >
                VIP Executive Seater
              </button>
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="filter-price-slider">
            <div className="filter-price-row">
              <span className="filter-label">Max Price</span>
              <span className="highlight-cyan">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="filter-range-slider"
            />
          </div>

          {/* Amenities */}
          <div className="filter-amenities-group">
            <label className="filter-label">Included Amenities</label>
            <div className="filter-amenities-list">
              <label className="filter-checkbox-label">
                <input type="checkbox" defaultChecked className="filter-checkbox" />
                <span>Wi-Fi 6 Ultra Fast</span>
              </label>
              <label className="filter-checkbox-label">
                <input type="checkbox" defaultChecked className="filter-checkbox" />
                <span>Personal Reading Pod Light</span>
              </label>
              <label className="filter-checkbox-label">
                <input type="checkbox" defaultChecked className="filter-checkbox" />
                <span>Satellite Live GPS Feed</span>
              </label>
            </div>
          </div>

        </aside>

        {/* Right Buses list & Seat picker accordion */}
        <div className="search-results-col">
          
          <div className="search-results-info">
            <span>Found <strong>{filteredBuses.length}</strong> matching luxury buses</span>
            <span className="highlight-cyan">• All buses include AC & Live Telematics</span>
          </div>

          {filteredBuses.map((bus) => (
            <div key={bus.id} className="search-bus-item">
              <BusCard
                bus={bus}
                isSelected={selectedBusId === bus.id}
                onSelectSeats={handleSelectSeats}
              />

              {/* Inline Seat Selector Drawer */}
              {selectedBusId === bus.id && (
                <div className="search-seat-picker-drawer">
                  <SeatPicker bus={bus} onComplete={handleBookingComplete} />
                </div>
              )}
            </div>
          ))}

        </div>

      </div>

      {/* Confetti Boarding Ticket Modal */}
      {activeBookingDetails && (
        <TicketModal
          bookingDetails={activeBookingDetails}
          onClose={() => setActiveBookingDetails(null)}
        />
      )}

    </div>
  );
}
