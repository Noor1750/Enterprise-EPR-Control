import React, { useState, useMemo } from 'react';
import { 
  X, Award, Calendar, Search, Filter, Download, Plus, 
  TrendingUp, ArrowRight, FileText, CheckCircle2, User, Building, Sparkles 
} from 'lucide-react';
import { EmployeePromotionRecord } from '../../lib/promotionEngine';
import { Employee } from '../kpi/types';
import * as XLSX from 'xlsx';

interface PromotionsRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotions: EmployeePromotionRecord[];
  employees: Employee[];
  onOpenNewPromotion: (preselected?: Employee) => void;
  onViewLetter: (promotion: EmployeePromotionRecord) => void;
  onViewEmployee?: (empId: string) => void;
}

export default function PromotionsRegistryModal({
  isOpen,
  onClose,
  promotions,
  employees,
  onOpenNewPromotion,
  onViewLetter,
  onViewEmployee
}: PromotionsRegistryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    promotions.forEach(p => {
      if (p.promotionYear) set.add(p.promotionYear);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [promotions]);

  // Available Departments
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    promotions.forEach(p => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [promotions]);

  // Filtered List
  const filteredPromotions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return promotions.filter(p => {
      if (q) {
        const match = 
          p.id.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.employeeName.toLowerCase().includes(q) ||
          p.newDesignation.toLowerCase().includes(q) ||
          p.previousDesignation.toLowerCase().includes(q) ||
          (p.approvedBy && p.approvedBy.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (yearFilter !== 'All' && String(p.promotionYear) !== yearFilter) return false;
      if (deptFilter !== 'All' && p.department !== deptFilter) return false;
      if (typeFilter !== 'All' && p.promotionType !== typeFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());
  }, [promotions, searchTerm, yearFilter, deptFilter, typeFilter]);

  // Statistics
  const currentYear = new Date().getFullYear();
  const promotionsThisYear = useMemo(() => {
    return promotions.filter(p => p.promotionYear === currentYear).length;
  }, [promotions, currentYear]);

  const uniquePromotedStaff = useMemo(() => {
    return new Set(promotions.map(p => p.employeeId)).size;
  }, [promotions]);

  // Export to Excel
  const handleExport = () => {
    const data = filteredPromotions.map(p => ({
      'Promotion Ref': p.id,
      'Employee ID': p.employeeId,
      'Employee Name': p.employeeName,
      'Department': p.department,
      'Promotion Year': p.promotionYear,
      'Promotion Date': p.promotionDate,
      'Previous Designation': p.previousDesignation,
      'New Designation': p.newDesignation,
      'Previous Salary': p.previousSalary || '',
      'New Salary': p.newSalary || '',
      'Promotion Category': p.promotionType,
      'Approved By': p.approvedBy,
      'Remarks': p.remarks || '',
      'Recorded At': p.createdAt
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotions');
    XLSX.writeFile(wb, `Employee_Promotions_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header with crisp pure white background */}
        <div className="bg-white p-5 sm:p-6 border-b border-slate-200 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shadow-2xs shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Employee Promotions & Career Progression Registry
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {promotions.length} Total Records
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Centralized log of staff designation upgrades, promotion years, and official letters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewPromotion();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record New Promotion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Metrics Bar - Standardized same as Breakdown Log */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-slate-50/60 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Promotions
            </div>
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
              {promotions.length}
              <span className="text-xs font-normal text-slate-400">records</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              Cumulative historical promotions
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Promotions in {currentYear}
            </div>
            <div className="text-2xl font-black text-amber-600 flex items-baseline gap-1">
              {promotionsThisYear}
              <span className="text-xs font-normal text-slate-400">upgrades</span>
            </div>
            <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">
              Active cycle year {currentYear}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Promoted Staff
            </div>
            <div className="text-2xl font-black text-indigo-600 flex items-baseline gap-1">
              {uniquePromotedStaff}
              <span className="text-xs font-normal text-slate-400">personnel</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              Unique staff promoted
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Departments
            </div>
            <div className="text-2xl font-black text-emerald-600 flex items-baseline gap-1">
              {availableDepts.length}
              <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
              Departments represented
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Employee ID, Name, Title, or Approved By..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-slate-800"
            >
              <option value="All">All Promotion Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Year {yr}</option>
              ))}
            </select>

            {/* Dept Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-slate-800"
            >
              <option value="All">All Departments</option>
              {availableDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-slate-800"
            >
              <option value="All">All Promotion Categories</option>
              <option value="Annual Appraisal">Annual Appraisal</option>
              <option value="Performance Based">Performance Based</option>
              <option value="Merit / Tenure">Merit / Tenure</option>
              <option value="Designation Upgrade">Designation Upgrade</option>
              <option value="Special Role Change">Special Role Change</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredPromotions.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No promotion records found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No promotions match your search filter. Click "Record New Promotion" to add a new career advancement record.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPromotions.map((record) => (
                <div 
                  key={record.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Staff & Date */}
                  <div className="flex items-start gap-3 min-w-[220px]">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {record.employeeName ? record.employeeName.substring(0, 2).toUpperCase() : 'EM'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onViewEmployee?.(record.employeeId)}
                          className="font-bold text-slate-900 text-xs hover:text-indigo-600 hover:underline text-left cursor-pointer"
                        >
                          {record.employeeName}
                        </button>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold border border-slate-200">
                          {record.employeeId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        <span>{record.department}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">Effective: {record.promotionDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Career Progression Pathway */}
                  <div className="flex-1 max-w-md bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">From</span>
                        <span className="font-medium text-slate-700 text-xs">{record.previousDesignation}</span>
                        {record.previousSalary && (
                          <span className="text-[10px] text-slate-500 font-medium block">BDT {record.previousSalary}</span>
                        )}
                      </div>

                      <div className="px-3 text-slate-400 font-bold">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 block">Promoted To</span>
                        <span className="font-bold text-slate-900 text-xs">{record.newDesignation}</span>
                        {record.newSalary && (
                          <span className="text-[10px] font-bold text-emerald-700 block">BDT {record.newSalary}</span>
                        )}
                      </div>
                    </div>
                    {record.remarks && (
                      <p className="text-[11px] text-slate-500 italic mt-1.5 pt-1.5 border-t border-slate-200/80 line-clamp-1">
                        "{record.remarks}"
                      </p>
                    )}
                  </div>

                  {/* Promotion Badges & Actions */}
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Year {record.promotionYear}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                        By: {record.approvedBy}
                      </span>
                    </div>

                    <button
                      onClick={() => onViewLetter(record)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="View & Print Official Promotion Letter"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>Letter</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">Showing {filteredPromotions.length} of {promotions.length} promotions</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
