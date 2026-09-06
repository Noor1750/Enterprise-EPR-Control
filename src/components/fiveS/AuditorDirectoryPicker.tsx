import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Users, ChevronDown, ChevronUp, Check, X, 
  Plus, Edit3, User, Sparkles
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { DayOfWeek } from '../../lib/gembaAuditorScheduleEngine';

export interface AuditorDirectoryPickerProps {
  day: DayOfWeek;
  auditorNames: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  employees?: Employee[];
}

export default function AuditorDirectoryPicker({
  day,
  auditorNames = [],
  onChange,
  disabled = false,
  employees = []
}: AuditorDirectoryPickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isRawTextMode, setIsRawTextMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Consolidated Directory: Use passed employees or fallback to cached localStorage directory
  const directory = useMemo(() => {
    let list = Array.isArray(employees) && employees.length > 0 ? employees : [];
    if (list.length === 0 && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('erp_employees_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }
      } catch {
        // safe fallback
      }
    }

    // Filter valid entries with non-empty names
    const valid = list.filter(e => e && typeof e.name === 'string' && e.name.trim().length > 0);
    
    // Sort alphabetically by name
    return [...valid].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  // Unique departments for fast category filtering
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    directory.forEach(e => {
      if (e.department && e.department.trim()) {
        depts.add(e.department.trim());
      }
    });
    return ['All', ...Array.from(depts).sort()];
  }, [directory]);

  // Filtered employees list based on search & department
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return directory.filter(emp => {
      if (selectedDept !== 'All' && emp.department !== selectedDept) {
        return false;
      }
      if (!q) return true;
      const nameMatch = emp.name.toLowerCase().includes(q);
      const idMatch = (emp.id || '').toLowerCase().includes(q);
      const deptMatch = (emp.department || '').toLowerCase().includes(q);
      const desigMatch = (emp.designation || '').toLowerCase().includes(q);
      return nameMatch || idMatch || deptMatch || desigMatch;
    });
  }, [directory, searchQuery, selectedDept]);

  // Toggle single auditor in/out of selected list
  const toggleAuditor = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = auditorNames.some(n => n.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      onChange(auditorNames.filter(n => n.toLowerCase() !== trimmed.toLowerCase()));
    } else {
      onChange([...auditorNames, trimmed]);
    }
  };

  const removeAuditor = (nameToRemove: string) => {
    onChange(auditorNames.filter(n => n !== nameToRemove));
  };

  const handleRawTextChange = (text: string) => {
    const names = text.split(',').map(s => s.trim()).filter(Boolean);
    onChange(names);
  };

  const handleAddCustom = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      toggleAuditor(trimmed);
      setSearchQuery('');
    }
  };

  // Weekend / Disabled state
  if (disabled) {
    return (
      <div>
        <label className="text-2xs font-bold text-slate-500 block mb-1">
          Assigned Auditors (comma-separated):
        </label>
        <input
          type="text"
          disabled
          value=""
          placeholder="Weekend Off - No walk scheduled"
          className="w-full text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 font-medium cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-2xs font-bold text-slate-600 flex items-center gap-1.5">
          <span>Assigned Auditors (comma-separated):</span>
          {auditorNames.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-rose-100 text-rose-800">
              {auditorNames.length}
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={() => setIsRawTextMode(prev => !prev)}
          className="text-3xs font-bold text-slate-400 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
          title="Switch between Employee Directory search/dropdown and direct comma-separated text editing"
        >
          <Edit3 className="w-2.5 h-2.5" />
          <span>{isRawTextMode ? 'Directory Mode' : 'Direct Text'}</span>
        </button>
      </div>

      {isRawTextMode ? (
        /* Raw comma-separated text editing mode */
        <div>
          <input
            type="text"
            value={auditorNames.join(', ')}
            onChange={(e) => handleRawTextChange(e.target.value)}
            placeholder="e.g. Jewel, Rakib, Noor Alam"
            className="w-full text-xs px-3 py-1.5 bg-white border border-rose-300 rounded-lg focus:outline-rose-500 font-bold text-slate-900 shadow-2xs"
          />
          <span className="text-3xs text-slate-400 mt-0.5 block">
            Type comma-separated names. Click &ldquo;Directory Mode&rdquo; to use employee search & dropdown.
          </span>
        </div>
      ) : (
        /* Employee Directory Search & Dropdown Mode */
        <div className="space-y-1.5">
          {/* Assigned Auditors Badges */}
          {auditorNames.length > 0 && (
            <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border border-slate-200/80 rounded-lg">
              {auditorNames.map(name => {
                const matchedEmp = directory.find(e => e.name.toLowerCase() === name.toLowerCase());
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-extrabold bg-white text-slate-800 border border-slate-200 shadow-2xs animate-in fade-in"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-700 text-3xs font-black flex items-center justify-center shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate max-w-[120px]">{name}</span>
                    {matchedEmp?.department && (
                      <span className="text-3xs text-slate-400 font-normal">({matchedEmp.department})</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAuditor(name);
                      }}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full p-0.5 transition cursor-pointer"
                      title={`Remove ${name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
              {auditorNames.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-3xs font-bold text-slate-400 hover:text-rose-600 px-1.5 py-0.5 transition cursor-pointer ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Search Input Bar with Dropdown Trigger */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 transition shadow-2xs">
            <div className="pl-2.5 text-slate-400 pointer-events-none flex items-center">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={auditorNames.length === 0 ? "Search directory by name, ID, or dept..." : "Add more from directory..."}
              className="w-full text-xs pl-2 pr-2 py-1.5 bg-transparent border-none outline-none font-medium text-slate-800 placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredEmployees.length > 0) {
                    toggleAuditor(filteredEmployees[0].name);
                    setSearchQuery('');
                  } else if (searchQuery.trim()) {
                    handleAddCustom();
                  }
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(prev => !prev)}
              className="px-2.5 py-1.5 text-slate-600 hover:text-rose-600 flex items-center gap-1 text-2xs font-bold border-l border-slate-200 transition cursor-pointer bg-slate-50 hover:bg-slate-100"
              title="Browse Employee Directory dropdown"
            >
              <Users className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Directory</span>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Floating Dropdown Menu Panel */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1">
              {/* Directory Filter Header */}
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-2xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-rose-500" />
                    <span>Employee Directory ({filteredEmployees.length} matching)</span>
                  </span>
                  <span className="text-3xs text-slate-400">
                    Click to assign / remove
                  </span>
                </div>

                {/* Department filter chips */}
                {availableDepartments.length > 2 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                    {availableDepartments.map(dept => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className={`px-1.5 py-0.5 rounded text-3xs font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedDept === dept
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable Employee Directory List */}
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => {
                    const isAssigned = auditorNames.some(n => n.toLowerCase() === emp.name.toLowerCase());
                    const initials = emp.name
                      .split(' ')
                      .filter(Boolean)
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'EM';

                    return (
                      <div
                        key={emp.id || emp.name}
                        onClick={() => toggleAuditor(emp.name)}
                        className={`p-2 flex items-center justify-between hover:bg-rose-50/60 cursor-pointer transition ${
                          isAssigned ? 'bg-rose-50/80 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-3xs font-black shrink-0 ${
                            isAssigned
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-slate-900 truncate flex items-center gap-1.5">
                              <span className={isAssigned ? 'font-black text-rose-900' : 'font-semibold'}>
                                {emp.name}
                              </span>
                              {emp.id && (
                                <span className="text-3xs px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                                  {emp.id}
                                </span>
                              )}
                            </div>
                            <div className="text-3xs text-slate-500 truncate">
                              {emp.designation || 'Staff'} {emp.department ? `• ${emp.department}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 text-3xs font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300 shadow-2xs">
                              <Check className="w-2.5 h-2.5" />
                              <span>Assigned</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-slate-400 hover:text-rose-600">
                              <Plus className="w-2.5 h-2.5" />
                              <span>Add</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3.5 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">No directory matches found for &ldquo;{searchQuery}&rdquo;</p>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-2xs font-bold shadow-2xs transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add &ldquo;{searchQuery.trim()}&rdquo; as custom auditor</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-2xs">
                <span className="text-slate-500 font-semibold">
                  {auditorNames.length} {auditorNames.length === 1 ? 'auditor' : 'auditors'} assigned for {day}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-3xs font-extrabold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
