import React, { useState } from 'react';
import { 
  X, Check, Shield, Users, Briefcase, Clock, HeartHandshake, 
  Shirt, Footprints, AlertCircle, Loader2, CheckSquare, Square,
  Building, UserCheck, AlertTriangle
} from 'lucide-react';
import { EmployeeShiftState, ShiftType, ShiftMode } from '../../lib/shiftEngine';
import { VOLUNTEER_ROLES, TSHIRT_SIZES, SHOE_SIZES, SHOE_SIZE_MAPPINGS } from './employeeTypes';

export interface BulkEditFieldValues {
  updateDepartment: boolean;
  department: string;
  
  updateWorkingArea: boolean;
  workingArea: string;
  
  updateDesignation: boolean;
  designation: string;

  updateCategory: boolean;
  category: 'Management' | 'Non-Management';

  updateSupervisor: boolean;
  supervisor: string;

  updateManager: boolean;
  manager: string;

  updateStatus: boolean;
  status: 'Active' | 'Inactive';
  inactiveDate: string;

  updateShift: boolean;
  shift: ShiftType;

  updateShiftMode: boolean;
  shiftMode: ShiftMode;

  updateVolunteer: boolean;
  volunteerMode: 'replace' | 'clear';
  volunteerRoles: string[];

  updateApparel: boolean;
  tShirtSize: string;
  shoeSize: string;

  updateRemarks: boolean;
  remarksMode: 'append' | 'replace';
  remarks: string;
}

interface BulkEmployeeEditModalProps {
  isOpen: boolean;
  selectedEmployees: EmployeeShiftState[];
  supervisors: string[][];
  managers: string[][];
  departments: string[];
  workingAreas: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (bulkData: BulkEditFieldValues) => Promise<void>;
}

