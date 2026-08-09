import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, Check, Building2, Sparkles, X } from 'lucide-react';

export const CITY_OPTIONS = [
  { city: 'New York, NY', terminal: 'Port Authority Bus Terminal', state: 'New York', popular: true, busesDaily: 48 },
  { city: 'Boston, MA', terminal: 'South Station Express Hub', state: 'Massachusetts', popular: true, busesDaily: 36 },
  { city: 'Washington, DC', terminal: 'Union Station Upper Deck', state: 'District of Columbia', popular: true, busesDaily: 32 },
  { city: 'Philadelphia, PA', terminal: '30th Street Transit Concourse', state: 'Pennsylvania', popular: true, busesDaily: 28 },
  { city: 'Los Angeles, CA', terminal: 'Union Station Gateway Plaza', state: 'California', popular: true, busesDaily: 42 },
  { city: 'Las Vegas, NV', terminal: 'South Strip Intermodal Terminal', state: 'Nevada', popular: true, busesDaily: 38 },
  { city: 'Miami, FL', terminal: 'Miami Airport Intermodal Station', state: 'Florida', popular: true, busesDaily: 34 },
  { city: 'Orlando, FL', terminal: 'Orlando Downtown Transit Hub', state: 'Florida', popular: true, busesDaily: 30 },
  { city: 'Chicago, IL', terminal: 'Union Station Coach Concourse', state: 'Illinois', popular: true, busesDaily: 40 },
  { city: 'Detroit, MI', terminal: 'Rosa Parks Transit Center', state: 'Michigan', popular: false, busesDaily: 20 },
  { city: 'Seattle, WA', terminal: 'King Street Coach Terminal', state: 'Washington', popular: false, busesDaily: 22 },
  { city: 'Portland, OR', terminal: 'Curbside Downtown Transit Plaza', state: 'Oregon', popular: false, busesDaily: 18 },
  { city: 'San Francisco, CA', terminal: 'Salesforce Transit Center', state: 'California', popular: false, busesDaily: 24 },
  { city: 'Austin, TX', terminal: 'Downtown Metro Intercity Hub', state: 'Texas', popular: false, busesDaily: 26 },
  { city: 'Atlanta, GA', terminal: 'Civic Center Bus Concourse', state: 'Georgia', popular: false, busesDaily: 25 },
];

export default function CitySelect({
  label = 'City',
  value = 'New York, NY',
  onChange,
  iconType = 'origin',
  placeholder = 'Select station...',
  excludeCity = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedItem = CITY_OPTIONS.find((c) => c.city === value) || {
    city: value,
    terminal: 'Major Transit Hub',
    state: ''
  };

  const filteredCities = CITY_OPTIONS.filter((item) => {
    if (excludeCity && item.city === excludeCity) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.city.toLowerCase().includes(q) ||
      item.terminal.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q)
    );
  });

  const popularCities = CITY_OPTIONS.filter((c) => c.popular && c.city !== value);

  const handleSelect = (city) => {
    onChange(city);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="custom-select-trigger-icon-box">
          <MapPin
            size={18}
            className={iconType === 'origin' ? 'select-icon-origin' : 'select-icon-dest'}
          />
        </div>

        <div className="custom-select-trigger-content">
          <span className="custom-select-label-text">{label}</span>
          <div className="custom-select-value-text">{selectedItem.city}</div>
          <span className="custom-select-sub-text">{selectedItem.terminal}</span>
        </div>

        <div className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`}>
          <ChevronDown size={16} />
        </div>
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="custom-select-popover" role="listbox">
          
          {/* Popover Search Bar */}
          <div className="custom-select-search-header">
            <div className="custom-select-search-box">
              <Search size={15} className="custom-select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, airport, or station..."
                className="custom-select-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="custom-select-search-clear"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Popular Pills */}
          {!searchQuery && (
            <div className="custom-select-popular-section">
              <div className="custom-select-section-title">
                <Sparkles size={12} className="text-amber-400" />
                <span>Popular Corridors</span>
              </div>
              <div className="custom-select-popular-pills">
                {popularCities.slice(0, 5).map((pop) => (
                  <button
                    key={pop.city}
                    type="button"
                    onClick={() => handleSelect(pop.city)}
                    className="custom-select-popular-chip"
                  >
                    {pop.city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* City Options List */}
          <div className="custom-select-options-list">
            <div className="custom-select-section-title">
              <Building2 size={12} />
              <span>Available Transit Terminals ({filteredCities.length})</span>
            </div>

            {filteredCities.length === 0 ? (
              <div className="custom-select-no-results">
                No matching cities or terminals found for "{searchQuery}"
              </div>
            ) : (
              filteredCities.map((item) => {
                const isSelected = item.city === value;
                return (
                  <button
                    key={item.city}
                    type="button"
                    onClick={() => handleSelect(item.city)}
                    className={`custom-select-option-item ${isSelected ? 'selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="custom-select-option-pin">
                      <MapPin
                        size={15}
                        className={isSelected ? 'text-cyan-400' : 'theme-text-muted'}
                      />
                    </div>

                    <div className="custom-select-option-info">
                      <div className="custom-select-option-city">
                        <span>{item.city}</span>
                        {item.popular && (
                          <span className="custom-select-popular-tag">Hub</span>
                        )}
                      </div>
                      <div className="custom-select-option-terminal">
                        {item.terminal}
                      </div>
                    </div>

                    <div className="custom-select-option-meta">
                      <span className="custom-select-bus-count">
                        {item.busesDaily} buses/day
                      </span>
                      {isSelected && (
                        <div className="custom-select-check-icon">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
