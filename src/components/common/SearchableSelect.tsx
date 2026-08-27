import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: (string | SearchableOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  allowCustom?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  className = '',
  id,
  allowCustom = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const query = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter(opt => 
      opt.label.toLowerCase().includes(query) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query)) ||
      (opt.badge && opt.badge.toLowerCase().includes(query)) ||
      opt.value.toLowerCase().includes(query)
    );
  }, [normalizedOptions, searchTerm]);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(opt => opt.value === value) || (value ? { value, label: value } : null);
  }, [normalizedOptions, value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id}>
      {/* Control Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        className={`w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-between text-left transition-all ${
          disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : isOpen 
              ? 'ring-2 ring-indigo-500 border-indigo-500 text-slate-800' 
              : 'text-slate-800 hover:border-slate-400'
        }`}
      >
        <div className="flex-1 truncate pr-2 flex items-center gap-1.5">
          {selectedOption ? (
            <>
              <span className="font-semibold text-slate-900 truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  selectedOption.badgeColor || 'bg-indigo-50 text-indigo-700'
                }`}>
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && !required && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </button>

      {/* Hidden input for native form validation if required */}
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
        <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
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

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                {allowCustom && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="w-full text-left text-xs text-indigo-600 font-bold p-1.5 hover:bg-indigo-50 rounded-lg"
                  >
                    Use custom value: "{searchTerm.trim()}"
                  </button>
                ) : (
                  <span>No matching results found</span>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const isItemDisabled = Boolean(opt.disabled);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    disabled={isItemDisabled}
                    onClick={() => {
                      if (!isItemDisabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isItemDisabled
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-75 select-none'
                        : isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`truncate ${isItemDisabled ? 'line-through text-slate-400' : ''}`}>{opt.label}</span>
                        {opt.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            opt.badgeColor || (isItemDisabled ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200')
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <div className={`text-[11px] font-normal truncate mt-0.5 ${isItemDisabled ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    {isSelected && !isItemDisabled && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
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