export default function BulkEmployeeEditModal({
  isOpen,
  selectedEmployees,
  supervisors,
  managers,
  departments,
  workingAreas,
  isSubmitting,
  onClose,
  onSubmit
}: BulkEmployeeEditModalProps) {
  const [fields, setFields] = useState<BulkEditFieldValues>({
    updateDepartment: false,
    department: departments[0] || 'Cutting',

    updateWorkingArea: false,
    workingArea: '',

    updateDesignation: false,
    designation: '',

    updateCategory: false,
    category: 'Non-Management',

    updateSupervisor: false,
    supervisor: '',

    updateManager: false,
    manager: '',

    updateStatus: false,
    status: 'Active',
    inactiveDate: new Date().toISOString().split('T')[0],

    updateShift: false,
    shift: 'Day Shift',

    updateShiftMode: false,
    shiftMode: 'Automatic Rotation',

    updateVolunteer: false,
    volunteerMode: 'replace',
    volunteerRoles: [],

    updateApparel: false,
    tShirtSize: '',
    shoeSize: '',

    updateRemarks: false,
    remarksMode: 'append',
    remarks: ''
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasAnyFieldSelected = 
    fields.updateDepartment ||
    fields.updateWorkingArea ||
    fields.updateDesignation ||
    fields.updateCategory ||
    fields.updateSupervisor ||
    fields.updateManager ||
    fields.updateStatus ||
    fields.updateShift ||
    fields.updateShiftMode ||
    fields.updateVolunteer ||
    fields.updateApparel ||
    fields.updateRemarks;

  const handleToggleVolunteerRole = (roleId: string) => {
    setFields(prev => {
      const exists = prev.volunteerRoles.includes(roleId);
      const nextRoles = exists 
        ? prev.volunteerRoles.filter(r => r !== roleId)
        : [...prev.volunteerRoles, roleId];
      return { ...prev, volunteerRoles: nextRoles };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyFieldSelected) {
      setFormError('Please select at least one field to update across selected employees.');
      return;
    }
    setFormError(null);
    await onSubmit(fields);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4.5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Bulk Edit Employees
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Authorized
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Updating <strong className="text-amber-300">{selectedEmployees.length}</strong> selected employee records simultaneously
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Employees Chips Bar */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Selected:</span>
          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto custom-scrollbar">
            {selectedEmployees.map((emp) => (
              <span 
                key={emp.id} 
                className="bg-white border border-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-lg text-[11px] shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <span className="font-mono text-indigo-600 font-bold">{emp.id}</span>
                <span className="truncate max-w-[120px]">{emp.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Instructions Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100/80 text-xs text-indigo-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Check only the boxes next to the fields you want to update. Any unchecked fields will remain completely unchanged for all {selectedEmployees.length} employees.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-220px)] custom-scrollbar">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-800 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Organizational & Department Structure */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Organizational Placement</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Department */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateDepartment ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateDepartment}
                    onChange={(e) => setFields(prev => ({ ...prev, updateDepartment: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Department</span>
                </label>
                <input
                  type="text"
                  disabled={!fields.updateDepartment || isSubmitting}
                  value={fields.department}
                  onChange={(e) => setFields(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Cutting, Sewing, Packaging"
                  list="bulk-dept-list"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
                <datalist id="bulk-dept-list">
                  {departments.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>

              {/* Working Area */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateWorkingArea ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateWorkingArea}
                    onChange={(e) => setFields(prev => ({ ...prev, updateWorkingArea: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Working Area / Section</span>
                </label>
                <input
                  type="text"
                  disabled={!fields.updateWorkingArea || isSubmitting}
                  value={fields.workingArea}
                  onChange={(e) => setFields(prev => ({ ...prev, workingArea: e.target.value }))}
                  placeholder="e.g. Floor 1, Line A, Workshop"
                  list="bulk-area-list"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
                <datalist id="bulk-area-list">
                  {workingAreas.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>

              {/* Designation */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateDesignation ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateDesignation}
                    onChange={(e) => setFields(prev => ({ ...prev, updateDesignation: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Designation / Title</span>
                </label>
                <input
                  type="text"
                  disabled={!fields.updateDesignation || isSubmitting}
                  value={fields.designation}
                  onChange={(e) => setFields(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Senior Operator, QC Inspector"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>

              {/* Classification */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateCategory ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateCategory}
                    onChange={(e) => setFields(prev => ({ ...prev, updateCategory: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Classification</span>
                </label>
                <select
                  disabled={!fields.updateCategory || isSubmitting}
                  value={fields.category}
                  onChange={(e) => setFields(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="Non-Management">👷 Non-Management (Operators, Helpers, Technicians)</option>
                  <option value="Management">👔 Management (Officers, Supervisors, Managers)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Management Hierarchy & Reporting */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Reporting Hierarchy & Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Supervisor */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateSupervisor ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateSupervisor}
                    onChange={(e) => setFields(prev => ({ ...prev, updateSupervisor: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Supervisor</span>
                </label>
                <input
                  type="text"
                  disabled={!fields.updateSupervisor || isSubmitting}
                  value={fields.supervisor}
                  onChange={(e) => setFields(prev => ({ ...prev, supervisor: e.target.value }))}
                  placeholder="Supervisor Name"
                  list="bulk-sup-list"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
                <datalist id="bulk-sup-list">
                  {supervisors.map((s, idx) => (
                    <option key={idx} value={s[0]}>{s[0]} ({s[2] || 'Supervisor'})</option>
                  ))}
                </datalist>
              </div>

              {/* Manager */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateManager ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateManager}
                    onChange={(e) => setFields(prev => ({ ...prev, updateManager: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Manager</span>
                </label>
                <input
                  type="text"
                  disabled={!fields.updateManager || isSubmitting}
                  value={fields.manager}
                  onChange={(e) => setFields(prev => ({ ...prev, manager: e.target.value }))}
                  placeholder="Manager Name"
                  list="bulk-mgr-list"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
                <datalist id="bulk-mgr-list">
                  {managers.map((m, idx) => (
                    <option key={idx} value={m[0]}>{m[0]} ({m[2] || 'Manager'})</option>
                  ))}
                </datalist>
              </div>

              {/* Status */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateStatus ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateStatus}
                    onChange={(e) => setFields(prev => ({ ...prev, updateStatus: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Employment Status</span>
                </label>
                <select
                  disabled={!fields.updateStatus || isSubmitting}
                  value={fields.status}
                  onChange={(e) => setFields(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="Active">🟢 Active</option>
                  <option value="Inactive">🔴 Inactive (Separated)</option>
                </select>
                {fields.status === 'Inactive' && fields.updateStatus && (
                  <input
                    type="date"
                    value={fields.inactiveDate}
                    onChange={(e) => setFields(prev => ({ ...prev, inactiveDate: e.target.value }))}
                    className="w-full mt-2 text-xs px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-rose-800"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Shifts & Rotation Schedule */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Shift Schedules & Rotation Mode</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Shift */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateShift ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateShift}
                    onChange={(e) => setFields(prev => ({ ...prev, updateShift: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Set Current Shift</span>
                </label>
                <select
                  disabled={!fields.updateShift || isSubmitting}
                  value={fields.shift}
                  onChange={(e) => setFields(prev => ({ ...prev, shift: e.target.value as ShiftType }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="Day Shift">☀️ Day Shift (09:00 AM – 06:00 PM)</option>
                  <option value="Night Shift">🌙 Night Shift (08:00 PM – 05:00 AM)</option>
                  <option value="General">🏢 General Duty (09:00 AM – 06:00 PM)</option>
                </select>
              </div>

              {/* Shift Mode */}
              <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateShiftMode ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={fields.updateShiftMode}
                    onChange={(e) => setFields(prev => ({ ...prev, updateShiftMode: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Set Shift Mode</span>
                </label>
                <select
                  disabled={!fields.updateShiftMode || isSubmitting}
                  value={fields.shiftMode}
                  onChange={(e) => setFields(prev => ({ ...prev, shiftMode: e.target.value as ShiftMode }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="Automatic Rotation">🔄 Automatic Rotation (Weekly Saturday Switch)</option>
                  <option value="Manual Override">🔒 Manual Override (Locked)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Volunteer Committees & Apparel */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-slate-500" />
              <span>Volunteering & Apparel</span>
            </h4>

            {/* Volunteer Roles */}
            <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateVolunteer ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fields.updateVolunteer}
                    onChange={(e) => setFields(prev => ({ ...prev, updateVolunteer: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Volunteer Committees</span>
                </label>
                {fields.updateVolunteer && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFields(prev => ({ ...prev, volunteerMode: 'replace' }))}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${fields.volunteerMode === 'replace' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Assign Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields(prev => ({ ...prev, volunteerMode: 'clear', volunteerRoles: [] }))}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${fields.volunteerMode === 'clear' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Clear All Roles
                    </button>
                  </div>
                )}
              </div>

              {fields.updateVolunteer && fields.volunteerMode === 'replace' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                  {VOLUNTEER_ROLES.map(role => {
                    const isSelected = fields.volunteerRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleToggleVolunteerRole(role.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border transition ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{role.icon}</span>
                        <span className="truncate">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Apparel Sizes */}
            <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateApparel ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={fields.updateApparel}
                  onChange={(e) => setFields(prev => ({ ...prev, updateApparel: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800">Update Apparel Sizes</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">T-Shirt Size</label>
                  <select
                    disabled={!fields.updateApparel || isSubmitting}
                    value={fields.tShirtSize}
                    onChange={(e) => setFields(prev => ({ ...prev, tShirtSize: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                  >
                    <option value="">Keep / Don't Change</option>
                    {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shoe Size (BD / EU)</label>
                  <select
                    disabled={!fields.updateApparel || isSubmitting}
                    value={fields.shoeSize}
                    onChange={(e) => setFields(prev => ({ ...prev, shoeSize: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                  >
                    <option value="">Keep / Don't Change</option>
                    {SHOE_SIZE_MAPPINGS.map(s => <option key={s.eu} value={s.eu}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className={`p-3.5 rounded-2xl border transition-all ${fields.updateRemarks ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fields.updateRemarks}
                    onChange={(e) => setFields(prev => ({ ...prev, updateRemarks: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Update Remarks / Audit Note</span>
                </label>
                {fields.updateRemarks && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFields(prev => ({ ...prev, remarksMode: 'append' }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${fields.remarksMode === 'append' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Append Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields(prev => ({ ...prev, remarksMode: 'replace' }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${fields.remarksMode === 'replace' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Overwrite Note
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                disabled={!fields.updateRemarks || isSubmitting}
                value={fields.remarks}
                onChange={(e) => setFields(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="e.g. Reassigned per Line 2 restructuring order"
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white">
            <div className="text-xs text-slate-500">
              {hasAnyFieldSelected ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Ready to update {selectedEmployees.length} profiles
                </span>
              ) : (
                <span className="text-slate-400">Select at least one field above to update</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!hasAnyFieldSelected || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Bulk Updates...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Apply Bulk Changes ({selectedEmployees.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
