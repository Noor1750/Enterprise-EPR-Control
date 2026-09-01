import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, Plus, Edit2, Trash2, 
  Printer, Eye, Star, Award, Calendar, CheckCircle2, 
  Building, ArrowUpDown, ChevronDown, RefreshCw, AlertCircle, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  PerformanceEvaluationRecord, EvaluationPeriodType, 
  EVALUATION_CRITERIA_LIST, generateEvaluationPeriodOptions,
  isKpiHiddenForEmployee
} from '../types';

interface EvaluationRecordsProps {
  records: PerformanceEvaluationRecord[];
  onEdit: (record: PerformanceEvaluationRecord) => void;
  onDelete: (id: string) => void;
  onViewSlip: (record: PerformanceEvaluationRecord) => void;
  onNewEvaluation: () => void;
  isLoading?: boolean;
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
}

export default function EvaluationRecords({
  records,
  onEdit,
  onDelete,
  onViewSlip,
  onNewEvaluation,
  isLoading = false,
  hiddenEmployeeIds = [],
  isAdmin = true
}: EvaluationRecordsProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedVisibility, setSelectedVisibility] = useState<'All' | 'Visible' | 'Hidden'>('All');
  
  // Sorting State
  const [sortField, setSortField] = useState<keyof PerformanceEvaluationRecord>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Selected Detail Modal
  const [previewRecord, setPreviewRecord] = useState<PerformanceEvaluationRecord | null>(null);

  // Extract unique departments & periods for filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [records]);

  const periods = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.period) set.add(r.period);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const isHidden = isKpiHiddenForEmployee(r.employeeId, hiddenEmployeeIds);

      // Visibility Filter
      if (selectedVisibility === 'Visible' && isHidden) return false;
      if (selectedVisibility === 'Hidden' && !isHidden) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = r.employeeId.toLowerCase().includes(term);
        const matchesName = r.employeeName.toLowerCase().includes(term);
        const matchesDesig = (r.designation || '').toLowerCase().includes(term);
        const matchesDept = (r.department || '').toLowerCase().includes(term);
        if (!matchesId && !matchesName && !matchesDesig && !matchesDept) return false;
      }

      // Period Type
      if (selectedType !== 'All' && r.evaluationType !== selectedType) return false;

      // Period
      if (selectedPeriod !== 'All' && r.period !== selectedPeriod) return false;

      // Department
      if (selectedDept !== 'All' && r.department !== selectedDept) return false;

      // Rating Grade
      if (selectedGrade !== 'All' && r.ratingGrade !== selectedGrade) return false;

      return true;
    }).sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, searchTerm, selectedType, selectedPeriod, selectedDept, selectedGrade, selectedVisibility, hiddenEmployeeIds, sortField, sortAsc]);

  // Handle Sort Toggle
  const handleSort = (field: keyof PerformanceEvaluationRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;

    const dataToExport = filteredRecords.map(r => ({
      'Evaluation ID': r.id,
      'Employee ID': r.employeeId,
      'Employee Name': r.employeeName,
      'Designation': r.designation || '',
      'Department': r.department || '',
      'Date Joined': r.dateJoined || '',
      'Year of Service': r.yearOfService || '',
      'Evaluation Type': r.evaluationType,
      'Period': r.period,
      'Evaluation Date': r.evaluationDate,
      'Evaluated By': r.evaluatedBy,
      '1. Job Knowledge (1-5)': r.scores.jobKnowledge,
      '2. Output vs Target (1-5)': r.scores.quantityOfOutput,
      '3. Quality vs Target (1-5)': r.scores.qualityOfWork,
      '4. Attendance & Commitment (1-5)': r.scores.attendanceCommitment,
      '5. Initiative / Improvement (1-5)': r.scores.initiativeImprovement,
      '6. Dependability (1-5)': r.scores.dependability,
      '7. Attitude (1-5)': r.scores.attitude,
      '8. Creativity & Analytical (1-5)': r.scores.creativityAnalytical,
      '9. Communication Skills (1-5)': r.scores.communicationSkills,
      '10. Teamwork & Relations (1-5)': r.scores.teamworkRelationship,
      'Total Score (50)': r.totalScore,
      'Average Rating (5.0)': r.averageRating,
      'Percentage (%)': `${r.percentage}%`,
      'Rating Grade': r.ratingGrade,
      'Strengths': r.strengths || '',
      'Areas of Improvement': r.areasOfImprovement || '',
      'Recommendation': r.recommendation || '',
      'Remarks': r.comments || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance_Evaluations');
    XLSX.writeFile(wb, `Performance_Evaluations_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Summary Metrics for filtered view
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return { total: 0, avgRating: 0, avgScore: 0, topCount: 0, needsImprovementCount: 0 };

    const totalRatingSum = filteredRecords.reduce((acc, r) => acc + (r.averageRating || 0), 0);
    const totalScoreSum = filteredRecords.reduce((acc, r) => acc + (r.totalScore || 0), 0);
    const topCount = filteredRecords.filter(r => r.averageRating >= 4.5).length;
    const needsImprovementCount = filteredRecords.filter(r => r.averageRating < 3.0).length;

    return {
      total,
      avgRating: Number((totalRatingSum / total).toFixed(2)),
      avgScore: Number((totalScoreSum / total).toFixed(1)),
      topCount,
      needsImprovementCount
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-5">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Evaluations
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-400">Quarterly & Annual</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Average Rating
          </span>
          <div className="flex items-center gap-1 text-2xl font-black text-amber-500 mt-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            {stats.avgRating > 0 ? stats.avgRating.toFixed(2) : '—'}
            <span className="text-xs text-slate-400 font-normal"> / 5.0</span>
          </div>
          <span className="text-[10px] text-slate-400">Across {stats.total} records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Outstanding (≥ 4.5★)
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.topCount}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Top performers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Action Required (&lt; 3.0★)
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {stats.needsImprovementCount}
          </div>
          <span className="text-[10px] text-rose-500">Needs improvement</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, Employee Name, Designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              Export Excel ({filteredRecords.length})
            </button>

            <button
              onClick={onNewEvaluation}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              New Evaluation
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className={`grid gap-2 pt-2 border-t border-slate-100 text-xs ${
          isAdmin ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'
        }`}>
          
          {/* Type Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Frequency</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Frequencies</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Periods</option>
              {periods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Performance Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Grades</option>
              <option value="Outstanding">Outstanding (≥ 4.5)</option>
              <option value="Exceeds Expectations">Exceeds (3.8 - 4.4)</option>
              <option value="Meets Expectations">Meets (3.0 - 3.7)</option>
              <option value="Needs Improvement">Needs Improvement (2.0 - 2.9)</option>
              <option value="Unsatisfactory">Unsatisfactory (&lt; 2.0)</option>
            </select>
          </div>

          {/* Admin Visibility Filter */}
          {isAdmin && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Admin Visibility</label>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value as any)}
                className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-semibold text-amber-900 focus:outline-hidden"
              >
                <option value="All">All Visibility</option>
                <option value="Visible">Public Visible Only</option>
                <option value="Hidden">Hidden (Confidential)</option>
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th 
                  onClick={() => handleSort('employeeId')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('employeeName')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 whitespace-nowrap">Designation</th>
                <th className="p-3 whitespace-nowrap">Department</th>
                <th className="p-3 whitespace-nowrap">Date Joined</th>
                <th className="p-3 whitespace-nowrap">Year of Service</th>
                <th className="p-3 whitespace-nowrap">Period</th>
                <th 
                  onClick={() => handleSort('totalScore')} 
                  className="p-3 text-center cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total (50)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('averageRating')} 
                  className="p-3 text-center cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Avg Rating</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center whitespace-nowrap">Grade</th>
                <th className="p-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    Loading performance evaluation records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No evaluation records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || selectedType !== 'All' 
                        ? 'Try adjusting your search or filters.' 
                        : 'Click "New Evaluation" above to record the first staff appraisal.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition">
                    
                    {/* ID */}
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {record.employeeId}
                    </td>

                    {/* Name */}
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{record.employeeName}</span>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      {record.designation || '—'}
                    </td>

                    {/* Department */}
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[11px]">
                        {record.department || '—'}
                      </span>
                    </td>

                    {/* Date Joined */}
                    <td className="p-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                      {record.dateJoined || '—'}
                    </td>

                    {/* Year of Service */}
                    <td className="p-3 text-slate-700 whitespace-nowrap font-semibold">
                      {record.yearOfService || '—'}
                    </td>

                    {/* Period & Type */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{record.period}</div>
                      <span className="text-[10px] text-slate-500">{record.evaluationType}</span>
                    </td>

                    {/* Total Score / 50 */}
                    <td className="p-3 text-center whitespace-nowrap font-mono font-bold text-slate-900">
                      {isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds) && !isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                          <Lock className="w-3 h-3" /> Protected
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold">
                          {record.totalScore} / 50
                        </span>
                      )}
                    </td>

                    {/* Average Rating */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds) && !isAdmin ? (
                        <span className="text-slate-400 text-[11px]">***</span>
                      ) : (
                        <div className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{record.averageRating.toFixed(2)}</span>
                          {isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds) && isAdmin && (
                            <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded-sm">
                              Hidden
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Grade Badge */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds) && !isAdmin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                          Confidential
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          record.ratingGrade === 'Outstanding' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          record.ratingGrade === 'Exceeds Expectations' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          record.ratingGrade === 'Meets Expectations' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          record.ratingGrade === 'Needs Improvement' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {record.ratingGrade}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      {isKpiHiddenForEmployee(record.employeeId, hiddenEmployeeIds) && !isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-lg">
                          <Lock className="w-3 h-3 text-slate-400" /> Protected
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewSlip(record)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                            title="Print / View Appraisal Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEdit(record)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-700 rounded-lg transition cursor-pointer"
                            title="Edit Evaluation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the evaluation for ${record.employeeName} (${record.period})?`)) {
                                onDelete(record.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Delete Evaluation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
