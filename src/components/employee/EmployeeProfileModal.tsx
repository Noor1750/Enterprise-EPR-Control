import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Phone, Mail, Building, Clock, Calendar, Shield, HeartHandshake, 
  Shirt, Footprints, AlertTriangle, CheckCircle2, User, UserCheck, Briefcase,
  History, Edit2, Target, Award, Sparkles, CheckSquare, Zap, Star, ExternalLink,
  ChevronRight, ArrowRight, BarChart3, Wrench, FileSpreadsheet, MapPin, GraduationCap
} from 'lucide-react';
import { EmployeeShiftState, getShiftBadgeStyles, getShiftModeBadgeStyles } from '../../lib/shiftEngine';
import ShiftBadge from '../common/ShiftBadge';
import { VOLUNTEER_ROLES, calculateTenure, EducationalQualification, formatShoeSizeDisplay } from './employeeTypes';
import { useEmployeeCrossModuleHub, EmployeeFullAggregatedData } from '../../lib/employeeDataHub';

interface EmployeeProfileModalProps {
  employee: EmployeeShiftState | null;
  spreadsheetId?: string;
  onClose: () => void;
  onEdit: (emp: EmployeeShiftState) => void;
  onOpenShift: (emp: EmployeeShiftState) => void;
  onOpenHistory: (emp: EmployeeShiftState) => void;
  onNavigate?: (moduleId: string, extraContext?: any) => void;
}

type ProfileTab = 'overview' | 'kpi' | 'skills' | 'fives' | 'tasks' | 'practices' | 'leave-ot' | 'breakdowns';

