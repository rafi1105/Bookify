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
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Search Header Widget */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold theme-text-main font-display">Bus Search Results</h1>
            <p className="text-xs theme-text-sub">Showing available luxury coaches from <span className="text-cyan-500 font-bold">{from}</span> to <span className="text-cyan-500 font-bold">{to}</span></p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Guaranteed Seat Availability</span>
          </div>
        </div>

        <SearchWidget compact={true} initialFrom={from} initialTo={to} />
      </div>

      {/* Main Grid: Sidebar Filters + Bus Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 3 cols: Filters Sidebar */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-3xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-white shadow-md space-y-6 sticky top-28">
          
          <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 border-slate-200">
            <div className="flex items-center space-x-2 theme-text-main font-bold font-display text-sm">
              <SlidersHorizontal className="w-4 h-4 text-cyan-500" />
              <span>Filter Results</span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setMaxPrice(60);
                setSortBy('departure');
              }}
              className="text-[11px] text-cyan-500 hover:underline font-semibold"
            >
              Reset
            </button>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="block text-xs font-bold theme-text-sub uppercase tracking-wider">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3.5 py-2.5 dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-300 rounded-xl text-xs theme-text-main focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
            >
              <option value="departure">Departure Time (Earliest)</option>
              <option value="price">Lowest Fare First</option>
              <option value="rating">Top Passenger Rating</option>
            </select>
          </div>

          {/* Bus Category */}
          <div className="space-y-2">
            <label className="block text-xs font-bold theme-text-sub uppercase tracking-wider">Bus Class</label>
            <div className="flex flex-col space-y-2 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2.5 rounded-xl text-left font-medium transition-colors ${
                  selectedCategory === 'all' ? 'bg-cyan-500/20 text-cyan-500 font-bold border border-cyan-500/30' : 'theme-text-sub hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Bus Classes
              </button>
              <button
                onClick={() => setSelectedCategory('sleeper')}
                className={`px-3.5 py-2.5 rounded-xl text-left font-medium transition-colors ${
                  selectedCategory === 'sleeper' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30' : 'theme-text-sub hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Pod-Sleeper Only
              </button>
              <button
                onClick={() => setSelectedCategory('seater')}
                className={`px-3.5 py-2.5 rounded-xl text-left font-medium transition-colors ${
                  selectedCategory === 'seater' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-500/30' : 'theme-text-sub hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                VIP Executive Seater
              </button>
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="theme-text-sub uppercase tracking-wider">Max Price</span>
              <span className="text-cyan-500">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Amenities */}
          <div className="space-y-2 pt-2 border-t dark:border-slate-800 border-slate-200">
            <label className="block text-xs font-bold theme-text-sub uppercase tracking-wider">Included Amenities</label>
            <div className="space-y-2 text-xs theme-text-sub">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-cyan-500 rounded" />
                <span>Wi-Fi 6 Ultra Fast</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-cyan-500 rounded" />
                <span>Personal Reading Pod Light</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-cyan-500 rounded" />
                <span>Satellite Live GPS Feed</span>
              </label>
            </div>
          </div>

        </div>

        {/* Right 9 cols: Buses list & Seat picker accordion */}
        <div className="lg:col-span-9 space-y-6">
          
          <div className="search-results-info">
            <span>Found <strong className="theme-text-main font-bold">{filteredBuses.length}</strong> matching luxury buses</span>
            <span className="text-cyan-500 font-semibold">• All buses include AC & Live Telematics</span>
          </div>

          {filteredBuses.map((bus) => (
            <div key={bus.id} className="space-y-4">
              <BusCard
                bus={bus}
                isSelected={selectedBusId === bus.id}
                onSelectSeats={handleSelectSeats}
              />

              {/* Inline Seat Selector Drawer */}
              {selectedBusId === bus.id && (
                <div className="p-6 rounded-3xl glass-panel border border-cyan-500/40 dark:bg-slate-900 bg-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
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
