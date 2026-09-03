import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Volume2, VolumeX, CheckCircle2, Clock, Calendar, 
  AlertTriangle, CheckSquare, Sparkles, ChevronRight, Play, 
  Settings, X, ShieldCheck, ArrowRight, RefreshCw, UserCheck, 
  Coffee, Sliders, Moon, Sun, Info, Award
} from 'lucide-react';
import { 
  EmployeeReminderConfig, 
  BangladeshTimeInfo,
  getBangladeshDateTime, 
  getEmployeeReminderConfig, 
  saveEmployeeReminderConfig, 
  acknowledgeEmployeeTasks, 
  snoozeEmployeeTasks,
  checkBangladeshHolidayOrWeekend
} from '../../lib/taskReminderEngine';
import { 
  TaskSoundType, 
  SOUND_OPTIONS, 
  playTaskNotificationSound 
} from '../../lib/taskSoundEngine';
import { Task } from '../../lib/taskEngine';
import { HolidayRecord } from '../../lib/holidayEngine';
import { format, parseISO, isValid } from 'date-fns';

interface DailyTaskNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  employeeDepartment?: string;
  tasks: Task[];
  holidays?: HolidayRecord[];
  onUpdateTaskProgress?: (taskId: string, progress: number, status: Task['status']) => Promise<void>;
  onNavigateToTasks?: (searchTerm?: string) => void;
}

