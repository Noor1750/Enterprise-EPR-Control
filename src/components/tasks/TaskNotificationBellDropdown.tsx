import React, { useState, useEffect } from 'react';
import { 
  AssignmentNotification, 
  getAssignmentNotifications, 
  markAllAssignmentNotificationsRead, 
  markAssignmentNotificationRead 
} from '../../lib/taskAssignmentNotifier';
import { playTaskAssignedSound, TaskSoundType, SOUND_OPTIONS } from '../../lib/taskSoundEngine';
import { 
  getEmployeeReminderConfig, 
  saveEmployeeReminderConfig 
} from '../../lib/taskReminderEngine';
import { 
  Bell, 
  CheckSquare, 
  Clock, 
  Volume2, 
  VolumeX, 
  Check, 
  ExternalLink, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';

interface TaskNotificationBellDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployeeId: string;
  currentEmployeeName: string;
  onOpenAssignmentDetails: (notif: AssignmentNotification) => void;
  onOpenDailyReminderModal: () => void;
  dueTodayCount: number;
}

export default function TaskNotificationBellDropdown({
  isOpen,
  onClose,
  currentEmployeeId,
  currentEmployeeName,
  onOpenAssignmentDetails,
  onOpenDailyReminderModal,
  dueTodayCount
}: TaskNotificationBellDropdownProps) {
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [soundConfig, setSoundConfig] = useState(() => getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName));

  useEffect(() => {
    if (isOpen) {
      const list = getAssignmentNotifications(currentEmployeeId, currentEmployeeName);
      setNotifications(list);
      setSoundConfig(getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName));
    }
  }, [isOpen, currentEmployeeId, currentEmployeeName]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    markAllAssignmentNotificationsRead(currentEmployeeId, currentEmployeeName);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleSelectNotification = (n: AssignmentNotification) => {
    markAssignmentNotificationRead(currentEmployeeId, currentEmployeeName, n.id);
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    onClose();
    onOpenAssignmentDetails(n);
  };

  const handleToggleMute = () => {
    const newSoundKey: TaskSoundType = soundConfig.soundKey === 'mute' ? 'gentle-chime' : 'mute';
    const updated = { ...soundConfig, soundKey: newSoundKey };
    saveEmployeeReminderConfig(updated);
    setSoundConfig(updated);
    if (newSoundKey !== 'mute') {
      playTaskAssignedSound('gentle-chime', soundConfig.soundVolume);
    }
  };

  const handleTestSound = () => {
    playTaskAssignedSound(soundConfig.soundKey === 'mute' ? 'gentle-chime' : soundConfig.soundKey, soundConfig.soundVolume);
  };

  const getPriorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[1000] animate-scale-up"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sky-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">Notifications Center</h4>
              <p className="text-[11px] text-slate-300">
                {unreadCount > 0 ? `${unreadCount} unread task assignment(s)` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title={soundConfig.soundKey === 'mute' ? 'Sound muted. Click to unmute' : 'Sound active. Click to mute'}
            >
              {soundConfig.soundKey === 'mute' ? (
                <VolumeX className="w-4 h-4 text-rose-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-300" />
              )}
            </button>
            <button
              onClick={handleTestSound}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-sky-200 transition-colors cursor-pointer"
              title="Test notification sound"
            >
              Chime
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Daily Reminder Launcher Card */}
      <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-indigo-950">Daily Tasks (10 AM BST)</span>
              {dueTodayCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                  {dueTodayCount} due
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Sat-Thu popup schedule & knowledge
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            onOpenDailyReminderModal();
          }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
        >
          <span>Open</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section Title & Mark all read */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
          Task Assignments ({notifications.length})
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <CheckSquare className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
            <p className="text-xs font-semibold text-slate-600">No task assignments yet</p>
            <p className="text-[11px] text-slate-400">When someone assigns a task to you, it will pop up here with an alert chime.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleSelectNotification(n)}
              className={`p-3.5 hover:bg-slate-50/90 transition cursor-pointer relative flex items-start justify-between gap-3 ${
                !n.read ? 'bg-indigo-50/40' : ''
              }`}
            >
              {!n.read && (
                <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
              <div className="pl-2 space-y-1 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${getPriorityColor(n.priority)}`}>
                    {n.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {n.category}
                  </span>
                  {n.acknowledged && (
                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Ack
                    </span>
                  )}
                </div>

                <h5 className="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">
                  {n.taskTitle}
                </h5>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>By: <strong className="text-slate-700">{n.assignedByName}</strong></span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Due: {n.dueDate}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 self-center shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-500 font-medium">
          Automated Smart Notifications with Web Audio Chimes
        </p>
      </div>
    </div>
  );
}
