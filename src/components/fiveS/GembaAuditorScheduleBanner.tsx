import React, { useState } from 'react';
import { 
  Calendar, Clock, User, CheckCircle2, AlertTriangle, 
  ShieldCheck, ChevronRight, Settings, Users, CalendarOff, 
  Sparkles, AlertCircle, Eye, ArrowRight, MapPin
} from 'lucide-react';
import { 
  DayOfWeek, 
  GembaScheduleConfig, 
  GembaWalkSession, 
  evaluateGembaWalkDate,
  getOverdueGembaWalks,
  GembaDayEvaluation 
} from '../../lib/gembaAuditorScheduleEngine';
import { GembaWalkItem } from '../../lib/gembaWalkEngine';
import { HolidayRecord } from '../../lib/holidayEngine';
import { format } from 'date-fns';

interface GembaAuditorScheduleBannerProps {
  config: GembaScheduleConfig;
  items: GembaWalkItem[];
  sessions: GembaWalkSession[];
  holidays: HolidayRecord[];
  onOpenConductModal: (targetDate?: string) => void;
  onOpenWeeklyRoster: () => void;
  onOpenSettingsModal: () => void;
  canEdit?: boolean;
}

export default function GembaAuditorScheduleBanner({
  config,
  items,
  sessions,
  holidays,
  onOpenConductModal,
  onOpenWeeklyRoster,
  onOpenSettingsModal,
  canEdit = true
}: GembaAuditorScheduleBannerProps) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const dayOfWeek = format(now, 'EEEE') as DayOfWeek;

  // Evaluate today's status
  const todayEval = evaluateGembaWalkDate(now, {
    items,
    sessions,
    config,
    holidays,
    now
  });

  // Check for any overdue walks in the past 14 days (excluding weekends & holidays)
  const overdueWalks = getOverdueGembaWalks(14, {
    items,
    sessions,
    config,
    holidays,
    now
  });

  const scheduledToday = config.schedule[dayOfWeek];
  const auditorsToday = scheduledToday?.auditorNames || [];
  const zonesToday = scheduledToday?.inspectionZones || [];

  return (
    <div className="space-y-3">
      {/* 1. High-Priority Overdue Alert Banner (if any scheduled walk was missed/overdue) */}
      {overdueWalks.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                  Gemba Walk Overdue!
                </span>
                <span className="text-xs font-bold text-rose-100">
                  {overdueWalks.length} {overdueWalks.length === 1 ? 'day not conducted' : 'days not conducted'}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5 font-medium">
                Missed walk: <strong>{overdueWalks[0].dateStr} ({overdueWalks[0].dayOfWeek})</strong> assigned to{' '}
                <strong>{overdueWalks[0].assignedAuditors.join(', ') || 'Assigned Auditors'}</strong> was not conducted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenConductModal(overdueWalks[0].dateStr)}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>Conduct Walk Now</span>
            </button>
            <button
              type="button"
              onClick={onOpenWeeklyRoster}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              View Roster
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Daily Auditor Schedule Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Today's Schedule & Responsible Auditors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            
              {/* Calendar & Day Block */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-2xs border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  {dayOfWeek.slice(0, 3)}
                </span>
                <span className="text-base font-bold leading-none mt-0.5">
                  {format(now, 'dd')}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Today's Auditor Schedule
                  </span>
                  
                  {/* Status Indicator Pill */}
                  {todayEval.status === 'Conducted' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Conducted & Completed</span>
                    </span>
                  )}
                  {todayEval.status === 'Overdue' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>OVERDUE (Not Conducted)</span>
                    </span>
                  )}
                  {todayEval.status === 'Pending' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Pending Today ({config.scheduledTime})</span>
                    </span>
                  )}
                  {todayEval.status === 'Weekend Off' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <CalendarOff className="w-3 h-3 text-slate-500" />
                      <span>Weekend Off (No Walk)</span>
                    </span>
                  )}
                  {todayEval.status === 'Holiday' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>Holiday: {todayEval.holidayName} (No Walk)</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {dayOfWeek}, {format(now, 'MMMM d, yyyy')}
                </h3>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block w-px h-10 bg-slate-200" />

            {/* Auditors List for Today */}
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-700">
                  <Users className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Responsible Auditors • {dayOfWeek}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {config.scheduledTime || '10:00 AM'}
                </span>
              </div>

              {todayEval.isWeekend ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                  <CalendarOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Weekly Off Day • No floor audit scheduled for today.</span>
                </div>
              ) : todayEval.isHoliday ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{todayEval.holidayName} • Plant holiday, no floor audit scheduled.</span>
                </div>
              ) : auditorsToday.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {auditorsToday.map((name, idx) => {
                    const initials = name
                      .split(' ')
                      .filter(Boolean)
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'AU';
                    return (
                      <div
                        key={name}
                        className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
                      >
                        {/* Smart Avatar Badge */}
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-[10px] flex items-center justify-center shadow-2xs ring-1 ring-slate-200">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Lead Auditor {idx + 1}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {zonesToday.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] font-semibold text-amber-900 shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong className="font-bold">Target Zones:</strong> {zonesToday.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>No auditors assigned for {dayOfWeek}. Click "Edit Schedule" to assign.</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Conduct Walk Button */}
            {!todayEval.isWeekend && !todayEval.isHoliday && (
              <button
                type="button"
                onClick={() => onOpenConductModal(todayStr)}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer ${
                  todayEval.isConducted
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : todayEval.isOverdue
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{todayEval.isConducted ? 'View / Re-Sign Walk' : 'Conduct Gemba Walk'}</span>
              </button>
            )}

            {/* Weekly Roster Button */}
            <button
              type="button"
              onClick={onOpenWeeklyRoster}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs"
              title="View all 7 days auditor schedule"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Weekly Roster</span>
            </button>

            {/* Schedule Settings Button */}
            {canEdit && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
                title="Edit Daily Auditors & Rules"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Weekly Day Strips for at-a-glance transparency */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-5 py-2.5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
            {[
              { day: 'Saturday', auditors: config.schedule.Saturday?.auditorNames || ['Rakib', 'Jewel'] },
              { day: 'Sunday', auditors: config.schedule.Sunday?.auditorNames || ['Mamun', 'Noor', 'Tarak'] },
              { day: 'Monday', auditors: config.schedule.Monday?.auditorNames || ['Rahim', 'Turab', 'Shakil', 'Alam'] },
              { day: 'Tuesday', auditors: config.schedule.Tuesday?.auditorNames || ['Arif', 'Sumon', 'Faruk'] },
              { day: 'Wednesday', auditors: config.schedule.Wednesday?.auditorNames || ['Tanvir', 'Hasan', 'Kabir'] },
              { day: 'Thursday', auditors: config.schedule.Thursday?.auditorNames || ['Shajib', 'Mizan', 'Nayeem'] },
              { day: 'Friday', auditors: config.weekendDays.includes('Friday') ? [] : config.schedule.Friday?.auditorNames || [] }
            ].map(item => {
              const isTodayItem = item.day === dayOfWeek;
              const isWeekendItem = config.weekendDays.includes(item.day as DayOfWeek);

              return (
                <div
                  key={item.day}
                  onClick={onOpenWeeklyRoster}
                  className={`px-3 py-1.5 rounded-xl border text-left shrink-0 cursor-pointer transition ${
                    isTodayItem
                      ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/30'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isTodayItem ? 'text-rose-700' : 'text-slate-500'
                    }`}>
                      {item.day.slice(0, 3)}
                    </span>
                    {isTodayItem && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                    {isWeekendItem 
                      ? <span className="text-slate-400 font-normal">Weekend Off</span>
                      : item.auditors.length > 0 ? item.auditors.join(' & ') : 'No auditor'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
