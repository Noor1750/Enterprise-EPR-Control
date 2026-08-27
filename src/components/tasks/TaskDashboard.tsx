import React from 'react';
import { UserSecurityScope } from '../../lib/security';
import { Task, isUserManagerOrAdmin } from '../../lib/taskEngine';
import { format, isToday, parseISO, isValid } from 'date-fns';
import { 
  Layers, Calendar, Clock, PlayCircle, CheckCircle2, 
  AlertOctagon, AlertTriangle, UserCheck, Briefcase, 
  Building2, Users, ArrowRight, ShieldCheck, CheckSquare
} from 'lucide-react';

interface TaskDashboardProps {
  tasks: Task[];
  userSecurityScope: UserSecurityScope | null | undefined;
  activeViewMode: 'all' | 'my-assigned' | 'created-by-me' | 'urgent-today' | 'departments';
  onViewModeChange: (mode: 'all' | 'my-assigned' | 'created-by-me' | 'urgent-today' | 'departments') => void;
  onFilterClick: (filter: string) => void;
  userEmail?: string;
  userDisplayName?: string;
}

export default function TaskDashboard({ 
  tasks, 
  userSecurityScope, 
  activeViewMode,
  onViewModeChange,
  onFilterClick,
  userEmail,
  userDisplayName
}: TaskDashboardProps) {
  const isAdminOrManager = isUserManagerOrAdmin(userSecurityScope) || userEmail?.toLowerCase() === 'noor.alam1750@gmail.com';
  
  const empId = userSecurityScope?.employeeId?.toUpperCase() || '';
  const userName = (userSecurityScope?.employeeName || userDisplayName || '').toLowerCase();
  const cleanEmail = (userEmail || '').toLowerCase();

  // Scoped calculation for personal tasks
  const myAssignedTasks = tasks.filter(t => {
    if (empId && t.assigneeId.toUpperCase() === empId) return true;
    if (userName && t.assigneeName.toLowerCase().includes(userName)) return true;
    return false;
  });

  const myCreatedTasks = tasks.filter(t => {
    if (empId && t.createdById.toUpperCase() === empId) return true;
    if (cleanEmail && t.createdById.toLowerCase() === cleanEmail) return true;
    if (userName && t.createdByName.toLowerCase().includes(userName)) return true;
    return false;
  });

  // Base dataset to compute metrics from depending on current perspective
  const currentTaskSet = (!isAdminOrManager || activeViewMode === 'my-assigned') 
    ? myAssignedTasks 
    : (activeViewMode === 'created-by-me' ? myCreatedTasks : tasks);

  const activeTasks = currentTaskSet.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  
  const totalTasks = currentTaskSet.length;
  const completed = currentTaskSet.filter(t => t.status === 'Completed').length;
  const pending = activeTasks.filter(t => t.status === 'Pending').length;
  const inProgress = activeTasks.filter(t => t.status === 'In Progress').length;
  const overdue = activeTasks.filter(t => t.status === 'Overdue').length;
  const highPriority = activeTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
  const todayTasks = activeTasks.filter(t => t.dueDate && isValid(parseISO(t.dueDate)) && isToday(parseISO(t.dueDate))).length;

  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  // Department workload distribution for Admin/Manager
  const departmentStats = React.useMemo(() => {
    const deptMap: Record<string, { total: number; pending: number; inProgress: number; completed: number; overdue: number }> = {};
    tasks.forEach(t => {
      const dept = t.assigneeDepartment || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 };
      }
      deptMap[dept].total += 1;
      if (t.status === 'Completed') deptMap[dept].completed += 1;
      else if (t.status === 'In Progress') deptMap[dept].inProgress += 1;
      else if (t.status === 'Overdue') deptMap[dept].overdue += 1;
      else deptMap[dept].pending += 1;
    });
    return Object.entries(deptMap).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  const StatCard = ({ title, value, icon: Icon, onClick, colorClass, bgClass, borderClass, hoverClass, badge }: any) => (
    <div 
      onClick={onClick} 
      className={`relative overflow-hidden p-4 rounded-xl shadow-sm border cursor-pointer transition-all ${bgClass} ${borderClass} ${hoverClass} hover:-translate-y-0.5`}
    >
      <div className="flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between gap-1">
          <div className={`text-[11px] font-bold uppercase tracking-wider ${colorClass}`}>{title}</div>
          <Icon className={`w-4 h-4 ${colorClass} opacity-80 shrink-0`} />
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/70 shadow-xs text-gray-700">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Workspace Perspective Switcher Banner */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
            isAdminOrManager ? 'bg-gradient-to-br from-indigo-600 to-indigo-800' : 'bg-gradient-to-br from-[#1ECA98] to-[#128a67]'
          }`}>
            {isAdminOrManager ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-base">
                {isAdminOrManager ? 'Management & Admin Dashboard' : 'My Individual Task Board'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isAdminOrManager ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {userSecurityScope?.role || (isAdminOrManager ? 'Admin' : 'Assigned User')}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isAdminOrManager 
                ? `Showing enterprise task distribution (${tasks.length} total across all departments)`
                : `Assigned to ${userSecurityScope?.employeeName || userDisplayName || 'you'} (${myAssignedTasks.length} active tasks)`}
            </p>
          </div>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl overflow-x-auto hide-scrollbar">
          {isAdminOrManager ? (
            <>
              <button
                onClick={() => onViewModeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> All Organization ({tasks.length})
              </button>
              <button
                onClick={() => onViewModeChange('my-assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'my-assigned'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> My Personal Tasks ({myAssignedTasks.length})
              </button>
              <button
                onClick={() => onViewModeChange('created-by-me')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'created-by-me'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Assigned by Me ({myCreatedTasks.length})
              </button>
              <button
                onClick={() => onViewModeChange('departments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'departments'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Departments ({departmentStats.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onViewModeChange('my-assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'my-assigned'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Assigned to Me ({myAssignedTasks.length})
              </button>
              <button
                onClick={() => onViewModeChange('urgent-today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'urgent-today'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Due Today / Overdue ({todayTasks + overdue})
              </button>
              <button
                onClick={() => onViewModeChange('created-by-me')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeViewMode === 'created-by-me'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Created by Me ({myCreatedTasks.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard 
          title="Total Tasks" value={totalTasks} icon={Layers} onClick={() => onFilterClick('All')}
          colorClass="text-slate-800" bgClass="bg-white" borderClass="border-slate-200" hoverClass="hover:border-slate-300"
          badge={`${completionRate}% done`}
        />
        <StatCard 
          title="Due Today" value={todayTasks} icon={Calendar} onClick={() => onFilterClick('Today')}
          colorClass="text-blue-700" bgClass="bg-blue-50/70" borderClass="border-blue-200" hoverClass="hover:border-blue-300"
          badge="Urgent"
        />
        <StatCard 
          title="Pending" value={pending} icon={Clock} onClick={() => onFilterClick('Pending')}
          colorClass="text-gray-700" bgClass="bg-gray-50/80" borderClass="border-gray-200" hoverClass="hover:border-gray-300"
        />
        <StatCard 
          title="In Progress" value={inProgress} icon={PlayCircle} onClick={() => onFilterClick('In Progress')}
          colorClass="text-indigo-700" bgClass="bg-indigo-50/70" borderClass="border-indigo-200" hoverClass="hover:border-indigo-300"
        />
        <StatCard 
          title="Completed" value={completed} icon={CheckCircle2} onClick={() => onFilterClick('Completed')}
          colorClass="text-emerald-700" bgClass="bg-emerald-50/70" borderClass="border-emerald-200" hoverClass="hover:border-emerald-300"
        />
        <StatCard 
          title="Overdue" value={overdue} icon={AlertOctagon} onClick={() => onFilterClick('Overdue')}
          colorClass="text-rose-700" bgClass="bg-rose-50/70" borderClass="border-rose-200" hoverClass="hover:border-rose-300 hover:shadow-rose-100/50"
          badge={overdue > 0 ? "Action Req" : undefined}
        />
        <StatCard 
          title="High Priority" value={highPriority} icon={AlertTriangle} onClick={() => onFilterClick('High Priority')}
          colorClass="text-amber-700" bgClass="bg-amber-50/70" borderClass="border-amber-200" hoverClass="hover:border-amber-300"
        />
      </div>

      {/* Admin Department Workload Breakdown Panel */}
      {isAdminOrManager && activeViewMode === 'departments' && (
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-sm">Department Task Workload & Distribution</h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Tracking {departmentStats.length} operational departments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map(([dept, dStats]) => {
              const deptCompletion = dStats.total > 0 ? Math.round((dStats.completed / dStats.total) * 100) : 0;
              return (
                <div key={dept} className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/80 hover:bg-white transition-all shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{dept}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                      {dStats.total} Tasks
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${deptCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-8">{deptCompletion}%</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-2 border-t border-gray-200/60">
                    <div className="p-1 rounded bg-white">
                      <div className="text-gray-400 font-medium">Pending</div>
                      <div className="font-bold text-gray-700 mt-0.5">{dStats.pending}</div>
                    </div>
                    <div className="p-1 rounded bg-white">
                      <div className="text-indigo-400 font-medium">Progress</div>
                      <div className="font-bold text-indigo-700 mt-0.5">{dStats.inProgress}</div>
                    </div>
                    <div className="p-1 rounded bg-white">
                      <div className="text-emerald-400 font-medium">Done</div>
                      <div className="font-bold text-emerald-700 mt-0.5">{dStats.completed}</div>
                    </div>
                    <div className="p-1 rounded bg-white">
                      <div className="text-rose-400 font-medium">Overdue</div>
                      <div className="font-bold text-rose-700 mt-0.5">{dStats.overdue}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
