import React from 'react';
import { 
  X, Phone, Mail, Building, Clock, Calendar, Shield, HeartHandshake, 
  Shirt, Footprints, AlertTriangle, CheckCircle2, User, UserCheck, Briefcase,
  History, Edit2
} from 'lucide-react';
import { EmployeeShiftState, getShiftBadgeStyles, getShiftModeBadgeStyles } from '../../lib/shiftEngine';
import ShiftBadge from '../common/ShiftBadge';
import { VOLUNTEER_ROLES, calculateTenure } from './employeeTypes';

interface EmployeeProfileModalProps {
  employee: EmployeeShiftState | null;
  onClose: () => void;
  onEdit: (emp: EmployeeShiftState) => void;
  onOpenShift: (emp: EmployeeShiftState) => void;
  onOpenHistory: (emp: EmployeeShiftState) => void;
}

export default function EmployeeProfileModal({
  employee,
  onClose,
  onEdit,
  onOpenShift,
  onOpenHistory
}: EmployeeProfileModalProps) {
  if (!employee) return null;

  const currentStyle = getShiftBadgeStyles(employee.currentShift);
  const nextStyle = getShiftBadgeStyles(employee.nextWeekShift);
  const modeStyle = getShiftModeBadgeStyles(employee.shiftMode);

  const volunteerList = (employee.volunteer || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const matchedVolunteerRoles = VOLUNTEER_ROLES.filter(r => 
    volunteerList.some(v => v.toLowerCase() === r.id.toLowerCase() || v.toLowerCase() === r.label.toLowerCase())
  );

  const isInactive = employee.status === 'Inactive';
  const tenure = calculateTenure(employee.dateOfJoin, isInactive ? employee.inactiveDate : undefined);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        
        {/* Modal Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-t-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
            
            {/* Profile Avatar / Photo */}
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-white/20 flex items-center justify-center font-bold text-white text-2xl overflow-hidden shadow-md shrink-0">
              {employee.profilePicture ? (
                <img 
                  src={employee.profilePicture} 
                  alt={employee.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-white/90">{employee.name.charAt(0) || 'U'}</span>
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-white">{employee.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {employee.id}
                </span>
                
                {/* Category Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${employee.category === 'Management' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                  {employee.category === 'Management' ? '👔 Management' : '👷 Non-Management'}
                </span>

                {/* Status Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isInactive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {employee.status}
                </span>
              </div>

              <div className="text-xs text-slate-300 mt-1">
                {employee.designation || 'Staff Member'} • <strong className="text-white">{employee.department}</strong>
                {employee.workingArea ? ` (${employee.workingArea})` : ''}
              </div>

              {isInactive && (
                <div className="mt-2 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/50 px-2.5 py-1 rounded-lg inline-flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Inactive Date: <strong>{employee.inactiveDate || 'N/A'}</strong> (Tenure: {tenure})</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Shift Schedule Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Shift Schedule & Weekly Rotation</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${modeStyle.bg}`}>
                {employee.shiftMode}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Current Week Shift</div>
                <div className="mt-1.5 font-bold text-slate-800 flex items-center">
                  <ShiftBadge shift={employee.currentShift} size="sm" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{currentStyle.subtext}</div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Next Week Shift</div>
                <div className="mt-1.5 font-bold text-slate-800 flex items-center">
                  <ShiftBadge shift={employee.nextWeekShift} size="sm" className="opacity-90" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Rotates automatically</div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-1 col-span-2">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Effective Date</div>
                <div className="mt-1 font-mono font-bold text-slate-800">{employee.effectiveDate || '2026-08-01'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>Base:</span>
                  <ShiftBadge shift={employee.rotationStartingShift} size="xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Apparel & Uniform Sizes */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 mb-2">
              <Shirt className="w-4 h-4 text-indigo-600" />
              <span>Apparel & Equipment Sizing</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Shirt className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">T-Shirt Size</div>
                  <div className="font-bold text-slate-800 text-sm">{employee.tShirtSize || 'Not Specified'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Footprints className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Shoe Size</div>
                  <div className="font-bold text-slate-800 text-sm">{employee.shoeSize ? `EU ${employee.shoeSize}` : 'Not Specified'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer & Committee Memberships */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <HeartHandshake className="w-4 h-4 text-indigo-600" />
                <span>Volunteer & Safety Committee Roles</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {matchedVolunteerRoles.length} Committee{matchedVolunteerRoles.length !== 1 ? 's' : ''}
              </span>
            </div>

            {matchedVolunteerRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {matchedVolunteerRoles.map(r => (
                  <span 
                    key={r.id}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${r.badgeBg}`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                    <CheckCircle2 className="w-3 h-3 ml-0.5 opacity-80" />
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-1">
                No volunteer committees assigned to this employee.
              </div>
            )}
          </div>

          {/* Contact, Supervisor & Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Left: Organization & Hierarchy */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs">Hierarchy & Organization</div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Supervisor:</span>
                <span className="font-semibold text-slate-800">{employee.supervisor || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Manager:</span>
                <span className="font-semibold text-slate-800">{employee.manager || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Date of Join:</span>
                <span className="font-semibold text-slate-800">{employee.dateOfJoin || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Service Tenure:</span>
                <span className="font-semibold text-slate-800">{tenure}</span>
              </div>
            </div>

            {/* Right: Personal & Contact */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs">Contact & Personal</div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-800">{employee.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Emergency:</span>
                <span className="font-semibold text-slate-800">{employee.emergency || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-bold text-rose-700">{employee.bloodGroup || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-semibold text-slate-800">{employee.dateOfBirth || '—'}</span>
              </div>
            </div>

          </div>

          {employee.remarks && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <span className="font-bold">Remarks / Exit Notes: </span>
              <span>{employee.remarks}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenShift(employee);
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center transition"
            >
              <Clock className="w-3.5 h-3.5 mr-1" /> Manage Shift
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenHistory(employee);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center transition"
            >
              <History className="w-3.5 h-3.5 mr-1" /> Shift History
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm transition"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Profile
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
