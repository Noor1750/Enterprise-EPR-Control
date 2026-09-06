import React from 'react';
import { 
  X, Calendar, Clock, MapPin, User, CheckCircle2, 
  AlertTriangle, ShieldCheck, ChevronRight, Settings, 
  CalendarOff, Sparkles, Check
} from 'lucide-react';
import { 
  DayOfWeek, 
  GembaScheduleConfig, 
  GembaWalkSession, 
  evaluateGembaWalkDate,
  GembaDayEvaluation 
} from '../../lib/gembaAuditorScheduleEngine';
import { GembaWalkItem } from '../../lib/gembaWalkEngine';
import { HolidayRecord } from '../../lib/holidayEngine';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';

interface GembaWeeklyRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GembaScheduleConfig;
  items: GembaWalkItem[];
  sessions: GembaWalkSession[];
  holidays: HolidayRecord[];
  onOpenConductModal: (targetDate: string) => void;
  onOpenSettingsModal: () => void;
  canEdit?: boolean;
}

const ORDERED_DAYS: DayOfWeek[] = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export default function GembaWeeklyRosterModal({
  isOpen,
  onClose,
  config,
  items,
  sessions,
  holidays,
  onOpenConductModal,
  onOpenSettingsModal,
  canEdit = true
}: GembaWeeklyRosterModalProps) {
  if (!isOpen) return null;

  const now = new Date();
  const currentDayOfWeek = format(now, 'EEEE') as DayOfWeek;
  const todayStr = format(now, 'yyyy-MM-dd');

  // Compute the current week's dates starting from Saturday
  // In date-fns startOfWeek with weekStartsOn: 6 is Saturday
  const weekStart = startOfWeek(now, { weekStartsOn: 6 });

  // Map each day of this current week with its evaluation
  const weekDaysEvaluated: Array<{
    dayOfWeek: DayOfWeek;
    dateStr: string;
    evaluation: GembaDayEvaluation;
  }> = ORDERED_DAYS.map((day, idx) => {
    const d = addDays(weekStart, idx);
    const dateStr = format(d, 'yyyy-MM-dd');
    const evaluation = evaluateGembaWalkDate(d, {
      items,
      sessions,
      config,
      holidays,
      now
    });
    return {
      dayOfWeek: day,
      dateStr,
      evaluation
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 px-5 sm:px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  Gemba Daily Auditors Schedule & Roster
                </h3>
                <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  Weekly Rotation
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Full transparency for all floor auditors, supervisors, and department leads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-rose-400" />
                <span>Edit Schedule</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schedule Subtitle & Legend */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Standard Audit Window:</span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {config.scheduledTime} Daily
            </span>
          </div>

          {/* Badges Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Conducted
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <AlertTriangle className="w-3 h-3" /> Overdue
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Clock className="w-3 h-3" /> Pending Today
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
              Weekend Off
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Holiday Skip
            </span>
          </div>
        </div>

        {/* 7-Day Schedule Roster */}
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-3">
          {weekDaysEvaluated.map(({ dayOfWeek, dateStr, evaluation }) => {
            const isToday = evaluation.isToday;
            const scheduledInfo = config.schedule[dayOfWeek];
            const isWeekend = evaluation.isWeekend;
            const isHoliday = evaluation.isHoliday;
            const isConducted = evaluation.isConducted;
            const isOverdue = evaluation.isOverdue;

            // Border and background highlighting
            let cardClasses = 'bg-white border-slate-200 hover:border-slate-300';
            if (isToday) {
              cardClasses = 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-500/20 shadow-xs';
            } else if (isOverdue) {
              cardClasses = 'bg-rose-50/60 border-rose-300';
            } else if (isWeekend) {
              cardClasses = 'bg-slate-50/80 border-slate-200/80 opacity-80';
            }

            return (
              <div
                key={dayOfWeek}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardClasses}`}
              >
                {/* Day & Date info */}
                <div className="flex items-start gap-3.5 min-w-[200px]">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                    isToday
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : isOverdue
                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <span className="text-3xs font-black uppercase tracking-wider">
                      {dayOfWeek.slice(0, 3)}
                    </span>
                    <span className="text-base font-black leading-none mt-0.5">
                      {dateStr.slice(8)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">
                        {dayOfWeek}
                      </h4>
                      {isToday && (
                        <span className="px-1.5 py-0.2 text-3xs font-black bg-rose-600 text-white rounded uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-2xs text-slate-400 font-medium block">
                      {dateStr}
                    </span>

                    {/* Status Badge */}
                    <div className="mt-1">
                      {isConducted && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Walk Completed ({evaluation.findingsCount} findings)</span>
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{evaluation.statusLabel}</span>
                        </span>
                      )}
                      {evaluation.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending Today's Walk</span>
                        </span>
                      )}
                      {isWeekend && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                          <CalendarOff className="w-3 h-3 text-slate-500" />
                          <span>Weekend Off (No Walk)</span>
                        </span>
                      )}
                      {isHoliday && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>{evaluation.holidayName || 'Holiday'} (No Walk)</span>
                        </span>
                      )}
                      {evaluation.status === 'Upcoming' && (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <span>Upcoming</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Responsible Auditors */}
                <div className="flex-1">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Responsible Auditors
                  </span>
                  
                  {isWeekend ? (
                    <span className="text-xs text-slate-400 italic">
                      Plant off-shift • No auditors required
                    </span>
                  ) : isHoliday ? (
                    <span className="text-xs text-indigo-600 font-semibold italic">
                      Official Holiday: {evaluation.holidayName} • No audit scheduled
                    </span>
                  ) : scheduledInfo?.auditorNames?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {scheduledInfo.auditorNames.map(auditor => (
                        <span
                          key={auditor}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 shadow-2xs ${
                            isToday
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{auditor}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold">
                      No auditors assigned yet
                    </span>
                  )}

                  {/* Inspection Zones / Target */}
                  {!isWeekend && !isHoliday && scheduledInfo?.inspectionZones?.length ? (
                    <div className="flex items-center gap-1.5 mt-2 text-2xs text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-md">
                        Zones: {scheduledInfo.inspectionZones.join(', ')}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isConducted ? (
                    <div className="text-right">
                      <span className="text-2xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <Check className="w-3.5 h-3.5" />
                        <span>Signed Off</span>
                      </span>
                      {evaluation.session?.conductedBy?.length ? (
                        <span className="text-3xs text-slate-400 block truncate max-w-[140px]">
                          By: {evaluation.session.conductedBy.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  ) : isOverdue ? (
                    <button
                      type="button"
                      onClick={() => onOpenConductModal(dateStr)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Conduct Now</span>
                    </button>
                  ) : isToday && !isWeekend && !isHoliday ? (
                    <button
                      type="button"
                      onClick={() => onOpenConductModal(dateStr)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Conduct Today's Walk</span>
                    </button>
                  ) : !isWeekend && !isHoliday ? (
                    <button
                      type="button"
                      onClick={() => onOpenConductModal(dateStr)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Pre-record or conduct walk for this date"
                    >
                      <span>Conduct</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Weekend and Holiday skips prevent false alarms and protect auditor SLA compliance.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Roster
          </button>
        </div>

      </div>
    </div>
  );
}
