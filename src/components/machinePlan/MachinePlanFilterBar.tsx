import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { 
  MachinePlanFilterState, 
  DateFilterPreset, 
  MachineStatusType 
} from '../../types/machinePlan';
import { getDateRangeForPreset } from '../../lib/machinePlanEngine';

interface MachinePlanFilterBarProps {
  filter: MachinePlanFilterState;
  onChangeFilter: (newFilter: MachinePlanFilterState) => void;
  departments: string[];
  machineModels: string[];
  uoms: string[];
  totalRecordsCount: number;
  filteredRecordsCount: number;
}

const DATE_PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'specific', label: 'Specific Date' },
  { id: 'range', label: 'Date Range' },
];

const MACHINE_STATUS_OPTIONS: MachineStatusType[] = [
  'Running',
  'Planned',
  'Idle',
  'Breakdown',
  'Maintenance',
  'Holiday',
  'No Plan',
  'Completed',
  'Partially Completed'
];

export default function MachinePlanFilterBar({
  filter,
  onChangeFilter,
  departments,
  machineModels,
  uoms,
  totalRecordsCount,
  filteredRecordsCount
}: MachinePlanFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle date preset change
  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset === 'specific' || preset === 'range') {
      onChangeFilter({
        ...filter,
        datePreset: preset
      });
      return;
    }
    const range = getDateRangeForPreset(preset);
    onChangeFilter({
      ...filter,
      datePreset: preset,
      startDate: range.start,
      endDate: range.end
    });
  };

  const handleReset = () => {
    const todayRange = getDateRangeForPreset('today');
    onChangeFilter({
      datePreset: 'today',
      startDate: todayRange.start,
      endDate: todayRange.end,
      department: 'All',
      machineModel: 'All',
      machineStatus: 'All',
      sku: '',
      mo: '',
      uom: 'All',
      achievementStatus: 'All',
      ueeRange: 'all',
      searchQuery: ''
    });
  };

  // Count active non-default filters
  const activeFilterCount = [
    filter.department !== 'All',
    filter.machineModel !== 'All',
    filter.machineStatus !== 'All',
    filter.sku.trim() !== '',
    filter.mo.trim() !== '',
    filter.uom !== 'All',
    filter.achievementStatus !== 'All',
    filter.ueeRange !== 'all',
    filter.searchQuery.trim() !== '',
    filter.datePreset !== 'today'
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 space-y-3" id="machine-plan-filter-bar">
      {/* Top row: Date Presets + Universal Search + Filter Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Date presets pill group */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {DATE_PRESETS.map(p => {
            const isActive = filter.datePreset === p.id;
            return (
              <button
                key={p.id}
                id={`date-preset-${p.id}`}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Search input & Advanced toggle */}
        <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="machine-plan-universal-search"
              type="text"
              placeholder="Search Machine, Department, SKU, MO..."
              value={filter.searchQuery}
              onChange={e => onChangeFilter({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />
            {filter.searchQuery && (
              <button
                onClick={() => onChangeFilter({ ...filter, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="toggle-advanced-filters-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              showAdvanced || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              id="reset-filters-btn"
              onClick={handleReset}
              title="Reset All Filters"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date Pickers (Shown for Specific Date or Range) */}
      {(filter.datePreset === 'specific' || filter.datePreset === 'range') && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">
              {filter.datePreset === 'specific' ? 'Date:' : 'From:'}
            </span>
            <input
              id="machine-plan-start-date"
              type="date"
              value={filter.startDate}
              onChange={e => {
                const s = e.target.value;
                onChangeFilter({
                  ...filter,
                  startDate: s,
                  endDate: filter.datePreset === 'specific' ? s : filter.endDate
                });
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {filter.datePreset === 'range' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">To:</span>
              <input
                id="machine-plan-end-date"
                type="date"
                value={filter.endDate}
                onChange={e => onChangeFilter({ ...filter, endDate: e.target.value })}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Advanced Filter Dropdowns Drawer */}
      {showAdvanced && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 animate-fadeIn">
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Department
            </label>
            <select
              id="filter-department-select"
              value={filter.department}
              onChange={e => onChangeFilter({ ...filter, department: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Machine Model Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Machine Model
            </label>
            <select
              id="filter-machine-model-select"
              value={filter.machineModel}
              onChange={e => onChangeFilter({ ...filter, machineModel: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Machines</option>
              {machineModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Machine Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              id="filter-machine-status-select"
              value={filter.machineStatus}
              onChange={e => onChangeFilter({ ...filter, machineStatus: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              {MACHINE_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Achievement Status */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Achievement %
            </label>
            <select
              id="filter-achievement-status-select"
              value={filter.achievementStatus}
              onChange={e => onChangeFilter({ ...filter, achievementStatus: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Tiers</option>
              <option value="excellent">≥100% On Target</option>
              <option value="good">95–99.99% Near Target</option>
              <option value="attention">85–94.99% Attention</option>
              <option value="critical">&lt;85% Critical</option>
            </select>
          </div>

          {/* UEE Range */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Total UEE %
            </label>
            <select
              id="filter-uee-range-select"
              value={filter.ueeRange}
              onChange={e => onChangeFilter({ ...filter, ueeRange: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All UEE</option>
              <option value="high">≥85% High</option>
              <option value="medium">75–84.99% Medium</option>
              <option value="low">&lt;75% Low</option>
              <option value="na">N/A (No Data)</option>
            </select>
          </div>

          {/* UOM */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              UOM
            </label>
            <select
              id="filter-uom-select"
              value={filter.uom}
              onChange={e => onChangeFilter({ ...filter, uom: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All UOMs</option>
              {uoms.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* SKU / MO quick search */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              SKU / Style
            </label>
            <input
              id="filter-sku-input"
              type="text"
              placeholder="e.g. SKU-101"
              value={filter.sku}
              onChange={e => onChangeFilter({ ...filter, sku: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Record Counter & Summary Tag */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <div>
          Showing <span className="font-semibold text-slate-800">{filteredRecordsCount}</span> of <span className="font-semibold text-slate-800">{totalRecordsCount}</span> machine records
          {filter.startDate && filter.endDate && (
            <span className="ml-2 text-slate-400">
              ({filter.startDate === filter.endDate ? filter.startDate : `${filter.startDate} to ${filter.endDate}`})
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={handleReset}
            className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