export default function EmployeeProfileModal({
  employee,
  spreadsheetId = '',
  onClose,
  onEdit,
  onOpenShift,
  onOpenHistory,
  onNavigate
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const { dataMap } = useEmployeeCrossModuleHub(spreadsheetId);

  if (!employee) return null;

  const currentStyle = getShiftBadgeStyles(employee.currentShift);
  const nextStyle = getShiftBadgeStyles(employee.nextWeekShift);
  const modeStyle = getShiftModeBadgeStyles(employee.shiftMode);

  const empData = dataMap[employee.id?.toUpperCase()] || null;

  const volunteerList = (employee.volunteer || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const matchedVolunteerRoles = VOLUNTEER_ROLES.filter(r => 
    volunteerList.some(v => v.toLowerCase() === r.id.toLowerCase() || v.toLowerCase() === r.label.toLowerCase())
  );

  const isInactive = employee.status === 'Inactive';
  const tenure = calculateTenure(employee.dateOfJoin, isInactive ? employee.inactiveDate : undefined);

  const handleJumpModule = (moduleId: string, extraContext?: any) => {
    onClose();
    if (onNavigate) {
      onNavigate(moduleId, extraContext);
    } else {
      window.dispatchEvent(new CustomEvent('erp-module-context', { detail: { moduleId, ...extraContext } }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200/90 max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header Bar with Large Photo */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            
            {/* Prominent Large Profile Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-800 border-3 border-white/25 flex items-center justify-center font-black text-white text-3xl overflow-hidden shadow-xl shrink-0 relative group">
              {employee.profilePicture ? (
                <img 
                  src={employee.profilePicture} 
                  alt={employee.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-white">
                  <span>{employee.name.charAt(0) || 'U'}</span>
                </div>
              )}
              {/* Shift status icon pin on photo */}
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-xs">
                <span>{employee.currentShift.includes('Night') ? '🌙' : '☀️'}</span>
              </div>
            </div>

            {/* Main Info Header */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{employee.name}</h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white/15 text-slate-200 border border-white/10">
                  {employee.id}
                </span>
                
                {/* Category Badge */}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${employee.category === 'Management' ? 'bg-purple-500/20 text-purple-200 border-purple-400/30' : 'bg-blue-500/20 text-blue-200 border-blue-400/30'}`}>
                  {employee.category === 'Management' ? '👔 Management' : '👷 Non-Management'}
                </span>

                {/* Status Badge */}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isInactive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {employee.status}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-300 mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span>{employee.designation || 'Staff Member'}</span>
                <span className="text-slate-500">•</span>
                <strong className="text-white">{employee.department}</strong>
                {employee.workingArea && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">Area: {employee.workingArea}</span>
                  </>
                )}
                {employee.phone && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {employee.phone}
                    </span>
                  </>
                )}
              </div>

              {/* Quick Metrics Bar on Header */}
              {empData && (
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {empData.kpi.latestScore > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>KPI: {empData.kpi.latestScore}% (★ {empData.kpi.latestRating})</span>
                    </div>
                  )}
                  {empData.skills.totalSkills > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{empData.skills.totalSkills} Skills ({empData.skills.highestLevel})</span>
                    </div>
                  )}
                  {empData.fiveS.latestScore > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>5S: {empData.fiveS.latestScore}% ({empData.fiveS.latestRating})</span>
                    </div>
                  )}
                  {empData.tasks.openCount > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{empData.tasks.openCount} Open Tasks</span>
                    </div>
                  )}
                  {empData.bestPractices.totalSavingsUSD > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>${empData.bestPractices.totalSavingsUSD.toLocaleString()} Savings</span>
                    </div>
                  )}
                </div>
              )}

              {isInactive && (
                <div className="mt-2.5 text-xs text-rose-200 bg-rose-950/70 border border-rose-700/50 px-3 py-1 rounded-xl inline-flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Inactive Date: <strong>{employee.inactiveDate || 'N/A'}</strong> (Tenure: {tenure})</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Profile & Shifts</span>
          </button>

          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'kpi'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>KPI Performance {empData && empData.kpi.totalRecords > 0 ? `(${empData.kpi.totalRecords})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'skills'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Skill Matrix {empData && empData.skills.totalSkills > 0 ? `(${empData.skills.totalSkills})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('fives')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'fives'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>5S Audits {empData && empData.fiveS.totalAssessments > 0 ? `(${empData.fiveS.totalAssessments})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Daily Tasks {empData && empData.tasks.totalCount > 0 ? `(${empData.tasks.openCount}/${empData.tasks.totalCount})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('practices')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'practices'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Kaizen & Best Practices {empData && empData.bestPractices.totalCount > 0 ? `(${empData.bestPractices.totalCount})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('leave-ot')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'leave-ot'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Leave & OT</span>
          </button>

          <button
            onClick={() => setActiveTab('breakdowns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'breakdowns'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Maintenance Logs</span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs custom-scrollbar">
          
          {/* TAB 1: OVERVIEW & SHIFTS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Shift Schedule Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Shift Schedule & Weekly Rotation</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${modeStyle.bg}`}>
                    {employee.shiftMode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Week Shift</div>
                    <div className="mt-1.5 font-bold text-slate-800 flex items-center">
                      <ShiftBadge shift={employee.currentShift} size="sm" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{currentStyle.subtext}</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Next Week Shift</div>
                    <div className="mt-1.5 font-bold text-slate-800 flex items-center">
                      <ShiftBadge shift={employee.nextWeekShift} size="sm" className="opacity-90" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Rotates automatically</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs sm:col-span-1 col-span-2">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Effective Date & Base</div>
                    <div className="mt-1 font-mono font-bold text-slate-800">{employee.effectiveDate || '2026-08-01'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span>Base:</span>
                      <ShiftBadge shift={employee.rotationStartingShift} size="xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Apparel & Uniform Sizes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm mb-3">
                  <Shirt className="w-4 h-4 text-indigo-600" />
                  <span>Apparel & Equipment Sizing</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <Shirt className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">T-Shirt / Uniform Size</div>
                      <div className="font-black text-slate-800 text-sm">{employee.tShirtSize || 'Not Specified'}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <Footprints className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Safety Shoe Size</div>
                      <div className="font-black text-slate-800 text-sm">{employee.shoeSize ? formatShoeSizeDisplay(employee.shoeSize) : 'Not Specified'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volunteer & Committee Memberships */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                    <HeartHandshake className="w-4 h-4 text-indigo-600" />
                    <span>Volunteer & Safety Committee Roles</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {matchedVolunteerRoles.length} Committee{matchedVolunteerRoles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {matchedVolunteerRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchedVolunteerRoles.map(r => (
                      <span 
                        key={r.id}
                        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${r.badgeBg}`}
                      >
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1 opacity-80" />
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-1">
                    No volunteer committees assigned to this employee.
                  </div>
                )}
              </div>

              {/* Hierarchy & Organization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">Hierarchy & Organization</div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Supervisor:</span>
                    <span className="font-bold text-slate-800">{employee.supervisor || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Manager:</span>
                    <span className="font-bold text-slate-800">{employee.manager || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Date of Join:</span>
                    <span className="font-semibold text-slate-800">{employee.dateOfJoin || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Service Tenure:</span>
                    <span className="font-bold text-indigo-700">{tenure}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">Contact & Personal</div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono font-bold text-slate-800">{employee.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Emergency Contact:</span>
                    <span className="font-mono font-bold text-slate-800">{employee.emergency || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Marital Status:</span>
                    <span className="font-bold text-slate-800">{employee.maritalStatus || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">National ID (NID):</span>
                    <span className="font-mono font-bold text-slate-800">{employee.nationalId || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Blood Group:</span>
                    <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{employee.bloodGroup || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-semibold text-slate-800">{employee.dateOfBirth || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Present & Permanent Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Present Address</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-emerald-100">
                    <div>{employee.presentAddress || 'Address not specified'}</div>
                    <div className="mt-1 text-[11px] text-slate-500 font-semibold">
                      Thana: <strong className="text-slate-700">{employee.presentThana || '—'}</strong> • District: <strong className="text-slate-700">{employee.presentDistrict || '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-blue-900 text-xs uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Permanent Address</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-blue-100">
                    <div>{employee.permanentAddress || 'Address not specified'}</div>
                    <div className="mt-1 text-[11px] text-slate-500 font-semibold">
                      Thana: <strong className="text-slate-700">{employee.permanentThana || '—'}</strong> • District: <strong className="text-slate-700">{employee.permanentDistrict || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational Qualifications */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/80 space-y-2.5">
                <div className="flex items-center space-x-1.5 font-bold text-purple-900 text-xs uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>Educational Qualifications</span>
                </div>

                {(() => {
                  let eduList: EducationalQualification[] = [];
                  if (employee.education) {
                    try {
                      const parsed = JSON.parse(employee.education);
                      if (Array.isArray(parsed)) eduList = parsed;
                    } catch {
                      if (employee.education.trim()) {
                        eduList = [{ degree: employee.education, institute: '', passingYear: '', result: '' }];
                      }
                    }
                  }

                  if (eduList.length === 0) {
                    return (
                      <div className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-purple-100">
                        No educational qualifications recorded.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {eduList.map((edu, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                          <div className="font-bold text-slate-900 text-xs">{edu.degree}</div>
                          {edu.institute && <div className="text-[11px] text-slate-600">{edu.institute}</div>}
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            {edu.passingYear && <span>Year: {edu.passingYear}</span>}
                            {edu.result && <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">GPA/Div: {edu.result}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: KPI PERFORMANCE */}
          {activeTab === 'kpi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span>KPI Performance Scorecards</span>
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Average Score: <strong className="text-amber-950">{empData?.kpi.averageScore || 0}%</strong> • Rating: <strong className="text-amber-950">{empData?.kpi.averageRating || 0} / 5.0</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('kpi', { search: employee.id })}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open in KPI Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && empData.kpi.records.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Month</th>
                        <th className="p-3">Plan Target</th>
                        <th className="p-3">Achievement</th>
                        <th className="p-3">Rating</th>
                        <th className="p-3">Stars</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {empData.kpi.records.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{r.month}</td>
                          <td className="p-3 text-slate-600">{r.plan}%</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-black ${
                              r.achievement >= 90 ? 'bg-emerald-100 text-emerald-800' :
                              r.achievement >= 80 ? 'bg-blue-100 text-blue-800' :
                              r.achievement >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.achievement}%
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{r.rating} / 5</td>
                          <td className="p-3">
                            <div className="flex items-center text-amber-400">
                              {Array.from({ length: 5 }).map((_, starIdx) => (
                                <Star 
                                  key={starIdx} 
                                  className={`w-3.5 h-3.5 ${starIdx < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No KPI performance scorecards recorded for this employee yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SKILL MATRIX */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-cyan-50 p-4 rounded-2xl border border-cyan-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-600" />
                    <span>Skill Matrix & Certified Competencies</span>
                  </h4>
                  <p className="text-xs text-cyan-900/80 mt-0.5">
                    Highest Certified Level: <strong className="text-cyan-950">{empData?.skills.highestLevel || 'None'}</strong> • Total Skills: <strong>{empData?.skills.totalSkills || 0}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('skill-dashboard', { search: employee.id })}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open in Skill Matrix</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && empData.skills.skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {empData.skills.skills.map((s, i) => (
                    <div key={i} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{s.machineJob}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Machine / Process Competency</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        s.levelNumber >= 5 ? 'bg-purple-100 text-purple-900 border-purple-300' :
                        s.levelNumber === 4 ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                        s.levelNumber === 3 ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        {s.skillLevel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No certified machine skills mapped for this employee yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 5S AUDITS */}
          {activeTab === 'fives' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-teal-50 p-4 rounded-2xl border border-teal-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>5S Visual Management Assessments</span>
                  </h4>
                  <p className="text-xs text-teal-900/80 mt-0.5">
                    Latest Audit Score: <strong className="text-teal-950">{empData?.fiveS.latestScore || 0}%</strong> ({empData?.fiveS.latestRating || 'Unrated'})
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('5s-management', { search: employee.id })}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open 5S Audits</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && empData.fiveS.assessments.length > 0 ? (
                <div className="space-y-3">
                  {empData.fiveS.assessments.map((a, i) => (
                    <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">Audit Date: {a.date} ({a.month})</span>
                          {a.section && <span className="text-slate-500 text-xs ml-2">Section: {a.section}</span>}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          a.finalScore >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          a.finalScore >= 80 ? 'bg-teal-100 text-teal-800' :
                          a.finalScore >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {a.finalScore}% • {a.rating}
                        </span>
                      </div>

                      {/* 5S Pillars Grid */}
                      <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-slate-400 font-bold uppercase">1S Sort</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{a.sortScore}%</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-slate-400 font-bold uppercase">2S Set</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{a.setInOrderScore}%</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-slate-400 font-bold uppercase">3S Shine</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{a.shineScore}%</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-slate-400 font-bold uppercase">4S Standard</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{a.standardizeScore}%</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-slate-400 font-bold uppercase">5S Sustain</div>
                          <div className="font-black text-slate-800 text-xs mt-0.5">{a.sustainScore}%</div>
                        </div>
                      </div>

                      {a.remarks && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <strong>Remarks: </strong> {a.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No 5S assessments recorded for this employee yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DAILY TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Daily Tasks & Workorders</span>
                  </h4>
                  <p className="text-xs text-indigo-900/80 mt-0.5">
                    Open Tasks: <strong className="text-indigo-950">{empData?.tasks.openCount || 0}</strong> • Completed: <strong>{empData?.tasks.completedCount || 0}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('tasks', { search: employee.name })}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open Task Board</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && empData.tasks.tasks.length > 0 ? (
                <div className="space-y-2.5">
                  {empData.tasks.tasks.map((t, i) => (
                    <div key={i} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{t.title}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            t.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                            t.priority === 'High' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'Overdue' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      {t.description && (
                        <p className="text-slate-600 text-xs">{t.description}</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Due: {t.dueDate || 'No Date'} {t.dueTime ? `at ${t.dueTime}` : ''}</span>
                        <span>Progress: <strong>{t.progress}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No daily tasks currently assigned to this employee.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: BEST PRACTICES & KAIZEN */}
          {activeTab === 'practices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Best Practices & Kaizen Contributions</span>
                  </h4>
                  <p className="text-xs text-emerald-900/80 mt-0.5">
                    Total Savings Generated: <strong className="text-emerald-950">${empData?.bestPractices.totalSavingsUSD.toLocaleString() || 0} USD</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('practices', { search: employee.id })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open Best Practices</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && empData.bestPractices.items.length > 0 ? (
                <div className="space-y-3">
                  {empData.bestPractices.items.map((bp, i) => (
                    <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Date: {bp.date}</span>
                        <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                          +${bp.savingsUSD.toLocaleString()} USD
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{bp.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No Kaizen or cost savings submissions logged for this employee yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LEAVE & OVERTIME */}
          {activeTab === 'leave-ot' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Leave Records</span>
                    <div className="text-xl font-black text-purple-950 mt-0.5">{empData?.leave.totalDaysTaken || 0} Days Taken</div>
                    <div className="text-xs text-purple-800 mt-0.5">Pending Approvals: {empData?.leave.pendingCount || 0}</div>
                  </div>
                  <button
                    onClick={() => handleJumpModule('leave', { search: employee.id })}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <span>Leave Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Overtime Records</span>
                    <div className="text-xl font-black text-blue-950 mt-0.5">{empData?.overtime.totalHours || 0} Hours</div>
                    <div className="text-xs text-blue-800 mt-0.5">{empData?.overtime.entries.length || 0} OT Logs Recorded</div>
                  </div>
                  <button
                    onClick={() => handleJumpModule('overtime', { search: employee.id })}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <span>OT Calendar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {empData && empData.leave.leaves.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-slate-100 font-bold text-slate-800 text-xs">Recent Leave History</div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {empData.leave.leaves.slice(0, 5).map((l, i) => (
                      <div key={i} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{l.leaveType}</span>
                          <span className="text-slate-500 ml-2">({l.fromDate} to {l.toDate} • {l.days} days)</span>
                          {l.reason && <p className="text-slate-500 text-[11px] mt-0.5">{l.reason}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'Approved' || l.status === 'Settlement' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: MAINTENANCE & BREAKDOWN LOGS */}
          {activeTab === 'breakdowns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-rose-50 p-4 rounded-2xl border border-rose-200">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-rose-600" />
                    <span>Maintenance Stoppage & Repair Logs</span>
                  </h4>
                  <p className="text-xs text-rose-900/80 mt-0.5">
                    Reported by Employee: <strong>{empData?.breakdown.totalReportedCount || 0}</strong> • Attended & Repaired: <strong>{empData?.breakdown.totalAttendedCount || 0}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleJumpModule('breakdown', { search: employee.id })}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <span>Open Breakdown Log</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {empData && (empData.breakdown.reported.length > 0 || empData.breakdown.attended.length > 0) ? (
                <div className="space-y-3">
                  {empData.breakdown.attended.map((att, i) => (
                    <div key={`att-${i}`} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Attended: {att.machineName} ({att.date})</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{att.status}</span>
                      </div>
                      <div className="text-xs text-slate-600">Activity: <strong>{att.activity}</strong> • Response Time: {att.responseTimeMin} mins • Hours Lost: {att.hoursLost} hrs</div>
                    </div>
                  ))}

                  {empData.breakdown.reported.map((rep, i) => (
                    <div key={`rep-${i}`} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Reported Issue: {rep.machineName} ({rep.date})</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">{rep.status}</span>
                      </div>
                      <p className="text-xs text-slate-600">{rep.problem}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  No breakdown or maintenance activity recorded for this employee.
                </div>
              )}
            </div>
          )}

          {employee.remarks && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
              <span className="font-bold">Remarks / Notes: </span>
              <span>{employee.remarks}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 rounded-b-3xl flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenShift(employee);
              }}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Manage Shift
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenHistory(employee);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 mr-1.5" /> Shift History
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

