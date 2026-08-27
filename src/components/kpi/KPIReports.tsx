import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Filter, Award, AlertTriangle, 
  TrendingUp, Users, Building2, Calendar, CheckCircle2, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, KPIRecord, getRatingInfo, generateMonthList } from './types';

interface KPIReportsProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  availableMonths: string[];
}

type ReportType = 'monthly_summary' | 'dept_performance' | 'top_performers' | 'low_performers' | 'pending_submissions';

export default function KPIReports({
  employees,
  kpiRecords,
  availableMonths
}: KPIReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('monthly_summary');
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || 'All');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    kpiRecords.forEach(k => { if (k.department) set.add(k.department); });
    return Array.from(set).sort();
  }, [employees, kpiRecords]);

  // Filter base KPI records
  const filteredBaseKPIs = useMemo(() => {
    return kpiRecords.filter(k => {
      if (selectedMonth !== 'All' && k.month !== selectedMonth) return false;
      if (selectedDept !== 'All' && k.department !== selectedDept) return false;
      return true;
    });
  }, [kpiRecords, selectedMonth, selectedDept]);

  // Active employees for pending checks
  const activeEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.status === 'Inactive') return false;
      if (selectedDept !== 'All' && e.department !== selectedDept) return false;
      return true;
    });
  }, [employees, selectedDept]);

  // Generate Report Data based on reportType
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'monthly_summary': {
        return filteredBaseKPIs.map((k, idx) => ({
          'SL': idx + 1,
          'Employee ID': k.employeeId,
          'Employee Name': k.employeeName,
          'Department': k.department,
          'Month': k.month,
          'Date': k.date || '—',
          'Plan (%)': `${k.plan}%`,
          'Achievement (%)': `${k.achievement}%`,
          'Rating': k.rating,
          'Performance Grade': getRatingInfo(k.rating).label || 'Standard'
        }));
      }

      case 'dept_performance': {
        const deptMap: Record<string, { totalPlan: number; totalAch: number; totalRating: number; count: number }> = {};
        filteredBaseKPIs.forEach(k => {
          const d = k.department || 'Unassigned';
          if (!deptMap[d]) deptMap[d] = { totalPlan: 0, totalAch: 0, totalRating: 0, count: 0 };
          deptMap[d].totalPlan += k.plan;
          deptMap[d].totalAch += k.achievement;
          deptMap[d].totalRating += k.rating;
          deptMap[d].count++;
        });

        return Object.entries(deptMap).map(([dept, data], idx) => ({
          'SL': idx + 1,
          'Department': dept,
          'Evaluated Employees': data.count,
          'Average Plan (%)': `${Math.round(data.totalPlan / data.count)}%`,
          'Average Achievement (%)': `${Math.round(data.totalAch / data.count)}%`,
          'Average Rating': (data.totalRating / data.count).toFixed(1),
          'Department Status': (data.totalAch / data.count) >= 90 ? 'Excellent' : (data.totalAch / data.count) >= 75 ? 'Good' : 'Needs Improvement'
        })).sort((a, b) => parseFloat(b['Average Achievement (%)']) - parseFloat(a['Average Achievement (%)']));
      }

      case 'top_performers': {
        const tops = filteredBaseKPIs.filter(k => k.rating >= 4.0 || k.achievement >= 90);
        return tops.map((k, idx) => ({
          'SL': idx + 1,
          'Employee ID': k.employeeId,
          'Employee Name': k.employeeName,
          'Department': k.department,
          'Month': k.month,
          'Plan (%)': `${k.plan}%`,
          'Achievement (%)': `${k.achievement}%`,
          'Rating': k.rating,
          'Award Level': k.rating >= 4.5 ? '★ Outstanding' : '★ Good Performer'
        })).sort((a, b) => b.Rating - a.Rating);
      }

      case 'low_performers': {
        const lows = filteredBaseKPIs.filter(k => k.rating < 2.5 || k.achievement < 75);
        return lows.map((k, idx) => ({
          'SL': idx + 1,
          'Employee ID': k.employeeId,
          'Employee Name': k.employeeName,
          'Department': k.department,
          'Month': k.month,
          'Plan (%)': `${k.plan}%`,
          'Achievement (%)': `${k.achievement}%`,
          'Rating': k.rating,
          'Action Required': k.achievement < 60 ? 'Immediate Review' : 'Performance Support Plan'
        }));
      }

      case 'pending_submissions': {
        const submittedIds = new Set(filteredBaseKPIs.map(k => k.employeeId.toUpperCase()));
        const missing = activeEmployees.filter(e => !submittedIds.has(e.id.toUpperCase()));
        return missing.map((e, idx) => ({
          'SL': idx + 1,
          'Employee ID': e.id,
          'Employee Name': e.name,
          'Department': e.department,
          'Designation': e.designation || 'Staff',
          'Target Month': selectedMonth === 'All' ? 'Current Period' : selectedMonth,
          'Status': 'Pending KPI Submission'
        }));
      }

      default:
        return [];
    }
  }, [reportType, filteredBaseKPIs, activeEmployees, selectedMonth]);

  // Export to Excel
  const handleExportReport = () => {
    if (reportData.length === 0) return;

    const titles: Record<ReportType, string> = {
      monthly_summary: 'Monthly_KPI_Summary_Report',
      dept_performance: 'Department_KPI_Performance_Report',
      top_performers: 'High_Performers_KPI_Report',
      low_performers: 'Low_Performers_KPI_Report',
      pending_submissions: 'Pending_KPI_Submissions_Report'
    };

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI_Report');
    XLSX.writeFile(wb, `${titles[reportType]}_${selectedMonth}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Report Controls & Filter Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#2A3F54]">KPI Performance Reports & Analytics</h3>
            <p className="text-xs text-gray-500 mt-0.5">Generate, analyze, and export tailored KPI reports to Excel</p>
          </div>

          <button
            onClick={handleExportReport}
            disabled={reportData.length === 0}
            className="px-4 py-2 bg-[#26B99A] hover:bg-[#169F85] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Report (.xlsx)
          </button>
        </div>

        {/* Report Selection Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => setReportType('monthly_summary')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              reportType === 'monthly_summary' ? 'bg-[#2A3F54] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            1. Monthly KPI Summary
          </button>
          <button
            onClick={() => setReportType('dept_performance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              reportType === 'dept_performance' ? 'bg-[#2A3F54] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            2. Department Ranking
          </button>
          <button
            onClick={() => setReportType('top_performers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              reportType === 'top_performers' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            3. Outstanding Performers (★ 4-5)
          </button>
          <button
            onClick={() => setReportType('low_performers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              reportType === 'low_performers' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            4. Low Performance Attention (★ 1-2)
          </button>
          <button
            onClick={() => setReportType('pending_submissions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              reportType === 'pending_submissions' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            5. Missing / Pending Submissions
          </button>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Period:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1 text-xs bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-700"
            >
              <option value="All">All Evaluated Periods</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-1 text-xs bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-700"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Report Results: {reportData.length} Records Found
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
          {reportData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No matching records for this report criteria.
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  {Object.keys(reportData[0]).map((headerKey) => (
                    <th key={headerKey} className="py-2.5 px-3 whitespace-nowrap">
                      {headerKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-gray-50/80 transition-colors">
                    {Object.entries(row).map(([key, val]: any, cIdx: number) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                        {key === 'Rating' ? (
                          <span className="font-bold px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-mono">
                            ★ {val}
                          </span>
                        ) : key === 'Achievement (%)' || key === 'Average Achievement (%)' ? (
                          <span className="font-bold text-emerald-700 font-mono">
                            {val}
                          </span>
                        ) : key === 'Plan (%)' || key === 'Average Plan (%)' ? (
                          <span className="font-bold text-indigo-700 font-mono">
                            {val}
                          </span>
                        ) : key === 'Employee ID' ? (
                          <span className="font-bold font-mono text-gray-800">
                            {val}
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
