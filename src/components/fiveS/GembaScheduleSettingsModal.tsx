import React, { useState } from 'react';
import { 
  X, Save, Users, Calendar, Clock, Plus, Trash2, 
  ShieldCheck, AlertCircle, Info, Sparkles 
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  DayOfWeek, 
  GembaScheduleConfig, 
  saveLocalGembaScheduleConfig 
} from '../../lib/gembaAuditorScheduleEngine';
import AuditorDirectoryPicker from './AuditorDirectoryPicker';

interface GembaScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GembaScheduleConfig;
  onSaveConfig: (updated: GembaScheduleConfig) => void;
  employees: Employee[];
}

const ALL_DAYS: DayOfWeek[] = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export default function GembaScheduleSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  employees
}: GembaScheduleSettingsModalProps) {
  const [schedule, setSchedule] = useState<GembaScheduleConfig['schedule']>({ ...config.schedule });
  const [weekendDays, setWeekendDays] = useState<DayOfWeek[]>([...config.weekendDays]);
  const [scheduledTime, setScheduledTime] = useState<string>(config.scheduledTime || '10:30 AM');
  const [autoOverdueAfterHour, setAutoOverdueAfterHour] = useState<number>(config.autoOverdueAfterHour || 17);
  
  // Custom holidays state
  const [customHolidays, setCustomHolidays] = useState<Array<{ id: string; date: string; name: string }>>(
    [...(config.customHolidays || [])]
  );
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayName, setNewHolidayName] = useState<string>('');

  // Active tab: 'auditors' | 'weekends' | 'holidays'
  const [activeTab, setActiveTab] = useState<'auditors' | 'weekends' | 'holidays'>('auditors');

  if (!isOpen) return null;

  const handleAuditorTextChange = (day: DayOfWeek, text: string) => {
    const names = text.split(',').map(s => s.trim()).filter(Boolean);
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        auditorNames: names
      }
    }));
  };

  const handleAuditorNamesChange = (day: DayOfWeek, names: string[]) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        auditorNames: names
      }
    }));
  };

  const handleZonesChange = (day: DayOfWeek, text: string) => {
    const zones = text.split(',').map(s => s.trim()).filter(Boolean);
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        inspectionZones: zones
      }
    }));
  };

  const handleToggleDayActive = (day: DayOfWeek) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isActive: !prev[day].isActive
      }
    }));
  };

  const handleToggleWeekendDay = (day: DayOfWeek) => {
    setWeekendDays(prev => {
      const exists = prev.includes(day);
      if (exists) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleAddCustomHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    setCustomHolidays(prev => [
      ...prev,
      { id: `HOL-CUST-${Date.now()}`, date: newHolidayDate, name: newHolidayName.trim() }
    ]);
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleRemoveCustomHoliday = (id: string) => {
    setCustomHolidays(prev => prev.filter(h => h.id !== id));
  };

  const handleSave = () => {
    const updated: GembaScheduleConfig = {
      ...config,
      schedule,
      weekendDays,
      scheduledTime,
      autoOverdueAfterHour,
      customHolidays
    };
    saveLocalGembaScheduleConfig(updated);
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Daily Gemba Auditors Schedule & Rules
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Configure weekly auditor rosters, weekend off days & holiday skips
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('auditors')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'auditors'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Daily Auditor Roster
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weekends')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'weekends'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Weekends & Audit Timing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('holidays')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'holidays'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Company Holidays Skip
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4">
          
          {/* 1. Daily Auditors Tab */}
          {activeTab === 'auditors' && (
            <div className="space-y-3.5">
              <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Everyone can see this schedule in the Gemba Walks tab. Separate multiple names with commas (e.g., <strong>Rakib, Jewel</strong>).
                </span>
              </div>

              {ALL_DAYS.map(day => {
                const item = schedule[day] || { dayOfWeek: day, auditorNames: [], isActive: true };
                const isWeekend = weekendDays.includes(day);

                return (
                  <div 
                    key={day} 
                    className={`p-3.5 rounded-xl border transition ${
                      isWeekend 
                        ? 'bg-slate-50/70 border-slate-200/70 opacity-80' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 w-28">
                          {day}
                        </span>
                        {isWeekend ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-slate-200 text-slate-700">
                            Weekend Off
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Scheduled Working Day
                          </span>
                        )}
                      </div>

                      <div className="text-2xs text-slate-400 font-medium">
                        {item.auditorNames.length} {item.auditorNames.length === 1 ? 'Auditor' : 'Auditors'} Assigned
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                      <AuditorDirectoryPicker
                        day={day}
                        auditorNames={item.auditorNames}
                        onChange={(names) => handleAuditorNamesChange(day, names)}
                        disabled={isWeekend}
                        employees={employees}
                      />

                      <div>
                        <label className="text-2xs font-bold text-slate-500 block mb-1">
                          Inspection Zones / Focus:
                        </label>
                        <input
                          type="text"
                          disabled={isWeekend}
                          value={(item.inspectionZones || []).join(', ')}
                          onChange={(e) => handleZonesChange(day, e.target.value)}
                          placeholder="e.g. Sewing Line 1-4, Cutting"
                          className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-rose-500 font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Weekends & Timing Tab */}
          {activeTab === 'weekends' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-black text-slate-900 block mb-1">
                  Official Weekend Off Days (No Gemba Walk Scheduled)
                </label>
                <p className="text-2xs text-slate-500 mb-3">
                  On selected weekend days, the Gemba walk will never be scheduled and will never trigger overdue alerts.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_DAYS.map(day => {
                    const isWeekend = weekendDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleWeekendDay(day)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isWeekend
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{day}</span>
                        {isWeekend && <span className="text-2xs px-1 rounded bg-rose-500 text-white">Off</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Daily Scheduled Walk Time</span>
                  </label>
                  <p className="text-2xs text-slate-500 mb-2">
                    Standard target inspection window displayed to staff.
                  </p>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-rose-500"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Daily Overdue Cutoff Hour</span>
                  </label>
                  <p className="text-2xs text-slate-500 mb-2">
                    Hour of the day (24h format) after which today is flagged overdue if not conducted.
                  </p>
                  <select
                    value={autoOverdueAfterHour}
                    onChange={(e) => setAutoOverdueAfterHour(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-rose-500 cursor-pointer"
                  >
                    <option value={12}>12:00 PM (Noon Cutoff)</option>
                    <option value={15}>3:00 PM (Afternoon Shift)</option>
                    <option value={17}>5:00 PM (End of Day Shift - Standard)</option>
                    <option value={19}>7:00 PM (Evening Shift)</option>
                    <option value={23}>11:59 PM (End of Calendar Day)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. Holidays Skip Tab */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900">
                <span className="font-bold block mb-0.5">Automated Holiday Protection:</span>
                The engine automatically references company and national holidays from the Central Holidays Database. You can also specify extra factory holidays below. Walks are never scheduled or flagged overdue on holidays.
              </div>

              {/* Add Custom Holiday */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="text-2xs font-extrabold uppercase tracking-wider text-slate-600 block mb-2">
                  Add Factory Holiday Override
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-rose-500 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. Annual Plant Maintenance Day)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-rose-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomHoliday}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* List of Custom Holidays */}
              {customHolidays.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    Custom Plant Holidays ({customHolidays.length}):
                  </span>
                  {customHolidays.map(h => (
                    <div
                      key={h.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-rose-600" />
                        <span className="font-bold text-slate-900">{h.date}</span>
                        <span className="text-slate-600 font-medium">— {h.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomHoliday(h.id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No additional custom holidays added. Default corporate holidays are active.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Schedule Rules</span>
          </button>
        </div>

      </div>
    </div>
  );
}
