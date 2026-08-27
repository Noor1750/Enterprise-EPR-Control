import React from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Factory, 
  Layers, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { BreakdownRecord, BreakdownCalculationDetails } from '../../types/breakdown';

interface BreakdownCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: BreakdownRecord | null;
  calculationDetails?: BreakdownCalculationDetails | null;
}

export const BreakdownCalculationModal: React.FC<BreakdownCalculationModalProps> = ({
  isOpen,
  onClose,
  record,
  calculationDetails: passedDetails
}) => {
  if (!isOpen) return null;

  const details = passedDetails || record?.calculationDetails;
  const isProductionStop = record?.productionStop !== 'No';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Calculation Transparency Details
                {record?.id && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {record.id}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditable working hours lost and production loss verified against official holidays, Friday weekly off, and scheduled shifts.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Machine & Date Banner */}
          {record && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Machine:</span>
                <span className="font-semibold text-slate-800 text-sm">{record.machineName || '—'}</span>
                {record.machineNo && <span className="text-slate-500 block">No: {record.machineNo}</span>}
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Department:</span>
                <span className="font-semibold text-slate-800 text-sm">{record.department || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Breakdown Reported:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {record.date} {record.reportAt ? `at ${record.reportAt}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Machine Restarted:</span>
                <span className="font-semibold text-emerald-700 text-sm">
                  {record.machineStartDate || record.date} {record.machineStartAt ? `at ${record.machineStartAt}` : 'Ongoing'}
                </span>
              </div>
            </div>
          )}

          {!isProductionStop ? (
            <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h4 className="font-bold text-amber-900">No Production Stop</h4>
              <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                This breakdown log was marked as <strong>Production Stop: No</strong>. Machine remained operational during maintenance, so 0 working hours and 0 PCS production were lost.
              </p>
            </div>
          ) : !details ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p>Awaiting breakdown start and restart time inputs to calculate working hours lost.</p>
            </div>
          ) : (
            <>
              {/* Primary KPI Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Working Hours Lost */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-600" /> Working Hours Lost
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      Actual Downtime
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-950 mt-2">
                    {details.totalWorkingHoursLost.toFixed(2)} <span className="text-xs font-semibold text-rose-700">Hrs</span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium mt-1">
                    {details.formattedWorkingHoursLost}
                  </div>
                </div>

                {/* 2. Production Loss (Lost PCS) */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-amber-600" /> Production Loss
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {details.standardUnit}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-950 mt-2">
                    {details.totalLostPcs.toLocaleString()} <span className="text-xs font-semibold text-amber-700">{details.standardUnit}</span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    @ {details.hourlyCapacityPcs.toLocaleString()} {details.standardUnit}/Hr std cap
                  </div>
                </div>

                {/* 3. Total Calendar Elapsed Time */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Calendar Elapsed
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Clock Time
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {details.totalElapsedHours.toFixed(2)} <span className="text-xs font-semibold text-slate-500">Hrs</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {details.formattedElapsed}
                  </div>
                </div>

                {/* 4. Non-Working Time Excluded */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Excluded Non-Work
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Protected
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-2">
                    {details.totalExcludedHours.toFixed(2)} <span className="text-xs font-semibold text-emerald-700">Hrs</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Friday Off & Holidays
                  </div>
                </div>

              </div>

              {/* Exclusion Summary Bar */}
              {(details.fridayExcludedHours > 0 || details.holidayExcludedHours > 0 || details.offShiftExcludedHours > 0) && (
                <div className="p-4 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-900 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 font-bold text-sky-950">
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                    Exclusions Breakdown:
                  </div>
                  {details.fridayExcludedHours > 0 && (
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 font-medium">
                      Friday Weekly Off: <strong>{details.fridayExcludedHours.toFixed(2)} Hrs</strong> (0h counted)
                    </div>
                  )}
                  {details.holidayExcludedHours > 0 && (
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 font-medium">
                      Official Holidays: <strong>{details.holidayExcludedHours.toFixed(2)} Hrs</strong> (0h counted)
                    </div>
                  )}
                  {details.offShiftExcludedHours > 0 && (
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 font-medium">
                      Off-Shift / Non-Working Hours: <strong>{details.offShiftExcludedHours.toFixed(2)} Hrs</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Day-by-Day Granular Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    Day-By-Day Scheduled Shift Overlap Audit
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {details.dailyDetails.length} {details.dailyDetails.length === 1 ? 'Day' : 'Days'} Span
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-2.5 px-3">Date & Day</th>
                        <th className="py-2.5 px-3">Calendar Status</th>
                        <th className="py-2.5 px-3">Scheduled Shifts</th>
                        <th className="py-2.5 px-3 text-center">Daily Cap</th>
                        <th className="py-2.5 px-3 text-right">Calendar Downtime</th>
                        <th className="py-2.5 px-3 text-right font-bold text-rose-700">Working Hours Lost</th>
                        <th className="py-2.5 px-3 text-right font-bold text-amber-700">Lost PCS</th>
                        <th className="py-2.5 px-3">Rule & Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.dailyDetails.map((day, idx) => (
                        <tr key={idx} className={!day.isWorkingDay ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'}>
                          <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                            <div>{day.date}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{day.dayName}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {day.calendarStatus === 'Friday Weekly Off' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Friday Weekly Off
                              </span>
                            ) : day.calendarStatus === 'Official Non-Working Holiday' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {day.holidayName || 'Official Holiday'} (0h)
                              </span>
                            ) : day.calendarStatus === 'Working Holiday' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Working Holiday (16h)
                              </span>
                            ) : day.calendarStatus === 'Working Override' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                Override Approved ({day.scheduledWorkingHours}h)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Normal Working Day
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {day.activeShifts.map((s, sIdx) => (
                              <div key={sIdx} className="text-[11px] font-medium leading-tight">
                                {s}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {day.scheduledWorkingHours} Hrs
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-mono">
                            {day.calendarDowntimeHours.toFixed(2)}h
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-rose-700">
                            {day.workingHoursLost.toFixed(2)}h
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-amber-700">
                            {day.lostPcs.toLocaleString()} {details.standardUnit}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs">
                            {day.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold border-t border-slate-300 text-slate-900">
                        <td colSpan={4} className="py-3 px-3 text-slate-800 uppercase text-[11px] tracking-wider">
                          Grand Totals
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {details.totalElapsedHours.toFixed(2)}h
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 text-sm">
                          {details.totalWorkingHoursLost.toFixed(2)}h
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-700 text-sm">
                          {details.totalLostPcs.toLocaleString()} {details.standardUnit}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500 font-normal">
                          Excluded: {details.totalExcludedHours.toFixed(2)}h non-working time
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Priority Hierarchy and Formula Reference */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Calculation Policy & Rule Hierarchy
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-700">Evaluation Priority:</div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                      <li><strong className="text-slate-800">Machine/Dept Override:</strong> Approved exceptions from Holiday Overrides.</li>
                      <li><strong className="text-slate-800">Working Holiday:</strong> Official holidays marked as working (16h schedule).</li>
                      <li><strong className="text-slate-800">Non-Working Holiday:</strong> Official calendar holidays (0 hours lost).</li>
                      <li><strong className="text-slate-800">Friday Weekly Off:</strong> Mandatory weekly rest day (0 hours lost).</li>
                      <li><strong className="text-slate-800">Normal Working Day:</strong> Day Shift (8h) + Night Shift (8h) = Max 16h/day.</li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-700">Mathematical Formulas:</div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                      <div>Working Hours Lost = ∑ (Overlap of Breakdown & Scheduled Shifts)</div>
                      <div>Lost PCS = Working Hours Lost × Standard Hourly Capacity</div>
                      <div>Standard Hourly Capacity = 16h Capacity / 16.0</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Strictly synchronized with Shift Management and Holiday Calendar
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
