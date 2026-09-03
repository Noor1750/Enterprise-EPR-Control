import React, { useState, useEffect, useRef } from 'react';
import { 
  UniversalAssignmentNotification, 
  getUniversalNotifications, 
  markUniversalNotificationAcknowledged,
  markUniversalNotificationRead,
  markAllUniversalNotificationsAcknowledged,
  getUnreadUniversalCount,
  setupUniversalChannelListener
} from '../../lib/universalAssignmentNotifier';
import { getModuleTheme } from '../../lib/moduleVisualThemes';
import { playUniversalAssignmentSound } from '../../lib/taskSoundEngine';
import { getEmployeeReminderConfig } from '../../lib/taskReminderEngine';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Volume2, 
  Filter,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Inbox
} from 'lucide-react';

interface UniversalNotificationDropdownProps {
  currentEmployeeId: string;
  currentEmployeeName: string;
  onOpenDetails: (notification: UniversalAssignmentNotification) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onOpenDailyReminder?: () => void;
}

export default function UniversalNotificationDropdown({
  currentEmployeeId,
  currentEmployeeName,
  onOpenDetails,
  onNavigateToModule,
  onOpenDailyReminder
}: UniversalNotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UniversalAssignmentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanMyId = (currentEmployeeId || '').toUpperCase().trim();
  const cleanMyName = (currentEmployeeName || '').toLowerCase().trim();

  const loadNotifications = () => {
    const list = getUniversalNotifications(currentEmployeeId, currentEmployeeName);
    setNotifications(list);
    setUnreadCount(getUnreadUniversalCount(currentEmployeeId, currentEmployeeName));
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('erp-universal-assigned', handleUpdate);
    window.addEventListener('erp-task-assigned', handleUpdate);
    window.addEventListener('erp-universal-assigned-read', handleUpdate);
    window.addEventListener('erp-universal-assigned-acknowledged', handleUpdate);
    window.addEventListener('erp-universal-assigned-acknowledged-all', handleUpdate);

    const cleanup = setupUniversalChannelListener(() => {
      loadNotifications();
    });

    return () => {
      window.removeEventListener('erp-universal-assigned', handleUpdate);
      window.removeEventListener('erp-task-assigned', handleUpdate);
      window.removeEventListener('erp-universal-assigned-read', handleUpdate);
      window.removeEventListener('erp-universal-assigned-acknowledged', handleUpdate);
      window.removeEventListener('erp-universal-assigned-acknowledged-all', handleUpdate);
      cleanup();
    };
  }, [currentEmployeeId, currentEmployeeName]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTestSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cfg = getEmployeeReminderConfig(currentEmployeeId, currentEmployeeName);
    playUniversalAssignmentSound('general', cfg.soundKey, cfg.soundVolume);
  };

  const handleMarkAllRead = () => {
    markAllUniversalNotificationsAcknowledged(currentEmployeeId, currentEmployeeName);
    loadNotifications();
  };

  const handleItemClick = (notif: UniversalAssignmentNotification) => {
    markUniversalNotificationRead(currentEmployeeId, currentEmployeeName, notif.id);
    loadNotifications();
    onOpenDetails(notif);
    setIsOpen(false);
  };

  const handleDirectJump = (e: React.MouseEvent, notif: UniversalAssignmentNotification) => {
    e.stopPropagation();
    markUniversalNotificationRead(currentEmployeeId, currentEmployeeName, notif.id);
    loadNotifications();
    const theme = getModuleTheme(notif.module);
    if (onNavigateToModule && theme.navigatorId) {
      onNavigateToModule(theme.navigatorId);
    } else {
      onOpenDetails(notif);
    }
    setIsOpen(false);
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'tasks') return n.module === 'tasks';
    if (activeFilter === 'shifts') return n.module === 'shifts';
    if (activeFilter === 'leave') return n.module === 'leave';
    if (activeFilter === 'breakdown') return n.module === 'breakdown';
    if (activeFilter === 'kpi') return n.module === 'kpi' || n.module === '5s-management' || n.module === 'skill-dashboard';
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-hidden"
        title="Navigator Assignment Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[9000] overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3.5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center text-sky-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Assignments & Alerts
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTestSound}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Test notification sound"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Read All
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar text-[10px] font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'shifts', label: 'Shifts' },
                { id: 'leave', label: 'Leave' },
                { id: 'breakdown', label: 'Breakdowns' },
                { id: 'kpi', label: 'KPI / 5S' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-sky-400 text-slate-950 font-black shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No notifications in this view
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When tasks, shifts, or reviews are assigned, they'll appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const theme = getModuleTheme(notif.module);
                const IconComp = theme.icon;
                const isUnread = !notif.read && !notif.acknowledged;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group flex items-start gap-3 ${
                      isUnread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.toastGradient} flex-shrink-0 flex items-center justify-center text-white shadow-xs mt-0.5`}>
                      <IconComp className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                          {theme.name}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(notif.assignedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {notif.title}
                      </h5>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {notif.subtitle}
                      </p>
                    </div>

                    {/* Quick Jump Action */}
                    <button
                      onClick={(e) => handleDirectJump(e, notif)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={`Jump to ${theme.name}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            {onOpenDailyReminder && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDailyReminder();
                }}
                className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                10:00 AM Daily Task Reminder Settings
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
