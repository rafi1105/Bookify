import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowRightLeft, Search, Sparkles, ShieldCheck } from 'lucide-react';
import CitySelect from './CitySelect';
import CustomDatePicker from './CustomDatePicker';

export default function SearchWidget({ compact = false, initialFrom = '', initialTo = '', initialDate = '2026-08-15' }) {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState(initialFrom || 'New York, NY');
  const [toCity, setToCity] = useState(initialTo || 'Boston, MA');
  const [date, setDate] = useState(initialDate || '2026-08-15');
  const [busClass, setBusClass] = useState('all');
  const [timeSlot, setTimeSlot] = useState('all');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      const temp = fromCity;
      setFromCity(toCity);
      setToCity(temp);
      setIsSwapping(false);
    }, 200);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(
      `/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${date}&class=${busClass}&time=${timeSlot}`
    );
  };

  return (
    <div className={`search-widget-card ${compact ? 'compact' : ''}`}>
      
      {!compact && (
        <div className="search-widget-header">
          <div className="search-widget-header-title-row">
            <span className="search-widget-icon-box">
              <Bus size={20} />
            </span>
            <div className="search-widget-title-block">
              <h3 className="search-widget-title">Find & Book Your Luxury Bus</h3>
              <p className="search-widget-subtitle">Search over 500+ daily intercity express routes with VIP amenities</p>
            </div>
          </div>

          <div className="search-class-pills">
            <button
              type="button"
              onClick={() => setBusClass('all')}
              className={`search-class-pill-btn ${busClass === 'all' ? 'active-all' : ''}`}
            >
              All Coaches
            </button>
            <button
              type="button"
              onClick={() => setBusClass('sleeper')}
              className={`search-class-pill-btn ${busClass === 'sleeper' ? 'active-sleeper' : ''}`}
            >
              <Sparkles size={13} className="mr-1 inline" />
              Sleeper Pods
            </button>
            <button
              type="button"
              onClick={() => setBusClass('executive')}
              className={`search-class-pill-btn ${busClass === 'executive' ? 'active-executive' : ''}`}
            >
              VIP Seater
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="search-widget-form-grid">
        
        {/* Origin Custom Dropdown */}
        <div className="search-grid-cell">
          <CitySelect
            label="Departure Station"
            value={fromCity}
            onChange={setFromCity}
            iconType="origin"
            excludeCity={toCity}
          />
        </div>

        {/* Swap Button */}
        <div className="search-grid-swap-cell">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap departure and destination"
            className={`btn-swap-locations ${isSwapping ? 'swapping' : ''}`}
          >
            <ArrowRightLeft size={16} />
          </button>
        </div>

        {/* Destination Custom Dropdown */}
        <div className="search-grid-cell">
          <CitySelect
            label="Destination Station"
            value={toCity}
            onChange={setToCity}
            iconType="dest"
            excludeCity={fromCity}
          />
        </div>

        {/* Date & Time Picker */}
        <div className="search-grid-cell date-cell">
          <CustomDatePicker
            label="Travel Date & Window"
            value={date}
            onChange={setDate}
            timeSlot={timeSlot}
            onTimeSlotChange={setTimeSlot}
          />
        </div>

        {/* Search CTA */}
        <div className="search-grid-cta-cell">
          <button type="submit" className="btn-search-cta">
            <Search size={18} />
            <span>Search Available Buses</span>
          </button>
        </div>

      </form>
    </div>
  );
}
