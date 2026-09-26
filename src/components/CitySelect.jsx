import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, Check, Building2, Sparkles, X } from 'lucide-react';

export const CITY_OPTIONS = [
  { city: 'Dhaka', terminal: 'Sayedabad & Arambagh Central Hub', state: 'Dhaka Division', popular: true, busesDaily: 140 },
  { city: 'Chattogram', terminal: 'Dampara Bus Station / AK Khan', state: 'Chattogram Division', popular: true, busesDaily: 95 },
  { city: "Cox's Bazar", terminal: 'Kolatoli Beach Terminal & Dolphin Mor', state: 'Chattogram Division', popular: true, busesDaily: 80 },
  { city: 'Sylhet', terminal: 'Kadamtoli Central Bus Terminal', state: 'Sylhet Division', popular: true, busesDaily: 65 },
  { city: 'Rajshahi', terminal: 'Shiroil Bus Terminal / Railgate', state: 'Rajshahi Division', popular: true, busesDaily: 50 },
  { city: 'Khulna', terminal: 'Sonadanga Central Bus Terminal', state: 'Khulna Division', popular: true, busesDaily: 45 },
  { city: 'Barishal', terminal: 'Nathullabad Central Terminal (Padma Exp)', state: 'Barishal Division', popular: true, busesDaily: 48 },
  { city: 'Rangpur', terminal: 'Modern Mor Intercity Terminal', state: 'Rangpur Division', popular: false, busesDaily: 35 },
  { city: 'Bogura', terminal: 'Charmatha Central Bus Terminal', state: 'Rajshahi Division', popular: false, busesDaily: 40 },
  { city: 'Cumilla', terminal: 'Paduar Bazar World Road Concourse', state: 'Chattogram Division', popular: false, busesDaily: 38 },
  { city: 'Sreemangal', terminal: 'Habiganj Road Tea Valley Terminal', state: 'Sylhet Division', popular: false, busesDaily: 28 },
  { city: 'Kuakata', terminal: 'Zero Point Sagar Kannya Terminal', state: 'Barishal Division', popular: false, busesDaily: 24 },
  { city: 'Bandarban', terminal: 'Meghla Tourist Concourse', state: 'Chattogram Division', popular: false, busesDaily: 22 },
  { city: 'Mymensingh', terminal: 'Maskanda Intercity Bus Station', state: 'Mymensingh Division', popular: false, busesDaily: 32 },
  { city: 'Feni', terminal: 'Mohipal Highway Transit Hub', state: 'Chattogram Division', popular: false, busesDaily: 30 },
  { city: 'Kushtia', terminal: 'Chourhas Intercity Terminal', state: 'Khulna Division', popular: false, busesDaily: 25 },
];

export default function CitySelect({
  label = 'City',
  value = 'Dhaka',
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
                placeholder="Search city, terminal, or division (e.g. Dhaka, Dampara)..."
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
