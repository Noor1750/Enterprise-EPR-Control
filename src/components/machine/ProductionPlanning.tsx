import React, { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, CalendarDays, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fetchHolidayCalendarData, evaluateDateWorkingStatus, HolidayCalendarData } from '../../lib/holidayEngine';

interface ProductionPlanningProps {
  machines: string[][];
  spreadsheetId?: string;
}

export default function ProductionPlanning({ machines, spreadsheetId }: ProductionPlanningProps) {
  const [targetVolume, setTargetVolume] = useState<number>(10000);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [holidayData, setHolidayData] = useState<HolidayCalendarData | null>(null);

  useEffect(() => {
    if (spreadsheetId) {
      fetchHolidayCalendarData(spreadsheetId).then(setHolidayData).catch(err => {
        console.error('Failed to load holiday data in ProductionPlanning', err);
      });
    }
  }, [spreadsheetId]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    machines.forEach(m => {
      if (m[1]) depts.add(m[1]);
    });
    return Array.from(depts).sort();
  }, [machines]);

  // Calculate working days in selected month
  const workingDaysStats = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(new Date(year, month, 1));
    const allDays = eachDayOfInterval({ start, end });

    let totalDays = allDays.length;
    let nonWorkingHolidays = 0;
    let weekendOffs = 0;
    let workingOverrides = 0;
    let workingDays = 0;

    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (holidayData) {
        const evalResult = evaluateDateWorkingStatus(
          dateStr,
          holidayData.holidays,
          holidayData.overrides,
          selectedDept !== 'All' ? selectedDept : undefined
        );
        if (evalResult.isWorkingDay) {
          workingDays++;
          if (evalResult.isWorkingOverride) workingOverrides++;
        } else {
          if (evalResult.holidayType === 'Weekend' || (!evalResult.holidayName && day.getDay() === 5)) {
            weekendOffs++;
          } else {
            nonWorkingHolidays++;
          }
        }
      } else {
        // Standard working schedule: Saturday to Thursday working, Friday is weekend off
        const isFridayOff = day.getDay() === 5;
        if (!isFridayOff) workingDays++;
        else weekendOffs++;
      }
    });

    return { totalDays, workingDays, nonWorkingHolidays, weekendOffs, workingOverrides };
  }, [selectedMonth, holidayData, selectedDept]);

  const planningData = useMemo(() => {
    const processMap = new Map<string, {
      dept: string;
      dailyCapPcs: number;
      availableCapPcs: number;
      potentialCapPcs: number;
      machineCount: number;
    }>();

    machines.forEach(m => {
      const isCounted = (m[19] || 'Yes') === 'Yes';
      if (!isCounted) return;

      const dept = m[1] || 'Unknown';
      if (selectedDept !== 'All' && dept !== selectedDept) return;

      const processName = m[3] || 'Unknown Process';
      
      const existPcsDaily = Number(m[17]) || 0;
      const potentialPcsDaily = Number(m[10]) || 0;

      if (!processMap.has(processName)) {
        processMap.set(processName, { 
          dept, 
          dailyCapPcs: 0, 
          availableCapPcs: 0, 
          potentialCapPcs: 0, 
          machineCount: 0 
        });
      }

      const p = processMap.get(processName)!;
      p.dailyCapPcs += existPcsDaily;
      p.availableCapPcs += existPcsDaily * (workingDaysStats.workingDays || 26);
      p.potentialCapPcs += potentialPcsDaily * (workingDaysStats.workingDays || 26);
      p.machineCount += 1;
    });

    return Array.from(processMap.entries()).map(([processName, data]) => {
      const utilPercent = data.availableCapPcs > 0 && targetVolume > 0 ? (targetVolume / data.availableCapPcs) * 100 : 0;
      const isShortage = utilPercent > 100;
      const shortageAmount = isShortage ? targetVolume - data.availableCapPcs : 0;

      return {
        processName,
        ...data,
        utilPercent,
        isShortage,
        shortageAmount
      };
    }).sort((a, b) => b.utilPercent - a.utilPercent);
  }, [machines, targetVolume, selectedDept, workingDaysStats.workingDays]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Target Monthly Production Volume (Pcs)</label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="number"
              min="0"
              value={targetVolume}
              onChange={(e) => setTargetVolume(Number(e.target.value) || 0)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] focus:border-transparent outline-none transition-all text-lg font-bold"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Required monthly volume calculated against actual working days in month.</p>
        </div>

        <div className="w-full md:w-1/4">
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            Planning Month
          </label>
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] focus:border-transparent outline-none transition-all font-medium text-gray-800"
          />
        </div>

        <div className="w-full md:w-1/4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Filter by Department</label>
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] focus:border-transparent outline-none transition-all"
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Holiday-Aware Calendar Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl text-center shadow-xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Days</div>
          <div className="text-xl font-extrabold text-gray-900 mt-0.5">{workingDaysStats.totalDays}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Working Days</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{workingDaysStats.workingDays}</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-center shadow-xs">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Company Holidays</div>
          <div className="text-xl font-extrabold text-rose-700 mt-0.5">{workingDaysStats.nonWorkingHolidays}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center shadow-xs">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Weekend Offs</div>
          <div className="text-xl font-extrabold text-slate-700 mt-0.5">{workingDaysStats.weekendOffs}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-center shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Dept Overrides</div>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">{workingDaysStats.workingOverrides}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Process Bottleneck Analysis</h3>
            <p className="text-xs text-gray-500">
              Capacity scaled across {workingDaysStats.workingDays} active working days ({selectedMonth})
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
            {planningData.length} Processes
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Process Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dept.</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Available Cap (Pcs)</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Target (Pcs)</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Utilization %</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Status / Shortage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {planningData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-800">{row.processName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.dept}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-[#1ECA98]">
                    {Math.round(row.availableCapPcs).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                    {targetVolume.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${row.isShortage ? 'bg-red-500' : row.utilPercent > 80 ? 'bg-orange-500' : 'bg-[#1ECA98]'}`} 
                          style={{ width: `${Math.min(100, Math.max(0, row.utilPercent))}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${row.isShortage ? 'text-red-600' : 'text-gray-600'}`}>
                        {row.utilPercent === Infinity ? '0 cap' : row.utilPercent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {row.isShortage ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Short {Math.round(row.shortageAmount).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                        Adequate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {planningData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No machine capacity data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
