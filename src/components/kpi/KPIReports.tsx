import React, { useState, useMemo } from 'react';
import { 
  Download, Award, Calendar, ChevronRight,
  TrendingUp, Sparkles, Star, Search, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, KPIRecord, getRatingInfo, MONTH_NAMES } from './types';

interface KPIReportsProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  availableMonths: string[];
}

export type ReportType = 'yearly_matrix' | 'monthly_summary' | 'dept_performance' | 'top_performers' | 'low_performers' | 'pending_submissions';

export default function KPIReports({
  employees,
  kpiRecords,
  availableMonths
}: KPIReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('yearly_matrix');
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || 'All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    kpiRecords.forEach(k => { if (k.department) set.add(k.department); });
    return Array.from(set).sort();
  }, [employees, kpiRecords]);

  // Extract available years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    kpiRecords.forEach(k => {
      const match = (k.month || '').match(/\b(20\d\d)\b/);
      if (match) set.add(match[1]);
      if (k.date) {
        const dMatch = k.date.match(/\b(20\d\d)\b/);
        if (dMatch) set.add(dMatch[1]);
      }
    });
    set.add('2026');
    set.add('2025');
    set.add('2024');
    return Array.from(set).sort().reverse();
  }, [kpiRecords]);

  // Active employees for report calculations
  const activeEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.status === 'Inactive') return false;
      if (selectedDept !== 'All' && e.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const id = (e.id || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        const desig = (e.designation || '').toLowerCase();
        if (!id.includes(q) && !name.includes(q) && !desig.includes(q)) return false;
      }
      return true;
    });
  }, [employees, selectedDept, searchQuery]);

  // Filter base KPI records for single-month views
  const filteredBaseKPIs = useMemo(() => {
    return kpiRecords.filter(k => {
      if (selectedMonth !== 'All' && k.month !== selectedMonth) return false;
      if (selectedDept !== 'All' && k.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const id = (k.employeeId || '').toLowerCase();
        const name = (k.employeeName || '').toLowerCase();
        if (!id.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [kpiRecords, selectedMonth, selectedDept, searchQuery]);

  // Yearly KPI Matrix Rows (Yearly report matching attached example format)
  const yearlyMatrixRows = useMemo(() => {
    return activeEmployees.map((emp, idx) => {
      const empKpis = kpiRecords.filter(k => 
        k.employeeId && k.employeeId.trim().toUpperCase() === emp.id.trim().toUpperCase()
      );

      let totalAchieve = 0;
      let totalRating = 0;
      let evaluatedMonthsCount = 0;

      const monthsData = MONTH_NAMES.map(mName => {
        // Look for matching record for this month and year
        const match = empKpis.find(k => {
          const str = (k.month || '').toLowerCase();
          const targetMonth = mName.toLowerCase();
          const targetYear = selectedYear.toLowerCase();
          return (str.includes(targetMonth) && str.includes(targetYear)) ||
                 (str.startsWith(targetMonth.substring(0, 3)) && str.includes(targetYear));
        });

        if (match && typeof match.achievement === 'number') {
          totalAchieve += match.achievement;
          totalRating += (match.rating || 0);
          evaluatedMonthsCount++;
          return {
            month: mName,
            target: match.plan !== undefined ? `${match.plan}%` : '100%',
            achieve: `${match.achievement}%`,
            achieveNum: match.achievement,
            rating: match.rating !== undefined ? Number(match.rating).toFixed(1) : '',
            ratingNum: match.rating || 0
          };
        }

        return {
          month: mName,
          target: '',
          achieve: '',
          achieveNum: null,
          rating: '',
          ratingNum: null
        };
      });

      const ytdAchieve = evaluatedMonthsCount > 0 
        ? `${Math.round(totalAchieve / evaluatedMonthsCount)}%` 
        : '';
      const ytdRating = evaluatedMonthsCount > 0 
        ? (totalRating / evaluatedMonthsCount).toFixed(1) 
        : '';

      return {
        sl: idx + 1,
        idNo: emp.id,
        employeeName: emp.name,
        designation: emp.designation || 'Staff',
        department: emp.department || 'Production',
        dateOfJoin: (emp as any).dateOfJoin || (emp as any).joiningDate || (emp as any).dateJoined || '',
        monthsData,
        ytdAchieve,
        ytdRating,
        evaluatedMonthsCount
      };
    });
  }, [activeEmployees, kpiRecords, selectedYear]);

  // Generate Report Data based on reportType for Standard Views
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
        const submittedIds = new Set(filteredBaseKPIs.map(k => (k.employeeId || '').toUpperCase()));
        const missing = activeEmployees.filter(e => !submittedIds.has((e.id || '').toUpperCase()));
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

  // Export to Excel (.xlsx)
  const handleExportReport = () => {
    // 1. Yearly KPI Performance Matrix (.xlsx)
    if (reportType === 'yearly_matrix') {
      if (yearlyMatrixRows.length === 0) return;

      const wb = XLSX.utils.book_new();

      // Row 0: Title
      const titleRow = [`Non-Management Sales Commission File - ${selectedYear}`];

      // Row 1: Header Row 1
      const headerRow1 = [
        'SL', 'ID No', 'EmployeeName', 'Designation', 'Master Department', 'Date of Join',
        'January', '',
        'February', '',
        'March', '',
        'April', '',
        'May', '',
        'June', '',
        'July', '',
        'August', '',
        'September', '',
        'October', '',
        'November', '',
        'December', '',
        `YTD-${selectedYear} Total`,
        'Rating (0 - 5 only)', '', '', '', '', '', '', '', '', '', '', '',
        `YTD-${selectedYear} Rating`
      ];

      // Row 2: Subheader Row 2
      const headerRow2 = [
        'SL', 'ID No', 'EmployeeName', 'Designation', 'Master Department', 'Date of Join',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Target', 'KPI Achieve',
        'KPI Achieved',
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
        `YTD-${selectedYear} Rating`
      ];

      const rows: any[][] = [titleRow, headerRow1, headerRow2];

      yearlyMatrixRows.forEach(row => {
        const dataRow = [
          row.sl,
          row.idNo,
          row.employeeName,
          row.designation,
          row.department,
          row.dateOfJoin,
          // 12 Months Target & Achieve (cols 6 - 29)
          ...row.monthsData.flatMap(m => [m.target, m.achieve]),
          // YTD Achieve (col 30)
          row.ytdAchieve,
          // 12 Months Rating (cols 31 - 42)
          ...row.monthsData.map(m => m.rating),
          // YTD Rating (col 43)
          row.ytdRating
        ];
        rows.push(dataRow);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Multi-cell Merges
      ws['!merges'] = [
        // Title merge across all 44 columns
        { s: { r: 0, c: 0 }, e: { r: 0, c: 43 } },
        // Fixed info row merges: rows 1 to 2
        { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // SL
        { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // ID No
        { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }, // EmployeeName
        { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } }, // Designation
        { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } }, // Master Department
        { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } }, // Date of Join
        // 12 Months (2 cols each: Target & Achieve)
        { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },   // January
        { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },   // February
        { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } }, // March
        { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } }, // April
        { s: { r: 1, c: 14 }, e: { r: 1, c: 15 } }, // May
        { s: { r: 1, c: 16 }, e: { r: 1, c: 17 } }, // June
        { s: { r: 1, c: 18 }, e: { r: 1, c: 19 } }, // July
        { s: { r: 1, c: 20 }, e: { r: 1, c: 21 } }, // August
        { s: { r: 1, c: 22 }, e: { r: 1, c: 23 } }, // September
        { s: { r: 1, c: 24 }, e: { r: 1, c: 25 } }, // October
        { s: { r: 1, c: 26 }, e: { r: 1, c: 27 } }, // November
        { s: { r: 1, c: 28 }, e: { r: 1, c: 29 } }, // December
        // Rating (0 - 5 only) spanning cols 31 to 42
        { s: { r: 1, c: 31 }, e: { r: 1, c: 42 } },
        // YTD Rating spanning rows 1 to 2
        { s: { r: 1, c: 43 }, e: { r: 2, c: 43 } }
      ];

      // Column widths
      ws['!cols'] = [
        { wch: 6 },  // SL
        { wch: 10 }, // ID No
        { wch: 28 }, // EmployeeName
        { wch: 20 }, // Designation
        { wch: 18 }, // Master Department
        { wch: 14 }, // Date of Join
        ...Array(24).fill({ wch: 12 }), // 12 Months Target & Achieve
        { wch: 16 }, // YTD Total
        ...Array(12).fill({ wch: 10 }), // 12 Months Rating
        { wch: 16 }  // YTD Rating
      ];

      XLSX.utils.book_append_sheet(wb, ws, `KPI_${selectedYear}`);
      XLSX.writeFile(wb, `Non-Management_Sales_Commission_File_${selectedYear}.xlsx`);
      return;
    }

    // 2. Standard Reports
    if (reportData.length === 0) return;

    const titles: Record<string, string> = {
      monthly_summary: 'Monthly_KPI_Summary_Report',
      dept_performance: 'Department_KPI_Performance_Report',
      top_performers: 'High_Performers_KPI_Report',
      low_performers: 'Low_Performers_KPI_Report',
      pending_submissions: 'Pending_KPI_Submissions_Report'
    };

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI_Report');
    XLSX.writeFile(wb, `${titles[reportType] || 'KPI_Report'}_${selectedMonth}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Report Controls & Filter Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                KPI
              </div>
              <h3 className="text-base font-black text-slate-900">KPI Performance Reports & Yearly Analytics</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Analyze monthly KPIs and export the complete Yearly Performance Matrix (.xlsx) matching official enterprise audit format
            </p>
          </div>

          <button
            onClick={handleExportReport}
            disabled={reportType === 'yearly_matrix' ? yearlyMatrixRows.length === 0 : reportData.length === 0}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export Report (.xlsx)
          </button>
        </div>

        {/* Report Selection Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setReportType('yearly_matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              reportType === 'yearly_matrix' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1. Yearly KPI Performance Matrix (Official Format)
          </button>
          <button
            onClick={() => setReportType('monthly_summary')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              reportType === 'monthly_summary' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Monthly KPI Summary
          </button>
          <button
            onClick={() => setReportType('dept_performance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              reportType === 'dept_performance' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3. Department Ranking
          </button>
          <button
            onClick={() => setReportType('top_performers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              reportType === 'top_performers' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            4. Outstanding Performers (★ 4-5)
          </button>
          <button
            onClick={() => setReportType('low_performers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              reportType === 'low_performers' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            5. Low Performance (★ 1-2)
          </button>
          <button
            onClick={() => setReportType('pending_submissions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              reportType === 'pending_submissions' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            6. Missing / Pending Submissions
          </button>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {reportType === 'yearly_matrix' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Target Year:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="px-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Period:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="All">All Evaluated Periods</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search ID, employee name, designation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Data Table View */}
      {reportType === 'yearly_matrix' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Non-Management Sales Commission File - {selectedYear} ({yearlyMatrixRows.length} Employees)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
              Target / Achieve & Rating (0 - 5 only) Format
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            {yearlyMatrixRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No employee records found matching current department or search query.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-800 font-bold tracking-tight border-b border-slate-300 z-10 shadow-xs">
                  {/* Top Tier Header */}
                  <tr className="border-b border-slate-200 text-[11px]">
                    <th rowSpan={2} className="py-2.5 px-2.5 whitespace-nowrap border-r border-slate-200 bg-slate-100 text-center w-10">SL</th>
                    <th rowSpan={2} className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200 bg-slate-100">ID No</th>
                    <th rowSpan={2} className="py-2.5 px-4 whitespace-nowrap border-r border-slate-200 bg-slate-100 min-w-[180px]">EmployeeName</th>
                    <th rowSpan={2} className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200 bg-slate-100">Designation</th>
                    <th rowSpan={2} className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200 bg-slate-100">Master Department</th>
                    <th rowSpan={2} className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300 bg-slate-100">Date of Join</th>

                    {/* 12 Months (2 cols each) */}
                    {MONTH_NAMES.map(m => (
                      <th key={m} colSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-slate-50">
                        {m}
                      </th>
                    ))}

                    <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-300 bg-emerald-50 text-emerald-900 font-black">
                      YTD-{selectedYear} Total<br/>
                      <span className="text-[9px] font-normal text-emerald-700">KPI Achieved</span>
                    </th>

                    {/* Rating spanning 12 months */}
                    <th colSpan={12} className="py-1.5 px-2 text-center border-r border-slate-300 bg-amber-50 text-amber-900 font-black">
                      Rating (0 - 5 only)
                    </th>

                    <th rowSpan={2} className="py-2.5 px-3 text-center bg-indigo-50 text-indigo-900 font-black">
                      YTD-{selectedYear} Rating
                    </th>
                  </tr>

                  {/* Sub-tier Header */}
                  <tr className="border-b border-slate-300 text-[10px] text-slate-600 bg-slate-100">
                    {/* Month subheaders: Target & Achieve */}
                    {MONTH_NAMES.map(m => (
                      <React.Fragment key={m}>
                        <th className="py-1.5 px-2 border-r border-slate-200 font-semibold text-center whitespace-nowrap">Target</th>
                        <th className="py-1.5 px-2 border-r border-slate-200 font-bold text-center text-emerald-800 whitespace-nowrap">Achieve</th>
                      </React.Fragment>
                    ))}

                    {/* Rating months */}
                    {MONTH_NAMES.map(m => (
                      <th key={`r-${m}`} className="py-1.5 px-1.5 border-r border-slate-200 text-center font-bold text-amber-900">
                        {m.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {yearlyMatrixRows.map((row) => (
                    <tr key={row.idNo} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono border-r border-slate-100">{row.sl}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-100">{row.idNo}</td>
                      <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">{row.employeeName}</td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.designation}</td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.department}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px] border-r border-slate-200">{row.dateOfJoin || '—'}</td>

                      {/* 12 Months Target & Achieve */}
                      {row.monthsData.map((m, mIdx) => (
                        <React.Fragment key={mIdx}>
                          <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-100 text-[11px]">
                            {m.target || '—'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-100 text-[11px]">
                            {m.achieve ? (
                              <span className={m.achieveNum && m.achieveNum >= 90 ? 'text-emerald-700' : 'text-slate-800'}>
                                {m.achieve}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* YTD Achieve */}
                      <td className="py-2 px-3 text-center font-mono font-black border-r border-slate-200 bg-emerald-50/40 text-emerald-800">
                        {row.ytdAchieve || '—'}
                      </td>

                      {/* 12 Months Rating */}
                      {row.monthsData.map((m, rIdx) => (
                        <td key={`val-${rIdx}`} className="py-2 px-1.5 text-center font-mono font-bold border-r border-slate-100 text-[11px]">
                          {m.rating ? (
                            <span className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded">
                              {m.rating}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}

                      {/* YTD Rating */}
                      <td className="py-2 px-3 text-center font-mono font-black bg-indigo-50/50 text-indigo-900">
                        {row.ytdRating ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200">
                            ★ {row.ytdRating}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Standard Single-Month / Filter Views */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Report Results: {reportData.length} Records Found
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            {reportData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching records for this report criteria.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    {Object.keys(reportData[0]).map((headerKey) => (
                      <th key={headerKey} className="py-2.5 px-3 whitespace-nowrap">
                        {headerKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {Object.entries(row).map(([key, val]: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                          {key === 'Rating' ? (
                            <span className="font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-mono">
                              ★ {val}
                            </span>
                          ) : key === 'Achievement (%)' || key === 'Average Achievement (%)' ? (
                            <span className="font-bold text-emerald-800 font-mono">
                              {val}
                            </span>
                          ) : key === 'Plan (%)' || key === 'Average Plan (%)' ? (
                            <span className="font-bold text-indigo-800 font-mono">
                              {val}
                            </span>
                          ) : key === 'Employee ID' ? (
                            <span className="font-bold font-mono text-slate-900">
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
      )}
    </div>
  );
}
