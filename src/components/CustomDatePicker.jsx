import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';

export default function CustomDatePicker({
  label = 'Travel Date',
  value = '2026-08-15',
  onChange,
  timeSlot = 'all',
  onTimeSlotChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Parse initial selected date
  const parseDate = (str) => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(str);
  };

  const selectedDateObj = parseDate(value);
  const [viewYear, setViewYear] = useState(selectedDateObj.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(selectedDateObj.getMonth() || 7); // 0-indexed (7 = Aug)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Calculate days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const formatDateString = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleSelectDay = (day) => {
    const newDateStr = formatDateString(viewYear, viewMonth, day);
    onChange(newDateStr);
    setIsOpen(false);
  };

  // Quick Presets
  const setQuickDate = (offsetDays) => {
    const today = new Date();
    today.setDate(today.getDate() + offsetDays);
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    const newDateStr = formatDateString(y, m, d);
    onChange(newDateStr);
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    try {
      const d = parseDate(value);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const yearNum = d.getFullYear();
      return `${dayName}, ${monthName} ${dayNum}, ${yearNum}`;
    } catch {
      return value;
    }
  };

  // Check if a day is currently selected
  const isDaySelected = (day) => {
    return (
      selectedDateObj.getFullYear() === viewYear &&
      selectedDateObj.getMonth() === viewMonth &&
      selectedDateObj.getDate() === day
    );
  };

  const timeSlots = [
    { id: 'all', label: 'Any Time', icon: '🕒' },
    { id: 'morning', label: 'Morning (06-12)', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon (12-18)', icon: '☀️' },
    { id: 'evening', label: 'Evening (18-24)', icon: '🌙' },
  ];

  return (
    <div className="custom-datepicker-wrapper" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-datepicker-trigger ${isOpen ? 'active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="custom-datepicker-icon-box">
          <CalendarIcon size={18} />
        </div>

        <div className="custom-datepicker-content">
          <span className="custom-datepicker-label-text">{label}</span>
          <div className="custom-datepicker-value-text">{formatDisplayDate()}</div>
          <span className="custom-datepicker-sub-text">
            {timeSlot === 'all' ? 'Flexible departure time' : `${timeSlot.toUpperCase()} departure`}
          </span>
        </div>
      </button>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="custom-datepicker-popover">
          
          {/* Quick Preset Pills */}
          <div className="datepicker-presets-row">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="datepicker-preset-btn"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="datepicker-preset-btn"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(2)}
              className="datepicker-preset-btn"
            >
              +2 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="datepicker-preset-btn"
            >
              Next Week
            </button>
          </div>

          {/* Calendar Month Header */}
          <div className="datepicker-month-header">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="datepicker-nav-btn"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="datepicker-month-title">
              {monthNames[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="datepicker-nav-btn"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="datepicker-weekdays-grid">
            {daysOfWeek.map((dow, i) => (
              <div key={i} className="datepicker-weekday-cell">
                {dow}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="datepicker-days-grid">
            {/* Empty slots for offset */}
            {[...Array(firstDayIndex)].map((_, i) => (
              <div key={`empty-${i}`} className="datepicker-day-empty"></div>
            ))}

            {/* Days of Month */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const isSelected = isDaySelected(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`datepicker-day-btn ${isSelected ? 'selected' : ''}`}
                >
                  <span>{day}</span>
                </button>
              );
            })}
          </div>

          {/* Time Slot Preference */}
          {onTimeSlotChange && (
            <div className="datepicker-times-section">
              <div className="datepicker-times-title">
                <Clock size={12} className="text-cyan-400" />
                <span>Preferred Departure Window</span>
              </div>
              <div className="datepicker-times-chips">
                {timeSlots.map((ts) => (
                  <button
                    key={ts.id}
                    type="button"
                    onClick={() => onTimeSlotChange(ts.id)}
                    className={`datepicker-time-chip ${timeSlot === ts.id ? 'active' : ''}`}
                  >
                    <span>{ts.icon}</span>
                    <span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
