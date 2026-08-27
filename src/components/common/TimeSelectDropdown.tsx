import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check, Zap, X } from 'lucide-react';

interface TimeSelectDropdownProps {
  value: string;
  onChange: (timeStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  defaultToNowOnMount?: boolean;
  intervalMinutes?: number; // default 5 or 15
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function TimeSelectDropdown({
  value,
  onChange,
  placeholder = 'Select time (HH:MM)...',
  disabled = false,
  required = false,
  className = '',
  id,
  defaultToNowOnMount = false,
  intervalMinutes = 15
}: TimeSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto initialize with current time if empty and requested
  useEffect(() => {
    if (defaultToNowOnMount && (!value || !value.trim())) {
      onChange(getCurrentTimeHHMM());
    }
  }, [defaultToNowOnMount]);

  // Generate 24-hour time slots based on interval (e.g. 15 or 5 minutes)
  const timeSlots = useMemo(() => {
    const slots: { value: string; label: string; period: string }[] = [];
    const step = Math.max(5, intervalMinutes);
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label12 = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
      
      slots.push({
        value: val,
        label: `${val} (${label12})`,
        period
      });
    }
    return slots;
  }, [intervalMinutes]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    if (!searchTerm.trim()) return timeSlots;
    const query = searchTerm.toLowerCase().trim();
    return timeSlots.filter(s => 
      s.value.includes(query) || 
      s.label.toLowerCase().includes(query)
    );
  }, [timeSlots, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSetCurrentTime = () => {
    const nowTime = getCurrentTimeHHMM();
    onChange(nowTime);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id}>
      {/* Control Input Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen(prev => !prev);
          }}
          className={`flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold flex items-center justify-between text-left transition-all ${
            disabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : isOpen 
                ? 'ring-2 ring-indigo-500 border-indigo-500 text-slate-800' 
                : 'text-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            {value ? (
              <span className="text-slate-900 font-bold">{value}</span>
            ) : (
              <span className="text-slate-400 font-normal font-sans">{placeholder}</span>
            )}
          </div>

          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </button>

        {/* Quick Now Button */}
        {!disabled && (
          <button
            type="button"
            onClick={handleSetCurrentTime}
            title="Set to current local time"
            className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
          >
            <Zap className="w-3 h-3 text-indigo-600" />
            <span className="hidden sm:inline">Now</span>
          </button>
        )}
      </div>

      {/* Hidden input for native form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header Action: Current Time Button */}
          <div className="p-2 border-b border-slate-100 bg-indigo-50/70 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="flex-1 text-left px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Current Time: {getCurrentTimeHHMM()}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to filter or custom time (e.g. 14:20)..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Custom Time Accept if typed valid HH:MM */}
          {searchTerm.trim() && !filteredSlots.some(s => s.value === searchTerm.trim()) && (
            <div className="px-2 pt-1">
              <button
                type="button"
                onClick={() => handleSelect(searchTerm.trim())}
                className="w-full text-left p-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-between"
              >
                <span>Use custom time: <span className="font-mono underline">{searchTerm.trim()}</span></span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          )}

          {/* List of Time Slots */}
          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
            {filteredSlots.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching standard intervals. Click above to use custom time.
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const isSelected = slot.value === value;
                return (
                  <button
                    type="button"
                    key={slot.value}
                    onClick={() => handleSelect(slot.value)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{slot.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
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
