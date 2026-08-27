import { useState } from 'react';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, 
  ArrowRight, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import { 
  scanApplicationAccessStatus, 
  AccessNotSetCategory, 
  AccessAuditReport, 
  UserSecurityScope, 
  parseUserSecurityScope 
} from '../../lib/security';

interface AccessNotSetTabProps {
  users: string[][];
  employees: string[][];
  supervisors: string[][];
  onOpenUserModal: (userRow?: string[]) => void;
  onOpenAssignSupervisor: () => void;
  onOpenNavigatorManagement: () => void;
  onOpenSupervisorsRegistry: () => void;
  onOpenUserSummary: (userScope: UserSecurityScope) => void;
  onRefreshAll: () => void;
}

export default function AccessNotSetTab({
  users,
  employees,
  supervisors,
  onOpenUserModal,
  onOpenAssignSupervisor,
  onOpenNavigatorManagement,
  onOpenSupervisorsRegistry,
  onOpenUserSummary,
  onRefreshAll
}: AccessNotSetTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [isScanning, setIsScanning] = useState(false);

  const report: AccessAuditReport = scanApplicationAccessStatus(users, employees, supervisors);

  const allIssues = Object.entries(report.issuesByCategory).flatMap(([cat, list]) => 
    list.map(item => ({ ...item, category: cat as AccessNotSetCategory }))
  );

  const filteredIssues = allIssues.filter(issue => {
    if (selectedCategory !== 'All' && issue.category !== selectedCategory) return false;
    if (severityFilter !== 'All' && issue.severity !== severityFilter) return false;
    return true;
  });

  const handleFix = (issue: any) => {
    if (issue.targetType === 'User') {
      const foundRow = users.find(u => u[0] && u[0].toLowerCase() === issue.targetEntity.toLowerCase());
      if (foundRow) {
        onOpenUserModal(foundRow);
      } else {
        onOpenUserModal();
      }
    } else if (issue.targetType === 'Employee' || issue.category === 'Assignment Configuration') {
      onOpenAssignSupervisor();
    } else if (issue.targetType === 'Navigator') {
      onOpenNavigatorManagement();
    } else if (issue.targetType === 'Supervisor') {
      onOpenSupervisorsRegistry();
    } else {
      const foundUser = users.find(u => u[0] && u[0].toLowerCase() === issue.targetEntity.toLowerCase());
      if (foundUser) {
        onOpenUserSummary(parseUserSecurityScope(foundUser));
      } else {
        onOpenUserModal();
      }
    }
  };

  const handleManualScan = () => {
    setIsScanning(true);
    onRefreshAll();
    setTimeout(() => setIsScanning(false), 600);
  };

  const categories: AccessNotSetCategory[] = [
    'User Configuration',
    'Role Configuration',
    'Module Configuration',
    'Assignment Configuration',
    'Security Configuration'
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full ${
              report.healthColor === 'green' ? 'bg-emerald-500' :
              report.healthColor === 'amber' ? 'bg-amber-500' :
              report.healthColor === 'purple' ? 'bg-purple-500' :
              'bg-rose-500'
            }`} />
            <h2 className="text-lg font-bold text-slate-800">
              Access Configuration Scanner & Health Status
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              report.healthColor === 'green' ? 'bg-emerald-100 text-emerald-800' :
              report.healthColor === 'amber' ? 'bg-amber-100 text-amber-800' :
              report.healthColor === 'purple' ? 'bg-purple-100 text-purple-800' :
              'bg-rose-100 text-rose-800'
            }`}>
              {report.health}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Automated, zero-manual scan across all users, roles, modules, departments, employee assignments, and navigators to ensure no user is left unconfigured or vulnerable.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900">{report.completionPercentage}%</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Access Completion</div>
          </div>

          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            Run Live Scan
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Checks</span>
          <span className="text-xl font-bold text-slate-800">{report.totalChecks}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 block uppercase">Fully Configured</span>
          <span className="text-xl font-bold text-emerald-700">{report.summary.fullyConfiguredUsers}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 block uppercase">Partially Set</span>
          <span className="text-xl font-bold text-amber-700">{report.summary.partiallyConfiguredUsers}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 block uppercase">Access Not Set</span>
          <span className="text-xl font-bold text-rose-700">{report.summary.accessNotSetUsers}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 block uppercase">Conflicts</span>
          <span className="text-xl font-bold text-purple-700">{report.summary.conflictingUsers}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Missing Sup/Nav</span>
          <span className="text-xl font-bold text-slate-800">{report.summary.missingAssignmentsCount + report.summary.missingNavigatorsCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Severity */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Categories ({allIssues.length})
          </button>
          {categories.map(cat => {
            const count = report.issuesByCategory[cat]?.length || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="Warning">Warnings Only</option>
            <option value="Info">Info Only</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className={`bg-white p-5 rounded-xl border transition shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              issue.severity === 'Critical'
                ? 'border-rose-200 hover:border-rose-300 bg-rose-50/10'
                : issue.severity === 'Warning'
                ? 'border-amber-200 hover:border-amber-300 bg-amber-50/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                issue.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                issue.severity === 'Warning' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {issue.severity === 'Critical' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{issue.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    issue.severity === 'Critical' ? 'bg-rose-100 text-rose-800' :
                    issue.severity === 'Warning' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Category: <strong className="text-slate-600">{issue.category}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  {issue.description}
                </p>
                <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
                  <span>Target: <strong className="text-slate-700 font-mono">{issue.targetEntity}</strong> ({issue.targetType})</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleFix(issue)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-xs ${
                issue.severity === 'Critical'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>{issue.actionLabel || 'Configure Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {filteredIssues.length === 0 && (
          <div className="bg-white p-12 text-center rounded-xl border border-emerald-200 bg-emerald-50/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-emerald-900">All Security Checks Passing</h3>
            <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
              No unconfigured users, missing permissions, unlinked supervisors, or orphan navigators found in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