export default function DailyTaskNotificationModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeRole = 'Staff',
  employeeDepartment = 'Operations',
  tasks,
  holidays = [],
  onUpdateTaskProgress,
  onNavigateToTasks
}: DailyTaskNotificationModalProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings'>('tasks');
  const [config, setConfig] = useState<EmployeeReminderConfig>(() => 
    getEmployeeReminderConfig(employeeId, employeeName)
  );
  
  const [bdTime, setBdTime] = useState<BangladeshTimeInfo>(getBangladeshDateTime());
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgeNote, setAcknowledgeNote] = useState('');
  const [customSnoozeTime, setCustomSnoozeTime] = useState('11:00');
  const [newReminderTimeInput, setNewReminderTimeInput] = useState('14:00');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync config when employee changes
  useEffect(() => {
    if (employeeId) {
      setConfig(getEmployeeReminderConfig(employeeId, employeeName));
    }
  }, [employeeId, employeeName]);

  // Live Bangladesh clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setBdTime(getBangladeshDateTime());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks specific to this employee
  const employeeTasks = useMemo(() => {
    const cleanId = (employeeId || '').toUpperCase().trim();
    const cleanName = (employeeName || '').toLowerCase().trim();

    return tasks.filter(t => {
      if (t.deleted === 'TRUE') return false;
      const idMatch = cleanId && t.assigneeId && t.assigneeId.toUpperCase().trim() === cleanId;
      const nameMatch = cleanName && t.assigneeName && t.assigneeName.toLowerCase().includes(cleanName);
      return idMatch || nameMatch;
    });
  }, [tasks, employeeId, employeeName]);

  const activeEmployeeTasks = useMemo(() => {
    return employeeTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  }, [employeeTasks]);

  const todayStr = bdTime.dateString;

  const dueTodayTasks = useMemo(() => {
    return activeEmployeeTasks.filter(t => t.dueDate === todayStr);
  }, [activeEmployeeTasks, todayStr]);

  const overdueTasks = useMemo(() => {
    return activeEmployeeTasks.filter(t => {
      if (!t.dueDate) return false;
      return t.dueDate < todayStr || t.status === 'Overdue';
    });
  }, [activeEmployeeTasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    return activeEmployeeTasks.filter(t => !dueTodayTasks.includes(t) && !overdueTasks.includes(t));
  }, [activeEmployeeTasks, dueTodayTasks, overdueTasks]);

  const completedTodayTasks = useMemo(() => {
    return employeeTasks.filter(t => t.status === 'Completed' && t.completedAt && t.completedAt.startsWith(todayStr));
  }, [employeeTasks, todayStr]);

  const completionRate = employeeTasks.length > 0 
    ? Math.round((employeeTasks.filter(t => t.status === 'Completed').length / employeeTasks.length) * 100)
    : 0;

  // Holiday or Weekend check
  const holidayCheck = useMemo(() => {
    return checkBangladeshHolidayOrWeekend(
      bdTime, 
      holidays, 
      config.excludeWeekends, 
      config.excludeHolidays
    );
  }, [bdTime, holidays, config.excludeWeekends, config.excludeHolidays]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Sound testing
  const handleTestSound = async (soundKey: TaskSoundType = config.soundKey) => {
    setIsPlayingSample(true);
    await playTaskNotificationSound(soundKey, config.soundVolume);
    setTimeout(() => setIsPlayingSample(false), 900);
  };

  // Save updated config
  const handleUpdateConfig = (partial: Partial<EmployeeReminderConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    saveEmployeeReminderConfig(updated);
    showToast('Preferences updated successfully');
  };

  // Employee Acknowledgement
  const handleAcknowledgeAndClose = () => {
    setIsAcknowledging(true);
    const count = activeEmployeeTasks.length;
    acknowledgeEmployeeTasks(config, count, acknowledgeNote);
    
    showToast(`✓ Acknowledged ${count} task(s) for today`);
    setTimeout(() => {
      setIsAcknowledging(false);
      onClose();
    }, 400);
  };

  // Quick Snooze
  const handleQuickSnooze = (minutesOrTime: number | string) => {
    const updated = snoozeEmployeeTasks(config, minutesOrTime);
    setConfig(updated);
    if (typeof minutesOrTime === 'number') {
      showToast(`Reminder snoozed for ${minutesOrTime} minutes`);
    } else {
      showToast(`Reminder snoozed until ${minutesOrTime}`);
    }
    setTimeout(() => onClose(), 600);
  };

  // Quick Progress update
  const handleQuickProgress = async (taskId: string, targetProgress: number) => {
    if (!onUpdateTaskProgress) return;
    try {
      setUpdatingTaskId(taskId);
      const newStatus = targetProgress === 100 ? 'Completed' : (targetProgress > 0 ? 'In Progress' : 'Pending');
      await onUpdateTaskProgress(taskId, targetProgress, newStatus);
      showToast(`Task progress updated to ${targetProgress}%`);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Banner: Smart Brand, Bangladesh Time, Sound Status */}
          <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0 border-b border-white/10">
            {/* Background Decorative Accent */}
            <div className="absolute top-0 right-0 w-80 h-36 bg-gradient-to-bl from-indigo-500/20 via-sky-500/10 to-transparent blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 p-0.5 shadow-lg flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-sky-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Daily Task Briefing & Reminders
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-300" />
                      Smart Popup
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                    <span className="font-semibold text-white">{employeeName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono text-[11px]">{employeeId || 'Staff'}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{employeeDepartment}</span>
                  </div>
                </div>
              </div>

              {/* Close & Sound Quick Bar */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleTestSound()}
                  disabled={config.soundKey === 'mute' || isPlayingSample}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    config.soundKey === 'mute'
                      ? 'bg-slate-800 text-slate-500 border-slate-700 opacity-60'
                      : 'bg-indigo-600/50 hover:bg-indigo-600 text-indigo-100 border-indigo-400/40 hover:text-white shadow-xs'
                  }`}
                  title="Test current notification sound"
                >
                  {config.soundKey === 'mute' ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className={`w-3.5 h-3.5 ${isPlayingSample ? 'animate-bounce text-sky-300' : ''}`} />
                  )}
                  <span>{config.soundKey === 'mute' ? 'Muted' : 'Sound On'}</span>
                </button>

                <button
                  onClick={() => setActiveTab(activeTab === 'tasks' ? 'settings' : 'tasks')}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-sky-500 text-white border-sky-400'
                      : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border-white/10'
                  }`}
                  title="Reminder & Sound Preferences"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time & Bangladesh Work Schedule Telemetry */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono font-bold text-white">{bdTime.formattedTime12}</span>
                  <span className="text-[10px] text-sky-200 uppercase tracking-wider font-semibold">BST (UTC+6)</span>
                </div>
                <span>{bdTime.formattedDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden md:inline">Cycle:</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sat – Thu Working Week
                </span>

                {holidayCheck.isNonWorking && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    <span>{holidayCheck.reason}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Toast Notification message */}
          {successToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 transition-all">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-slate-100/90 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'tasks'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>My Daily Tasks ({activeEmployeeTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Sound & Schedule Options</span>
              </button>
            </div>

            {config.lastAcknowledgedDate === todayStr && (
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Acknowledged for Today</span>
              </div>
            )}
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {activeTab === 'tasks' ? (
              <>
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Due Today</div>
                    <div className="text-2xl font-black text-indigo-950 mt-1">{dueTodayTasks.length}</div>
                    <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">Scheduled for today</div>
                  </div>

                  <div className={`rounded-2xl p-3.5 border ${
                    overdueTasks.length > 0 
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${
                      overdueTasks.length > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}>
                      Overdue
                    </div>
                    <div className="text-2xl font-black mt-1">{overdueTasks.length}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${
                      overdueTasks.length > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {overdueTasks.length > 0 ? 'Action required immediately' : 'No overdue items'}
                    </div>
                  </div>

                  <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Upcoming & Pending</div>
                    <div className="text-2xl font-black text-sky-950 mt-1">{upcomingTasks.length}</div>
                    <div className="text-[10px] text-sky-600 mt-0.5 font-medium">In your queue</div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Completion</div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">{completionRate}%</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                      {completedTodayTasks.length} done today
                    </div>
                  </div>
                </div>

                {/* Overdue Warning Alert if any */}
                {overdueTasks.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-rose-900">
                        {overdueTasks.length} Overdue Task(s) Require Priority Attention
                      </h4>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                        These responsibilities were scheduled for completion earlier. Please update your progress or mark them resolved.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>Assigned Tasks Requiring Attention</span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                        {activeEmployeeTasks.length} Total
                      </span>
                    </h3>

                    {onNavigateToTasks && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTasks(employeeName);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Full Task Board</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {activeEmployeeTasks.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <h4 className="text-sm font-black text-slate-800">You're All Caught Up!</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        There are currently no pending tasks assigned to {employeeName}. Great job maintaining your work queue!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {activeEmployeeTasks.map(task => {
                        const isOverdue = overdueTasks.includes(task);
                        const isDueToday = dueTodayTasks.includes(task);

                        return (
                          <div 
                            key={task.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isOverdue 
                                ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                                : isDueToday 
                                  ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300' 
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                    task.priority === 'Critical' 
                                      ? 'bg-rose-600 text-white' 
                                      : task.priority === 'High' 
                                        ? 'bg-amber-500 text-white' 
                                        : task.priority === 'Medium' 
                                          ? 'bg-sky-500 text-white' 
                                          : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {task.priority}
                                  </span>

                                  {isOverdue && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                                      Overdue
                                    </span>
                                  )}

                                  {isDueToday && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                                      Due Today
                                    </span>
                                  )}

                                  {task.category && (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {task.category}
                                    </span>
                                  )}

                                  <span className="text-[10px] font-mono text-slate-400">
                                    {task.id}
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                                  {task.title}
                                </h4>

                                {task.description && (
                                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>Due: {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ''}</span>
                                    </span>
                                  )}

                                  <span>•</span>
                                  <span>Progress: <strong className="text-slate-800">{task.progress || 0}%</strong></span>
                                </div>
                              </div>

                              {/* 1-Click Progress Actions */}
                              <div className="shrink-0 flex flex-col items-end gap-1.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Quick Progress
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={updatingTaskId === task.id}
                                    onClick={() => handleQuickProgress(task.id, 50)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                    title="Mark 50% In Progress"
                                  >
                                    50%
                                  </button>

                                  <button
                                    type="button"
                                    disabled={updatingTaskId === task.id}
                                    onClick={() => handleQuickProgress(task.id, 75)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                    title="Mark 75% Progress"
                                  >
                                    75%
                                  </button>

                                  <button
                                    type="button"
                                    disabled={updatingTaskId === task.id}
                                    onClick={() => handleQuickProgress(task.id, 100)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                    title="Mark 100% Completed"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Done</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Snooze & Pop-up Again Section */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-800">
                        Set New Reminder to Pop Up Again
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Snooze or schedule review</span>
                  </div>

                  {/* Quick Snooze Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickSnooze(15)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 transition shadow-2xs cursor-pointer"
                    >
                      +15 Minutes
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSnooze(30)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 transition shadow-2xs cursor-pointer"
                    >
                      +30 Minutes
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSnooze(60)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 transition shadow-2xs cursor-pointer"
                    >
                      +1 Hour
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSnooze('14:00')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 transition shadow-2xs cursor-pointer"
                    >
                      Afternoon (2:00 PM)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSnooze('17:00')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 transition shadow-2xs cursor-pointer"
                    >
                      End of Day (5:00 PM)
                    </button>
                  </div>

                  {/* Custom Snooze Time Input */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-xs text-slate-600 font-semibold">Or set custom time:</span>
                    <input
                      type="time"
                      value={customSnoozeTime}
                      onChange={e => setCustomSnoozeTime(e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickSnooze(customSnoozeTime)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Set Reminder
                    </button>
                  </div>
                </div>

                {/* Acknowledgment Section */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/90 to-sky-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-700" />
                      <h4 className="text-xs font-black text-indigo-950">
                        Employee Knowledge & Task Acknowledgement
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      Audit Verification
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    By closing with knowledge, you confirm that you have reviewed your assigned daily tasks for {bdTime.formattedDate} and are committed to updating progress throughout your shift.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Optional shift note / plan (e.g. Completing cutting line workorders first)..."
                      value={acknowledgeNote}
                      onChange={e => setAcknowledgeNote(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Settings & Sound Options Tab */
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Notification Sound & Alert Preferences (Individual Employee)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your personalized sound theme, volume level, and daily alert schedule.
                  </p>
                </div>

                {/* Sound Chooser */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>Select Alert Sound</span>
                    <span className="text-[11px] font-normal text-slate-400">Synthesized Web Audio (Zero Downloads)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SOUND_OPTIONS.map(opt => {
                      const isSelected = config.soundKey === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleUpdateConfig({ soundKey: opt.id })}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{opt.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {opt.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">{opt.description}</div>
                          </div>

                          {opt.id !== 'mute' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestSound(opt.id);
                              }}
                              className="p-2 rounded-xl bg-indigo-100/70 hover:bg-indigo-200 text-indigo-700 transition cursor-pointer"
                              title="Preview sound"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                      <span>Alert Sound Volume</span>
                    </span>
                    <span className="font-mono text-indigo-700">{Math.round(config.soundVolume * 100)}%</span>
                  </div>

                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={config.soundVolume}
                    onChange={e => handleUpdateConfig({ soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Bangladesh Schedule & Rule Controls */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      Bangladesh Working Week & Holiday Suppression Rules
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ensures notifications align with Bangladesh corporate manufacturing work schedules.
                    </p>
                  </div>

                  {/* Weekend Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.excludeWeekends}
                      onChange={e => handleUpdateConfig({ excludeWeekends: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Suppress on Weekends (Friday in Bangladesh)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Popups and sound alerts will not trigger on weekly off days (Saturday–Thursday working week).
                      </div>
                    </div>
                  </label>

                  {/* Holiday Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.excludeHolidays}
                      onChange={e => handleUpdateConfig({ excludeHolidays: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Suppress on Official Public & Company Holidays
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Popups will not trigger during national holidays (Independence Day, Eid, New Year, etc.).
                      </div>
                    </div>
                  </label>
                </div>

                {/* Scheduled Daily Popup Times */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        Scheduled Daily Reminder Times (Bangladesh Time BST)
                      </h4>
                      <div className="text-[11px] text-slate-500">
                        Default time is morning 10:00 AM. You can add additional popup checkpoints.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {config.customReminderTimes.map(t => (
                      <span 
                        key={t}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{t}</span>
                        {config.customReminderTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = config.customReminderTimes.filter(x => x !== t);
                              handleUpdateConfig({ customReminderTimes: filtered });
                            }}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Add additional time */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <input
                      type="time"
                      value={newReminderTimeInput}
                      onChange={e => setNewReminderTimeInput(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newReminderTimeInput && !config.customReminderTimes.includes(newReminderTimeInput)) {
                          handleUpdateConfig({
                            customReminderTimes: [...config.customReminderTimes, newReminderTimeInput].sort()
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      + Add Time Slot
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              {config.lastAcknowledgedDate === todayStr ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acknowledged today at {config.lastAcknowledgedTimestamp ? format(parseISO(config.lastAcknowledgedTimestamp), 'hh:mm a') : 'today'}</span>
                </span>
              ) : (
                <span>Close with knowledge to register your shift daily task review.</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Dismiss Later
              </button>

              <button
                type="button"
                onClick={handleAcknowledgeAndClose}
                disabled={isAcknowledging}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>✓ I Acknowledge & Understand My Daily Tasks</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
