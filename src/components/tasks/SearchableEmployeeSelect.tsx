import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User, Building2, Briefcase, Users, Sparkles } from 'lucide-react';

export interface EmployeeOption {
  id: string;
  name: string;
  designation: string;
  department: string;
  raw?: string[];
}

interface SearchableEmployeeSelectProps {
  employees: string[][];
  selectedId: string;
  onSelect: (employee: EmployeeOption | null) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

// Consistent avatar background color based on name string
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-purple-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
    'bg-cyan-600 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function SearchableEmployeeSelect({
  employees,
  selectedId,
  onSelect,
  required = false,
  disabled = false,
  placeholder = 'Search & select employee by name, ID, or department...',
  className = '',
  error = false
}: SearchableEmployeeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDeptTab, setActiveDeptTab] = useState('All');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize raw employee array into structured objects
  const employeeList: EmployeeOption[] = useMemo(() => {
    return employees
      .filter(row => row && row[0] && row[1])
      .map(row => ({
        id: (row[0] || '').trim(),
        name: (row[1] || '').trim(),
        designation: (row[2] || '').trim(),
        department: (row[3] || '').trim(),
        raw: row
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  // Current selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedId) return null;
    return employeeList.find(e => e.id.toLowerCase() === selectedId.toLowerCase()) || null;
  }, [employeeList, selectedId]);

  // Distinct departments for filter tabs
  const departments = useMemo(() => {
    const set = new Set<string>();
    employeeList.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employeeList]);

  // Filtered employees based on search term & department tab
  const filteredEmployees = useMemo(() => {
    let list = employeeList;

    if (activeDeptTab !== 'All') {
      list = list.filter(e => e.department.toLowerCase() === activeDeptTab.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(e => 
        e.name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term) ||
        e.designation.toLowerCase().includes(term)
      );
    }

    return list;
  }, [employeeList, activeDeptTab, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectEmployee = (emp: EmployeeOption) => {
    onSelect(emp);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button / Control */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2 bg-white border rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-75' 
            : isOpen 
              ? 'border-[#1ECA98] ring-2 ring-[#1ECA98]/20 bg-white' 
              : error 
                ? 'border-rose-400 bg-rose-50/20 hover:border-rose-500' 
                : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selectedEmployee ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarColor(selectedEmployee.name)}`}>
              {selectedEmployee.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-gray-900 truncate">
                  {selectedEmployee.name}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                  {selectedEmployee.id}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                {selectedEmployee.department && (
                  <span className="text-[#128a67] font-semibold">
                    {selectedEmployee.department}
                  </span>
                )}
                {selectedEmployee.designation && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500 truncate">{selectedEmployee.designation}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-gray-400 text-xs">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedEmployee && !disabled && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Clear assignee"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#1ECA98]' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[300px] sm:min-w-[400px] max-w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in flex flex-col max-h-[400px]">
          {/* Header Search Input */}
          <div className="p-3 bg-gray-50/80 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type name, employee ID, department, or role..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#1ECA98] focus:border-[#1ECA98] placeholder:text-gray-400 shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Quick Filter Tabs */}
            {departments.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveDeptTab('All')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    activeDeptTab === 'All'
                      ? 'bg-[#1ECA98] text-white shadow-2xs'
                      : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-200/80'
                  }`}
                >
                  All ({employeeList.length})
                </button>
                {departments.map(dept => {
                  const count = employeeList.filter(e => e.department.toLowerCase() === dept.toLowerCase()).length;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setActiveDeptTab(dept)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                        activeDeptTab === dept
                          ? 'bg-[#1ECA98] text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-200/80'
                      }`}
                    >
                      {dept} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List of Employees */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50 p-1.5">
            {filteredEmployees.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No employees found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  No employee matches "{searchTerm}" in {activeDeptTab === 'All' ? 'any department' : activeDeptTab}.
                </p>
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedId && emp.id.toLowerCase() === selectedId.toLowerCase();

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200/60'
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarColor(emp.name)}`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {emp.name}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 shrink-0">
                            {emp.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                          {emp.department && (
                            <span className="font-semibold text-gray-700">
                              {emp.department}
                            </span>
                          )}
                          {emp.designation && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400 truncate">{emp.designation}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#1ECA98] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between px-3">
            <span>Showing {filteredEmployees.length} of {employeeList.length} employees</span>
            <span>Click to select assignee</span>
          </div>
        </div>
      )}
    </div>
  );
}
