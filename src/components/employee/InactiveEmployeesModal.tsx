import React, { useState, useMemo } from 'react';
import { 
  X, Download, AlertTriangle, Search, Filter, Calendar, Users, 
  Building, UserX, Clock, ArrowRight, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { EmployeeShiftState } from '../../lib/shiftEngine';
import { calculateTenure } from './employeeTypes';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const getXlsx = () => XLSX;

interface InactiveEmployeesModalProps {
  isOpen: boolean;
  inactiveEmployees: EmployeeShiftState[];
  onClose: () => void;
  onViewEmployee: (emp: EmployeeShiftState) => void;
  onReactivateEmployee?: (emp: EmployeeShiftState) => void;
}

export default function InactiveEmployeesModal({
  isOpen,
  inactiveEmployees,
  onClose,
  onViewEmployee,
  onReactivateEmployee
}: InactiveEmployeesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  if (!isOpen) return null;

  // Departments list for inactive employees
  const departments = Array.from(new Set(inactiveEmployees.map(e => e.department).filter(Boolean))).sort();

  // Filtered inactive employees
  const filtered = inactiveEmployees.filter(emp => {
    if (deptFilter !== 'All' && emp.department !== deptFilter) return false;
    if (categoryFilter !== 'All' && emp.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        emp.id.toLowerCase().includes(q) ||
        emp.name.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.remarks.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Analytics
  const managementCount = inactiveEmployees.filter(e => e.category === 'Management').length;
  const nonManagementCount = inactiveEmployees.filter(e => e.category !== 'Management').length;

  // Export Inactive Employees Report to Excel
  const handleExportInactiveReport = () => {
    const xlsx = getXlsx();
    const exportData = filtered.map(e => ({
      'Employee ID': e.id,
      'Full Name': e.name,
      'Classification / Category': e.category || 'Non-Management',
      'Department': e.department,
      'Section / Working Area': e.workingArea || '',
      'Designation': e.designation,
      'Date of Join': e.dateOfJoin || '',
      'Inactive / Separation Date': e.inactiveDate || '',
      'Total Service Length': calculateTenure(e.dateOfJoin, e.inactiveDate),
      'Supervisor': e.supervisor || '',
      'Manager': e.manager || '',
      'Contact Phone': e.phone || '',
      'Emergency Contact': e.emergency || '',
      'Blood Group': e.bloodGroup || '',
      'T-Shirt Size': e.tShirtSize || '',
      'Shoe Size': e.shoeSize || '',
      'Volunteer Committees': e.volunteer || '',
      'Reason / Exit Remarks': e.remarks || 'Separated'
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Inactive Employees Report');
    xlsx.writeFile(wb, `Inactive_Employees_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Inactive & Separated Employee Records</span>
                <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold border border-rose-200">
                  {inactiveEmployees.length} Total
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Audit inactive personnel, track separation dates, analyze tenure, and export official reports.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportInactiveReport}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Inactive Report
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Separations</span>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{inactiveEmployees.length}</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-purple-700">Management Inactive</span>
            <div className="text-xl font-bold text-purple-800 mt-0.5">{managementCount}</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-blue-700">Non-Management Inactive</span>
            <div className="text-xl font-bold text-blue-800 mt-0.5">{nonManagementCount}</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Filtered Records</span>
            <div className="text-xl font-bold text-indigo-600 mt-0.5">{filtered.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by ID, name, designation, remarks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:ring-2 focus:ring-rose-500"
            >
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:ring-2 focus:ring-rose-500"
            >
              <option value="All">All Classifications</option>
              <option value="Management">Management Only</option>
              <option value="Non-Management">Non-Management Only</option>
            </select>
          </div>
        </div>

        {/* Table of Inactive Records */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserX className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">No inactive employee records found</p>
              <p className="text-xs text-slate-400 mt-1">There are no separated employees matching current filters.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Date of Join</th>
                  <th className="px-4 py-3">Inactive Date</th>
                  <th className="px-4 py-3">Service Tenure</th>
                  <th className="px-4 py-3">Reason / Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((emp, idx) => {
                  const tenure = calculateTenure(emp.dateOfJoin, emp.inactiveDate);
                  return (
                    <tr key={`${emp.id}-${idx}`} className="hover:bg-rose-50/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden shrink-0">
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.name.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{emp.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${emp.category === 'Management' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {emp.category || 'Non-Management'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{emp.department}</div>
                        <div className="text-[10px] text-slate-400">{emp.designation}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                        {emp.dateOfJoin || '—'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {emp.inactiveDate || 'Not Specified'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">
                        {tenure}
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                        {emp.remarks || 'Separated'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewEmployee(emp)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Showing <strong>{filtered.length}</strong> of <strong>{inactiveEmployees.length}</strong> inactive records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
