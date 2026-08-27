import React, { useMemo, useRef } from 'react';
import { 
  X, Award, TrendingUp, TrendingDown, Minus, CheckCircle, 
  AlertTriangle, ShieldCheck, Printer, Calendar, User, Briefcase, 
  Sparkles, Layers, ArrowUpRight
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  FiveSAssessment, 
  FiveSCorrectiveAction, 
  getEmployeePerformanceTrend, 
  getRatingBadge 
} from '../../lib/fiveSEngine';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface FiveSEmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  assessments: FiveSAssessment[];
  correctiveActions: FiveSCorrectiveAction[];
}

export default function FiveSEmployeeProfileModal({
  isOpen,
  onClose,
  employee,
  assessments,
  correctiveActions
}: FiveSEmployeeProfileModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Filter assessments and actions for this specific employee
  const employeeAssessments = useMemo(() => {
    if (!employee) return [];
    return assessments
      .filter(a => a.employeeId === employee.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments, employee]);

  const employeeActions = useMemo(() => {
    if (!employee) return [];
    return correctiveActions.filter(a => a.employeeId === employee.id);
  }, [correctiveActions, employee]);

  // Performance Trend metrics
  const trend = useMemo(() => {
    if (!employee) return null;
    return getEmployeePerformanceTrend(assessments, employee.id);
  }, [employee, assessments]);

  const latestAssessment = employeeAssessments[0] || null;

  // Radar chart data from latest assessment
  const radarData = useMemo(() => {
    if (!latestAssessment) return [];
    return [
      { subject: 'Sort (Seiri)', score: latestAssessment.sortScore, fullMark: 100 },
      { subject: 'Set In Order (Seiton)', score: latestAssessment.setInOrderScore, fullMark: 100 },
      { subject: 'Shine (Seiso)', score: latestAssessment.shineScore, fullMark: 100 },
      { subject: 'Standardize (Seiketsu)', score: latestAssessment.standardizeScore, fullMark: 100 },
      { subject: 'Sustain (Shitsuke)', score: latestAssessment.sustainScore, fullMark: 100 },
      { subject: 'Visual Controls', score: latestAssessment.visualScore, fullMark: 100 },
    ];
  }, [latestAssessment]);

  // Historical trend bar data
  const historyBarData = useMemo(() => {
    return [...employeeAssessments]
      .reverse()
      .map(a => ({
        month: a.month,
        score: a.finalScore,
        fiveS: a.total5SScore,
        visual: a.visualScore
      }));
  }, [employeeAssessments]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                5S & Visual Management Scorecard
              </h2>
              <p className="text-xs text-slate-400">
                Individual Continuous Improvement & Housekeeping Discipline Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Scorecard</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Employee Hero Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">{employee.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold">
                    {employee.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                    <span className="font-bold text-slate-800">{employee.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Designation</span>
                    <span className="font-bold text-slate-800">{employee.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Section / Floor</span>
                    <span className="font-bold text-slate-800">{(employee as any).workingArea || 'Floor 1'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance KPI Pill */}
            {trend && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Latest Score</span>
                  <span className="text-2xl font-black text-blue-600">
                    {trend.history.length > 0 ? `${trend.history[trend.history.length - 1].finalScore}%` : 'N/A'}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Trajectory</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {trend.trendDirection === 'Improving' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> +{trend.trendDelta}%
                      </span>
                    ) : trend.trendDirection === 'Declining' ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" /> {trend.trendDelta}%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5" /> Stable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts Row: Radar 5S Pillar Analysis + Historical Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: 5S Radar Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Current 5S + Visual Dimension Balance
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Pillar-wise score distribution from the latest evaluation ({latestAssessment?.month || 'N/A'}).
              </p>

              {radarData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                      <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No 5S assessment data recorded yet.
                </div>
              )}
            </div>

            {/* Right: Historical Score Progression */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Score Progression Over Time
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Monthly 5S score history showing continuous improvement compliance.
              </p>

              {historyBarData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="score" name="Final Score %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No historical audits available.
                </div>
              )}
            </div>

          </div>

          {/* Audit History Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Assessment History & Audit Trail ({employeeAssessments.length} records)
              </h4>
            </div>

            {employeeAssessments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Date / Month</th>
                      <th className="px-4 py-2.5">Auditor</th>
                      <th className="px-4 py-2.5">5S Score</th>
                      <th className="px-4 py-2.5">Visual Score</th>
                      <th className="px-4 py-2.5">Final Score</th>
                      <th className="px-4 py-2.5">Rating</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeAssessments.map(audit => (
                      <tr key={audit.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {audit.date} <span className="text-slate-400 font-normal">({audit.month})</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{audit.assessorName}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{audit.total5SScore}%</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{audit.visualScore}%</td>
                        <td className="px-4 py-3 font-extrabold text-blue-600">{audit.finalScore}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${audit.badgeClass || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                            {audit.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {audit.remarks || 'Standard audit'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No past assessment records found for this employee.
              </div>
            )}
          </div>

          {/* Corrective Actions & Kaizen Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Assigned Corrective Actions & Improvements ({employeeActions.length})
              </h4>
            </div>

            {employeeActions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {employeeActions.map(action => (
                  <div key={action.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {action.category}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">{action.observation}</h5>
                      </div>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Plan:</span> {action.correctiveAction}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Target: <strong className="text-slate-600">{action.targetDate}</strong></span>
                        {action.closureDate && <span>Closed on: <strong className="text-emerald-600">{action.closureDate}</strong></span>}
                      </div>
                    </div>

                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        action.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        action.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {action.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No corrective actions logged. 100% compliant!
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
          >
            Close Scorecard
          </button>
        </div>

      </div>
    </div>
  );
}
