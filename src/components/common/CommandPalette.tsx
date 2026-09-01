import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Command, ArrowRight, User, Users, Calendar, Clock, 
  Wrench, AlertTriangle, CheckSquare, Target, Sparkles, Award, 
  DownloadCloud, Settings, Briefcase, ChevronRight, Phone, 
  MapPin, Shield, CheckCircle2, History, ExternalLink, CornerDownLeft,
  Filter, Eye, Hash, ArrowUp, ArrowDown, Building2, Sun, Moon,
  Palette, FileSpreadsheet, UserCheck, Flame, HeartHandshake,
  Layers, Zap, Star, PartyPopper, Cake
} from 'lucide-react';
import { EmployeeShiftState, ShiftType, getShiftBadgeStyles, getShiftModeBadgeStyles } from '../../lib/shiftEngine';
import { UserSecurityScope, canUserPerformAction } from '../../lib/security';
import { resolvePaletteForModule, ColorPalette } from '../../lib/colorPalettes';
import ShiftBadge from './ShiftBadge';
import { useEmployeeCrossModuleHub, EmployeeFullAggregatedData } from '../../lib/employeeDataHub';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeShiftState[];
  spreadsheetId?: string;
  onNavigate: (moduleId: string, extraContext?: { search?: string; action?: string; employeeId?: string }) => void;
  onSelectEmployeeProfile?: (employee: EmployeeShiftState) => void;
  onSelectEmployee?: (employee: EmployeeShiftState) => void;
  userSecurityScope?: UserSecurityScope;
  accessLevels: string[];
  currentModule?: string;
  activeModule?: string;
  themePreference?: string;
}

type PaletteCategory = 'all' | 'modules' | 'employees' | 'actions';
type PreviewTab = 'overview' | 'kpi' | 'skills' | 'fives' | 'tasks' | 'practices' | 'leave-ot';

interface NavigationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  moduleName: string;
  keywords: string[];
  actionHint?: string;
  badge?: string;
}

interface QuickActionItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  targetModule: string;
  actionContext?: { search?: string; action?: string };
  keywords: string[];
  badge?: string;
}

const SYSTEM_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Executive ERP Dashboard',
    category: 'Operations',
    description: 'Enterprise operational health, live shift headcount, quick tasks & unit overview',
    icon: Layers,
    moduleName: 'All',
    keywords: ['cockpit', 'home', 'main', 'summary', 'analytics', 'headcount', 'overview', 'live'],
    badge: 'Executive'
  },
  {
    id: 'tasks',
    name: 'Daily Tasks & Kanban',
    category: 'Operations',
    description: 'Production task dispatch, priority board, completion tracking & daily checklists',
    icon: CheckSquare,
    moduleName: 'All',
    keywords: ['todo', 'task', 'job', 'order', 'checklist', 'kanban', 'daily', 'dispatch', 'assign'],
    badge: 'Operations'
  },
  {
    id: '5s-management',
    name: '5S & Visual Management',
    category: 'Quality & Standards',
    description: '5S area audits, radar charts, Red Tag tracking, visual floor boards & monthly winners',
    icon: Sparkles,
    moduleName: '5S & Visual Management',
    keywords: ['5s', 'audit', 'sort', 'shine', 'sustain', 'standardize', 'set in order', 'red tag', 'housekeeping', 'cleanliness'],
    badge: 'Kaizen'
  },
  {
    id: 'breakdown',
    name: 'Machine Breakdown Log',
    category: 'Maintenance',
    description: 'Equipment downtime recording, MTTR/MTBF analytics, root cause analysis & workorders',
    icon: AlertTriangle,
    moduleName: 'Machine & Skills',
    keywords: ['repair', 'maintenance', 'downtime', 'failure', 'broken', 'mtbf', 'mttr', 'mechanic', 'spare'],
    badge: 'Maintenance'
  },
  {
    id: 'directory',
    name: 'Employee Directory & Roster',
    category: 'Human Resources',
    description: 'Complete staff database, emergency contacts, profile cards, shift modes & records',
    icon: Users,
    moduleName: 'Employee Directory',
    keywords: ['staff', 'employee', 'roster', 'worker', 'personnel', 'profile', 'contacts', 'phone', 'team', 'hr'],
    badge: 'Staff'
  },
  {
    id: 'anniversaries',
    name: 'Birthdays & Work Anniversaries',
    category: 'Human Resources',
    description: 'Company-wide staff birthdays, work service milestones, celebration roster & greetings',
    icon: PartyPopper,
    moduleName: 'All',
    keywords: ['birthday', 'anniversary', 'work anniversary', 'milestone', 'celebration', 'wishes', 'cake', 'years of service', 'tenure'],
    badge: 'Everyone'
  },
  {
    id: 'leave',
    name: 'Leave Management Hub',
    category: 'Human Resources',
    description: 'Annual leave applications, supervisor approvals, HR pending settlements & audit trail',
    icon: Calendar,
    moduleName: 'Leave Management',
    keywords: ['vacation', 'leave', 'holiday', 'absent', 'approval', 'settlement', 'sick leave', 'casual leave'],
    badge: 'HR'
  },
  {
    id: 'overtime',
    name: 'Overtime Calendar & Logging',
    category: 'Human Resources',
    description: 'Overtime hours calculation, monthly calendar view, batch entry & multiplier rates',
    icon: Clock,
    moduleName: 'Overtime',
    keywords: ['ot', 'overtime', 'extra hours', 'pay', 'multiplier', 'timecard', 'night shift ot'],
    badge: 'Payroll'
  },
  {
    id: 'machine',
    name: 'Machine Capacity & Planning',
    category: 'Operations',
    description: 'Machine specs registry, line capacity calculations, cycle times & production planner',
    icon: Wrench,
    moduleName: 'Machine & Skills',
    keywords: ['tonnage', 'capacity', 'machines', 'planning', 'production', 'cycle time', 'equipment', 'line'],
    badge: 'Plant'
  },
  {
    id: 'shifts',
    name: 'Shift Assignments & Rotation',
    category: 'Operations',
    description: 'Weekly shift rotation matrix, manual shift overrides, Friday off management & rosters',
    icon: Briefcase,
    moduleName: 'Shift Assignments',
    keywords: ['shift', 'rotation', 'day shift', 'night shift', 'roster', 'override', 'automatic', 'schedule'],
    badge: 'Shifts'
  },
  {
    id: 'skill-dashboard',
    name: 'Skill Matrix & Competencies',
    category: 'Quality & Training',
    description: 'Operator skill level visualizer, matrix evaluations, skill gaps & workstation mapping',
    icon: Target,
    moduleName: 'Machine & Skills',
    keywords: ['skills', 'matrix', 'training', 'competency', 'qualification', 'level 1', 'level 2', 'level 3', 'level 4'],
    badge: 'Skills'
  },
  {
    id: 'kpi',
    name: 'KPI Performance & Scorecards',
    category: 'Performance',
    description: 'Monthly department scorecards, 10-point appraisal system & multi-period appraisals',
    icon: Award,
    moduleName: 'KPI Performance',
    keywords: ['kpi', 'scorecard', 'evaluation', 'rating', 'target', 'appraisal', 'performance', 'bonus', 'quarterly', 'yearly'],
    badge: 'Appraisal'
  },
  {
    id: 'practices',
    name: 'Standard Best Practices & SOP',
    category: 'Knowledge Base',
    description: 'Standard operating procedures, safety guidelines, Kaizen templates & SOP library',
    icon: Award,
    moduleName: 'Best Practices',
    keywords: ['sop', 'best practice', 'guideline', 'safety', 'standard', 'procedure', 'kaizen', 'library'],
    badge: 'SOP'
  },
  {
    id: 'contact-portfolio',
    name: 'Developer Contact & Profile',
    category: 'Operations',
    description: 'Developer profile photo, contact information, direct communication & inquiry messenger',
    icon: UserCheck,
    moduleName: 'All',
    keywords: ['developer', 'contact', 'developer contact', 'john moore', 'profile', 'photo', 'avatar', 'email', 'phone', 'support'],
    badge: 'Everyone'
  },
  {
    id: 'reports',
    name: 'Reports, Analytics & Export',
    category: 'Analytics',
    description: 'Cross-module analytics, comprehensive audit logs, Excel exports & report generators',
    icon: DownloadCloud,
    moduleName: 'Reports & Export',
    keywords: ['export', 'download', 'excel', 'csv', 'audit', 'analytics', 'data', 'summary report'],
    badge: 'Data'
  },
  {
    id: 'settings',
    name: 'Security & Access Controls',
    category: 'Administration',
    description: 'User access levels, default navigators, password verification & system settings',
    icon: Settings,
    moduleName: 'Settings',
    keywords: ['users', 'roles', 'permissions', 'admin', 'password', 'security', 'privileges', 'config'],
    badge: 'Admin'
  }
];

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'action-create-task',
    name: 'Create New Daily Task',
    category: 'Quick Action',
    description: 'Dispatch a new production task with priority, due date and assignment',
    icon: CheckSquare,
    targetModule: 'tasks',
    actionContext: { action: 'new-task' },
    keywords: ['add task', 'new task', 'create task', 'dispatch', 'assign task'],
    badge: 'Tasks'
  },
  {
    id: 'action-apply-leave',
    name: 'Apply For Employee Leave',
    category: 'Quick Action',
    description: 'Submit an annual, casual, medical, or unpaid leave request',
    icon: Calendar,
    targetModule: 'leave',
    actionContext: { action: 'apply' },
    keywords: ['apply leave', 'take day off', 'vacation form', 'sick leave apply'],
    badge: 'Leave'
  },
  {
    id: 'action-log-breakdown',
    name: 'Log Machine Breakdown Incident',
    category: 'Quick Action',
    description: 'Record unexpected equipment downtime, priority, and maintenance call',
    icon: AlertTriangle,
    targetModule: 'breakdown',
    actionContext: { action: 'log-breakdown' },
    keywords: ['log breakdown', 'machine broken', 'report issue', 'equipment down', 'maintenance emergency'],
    badge: 'Maintenance'
  },
  {
    id: 'action-5s-audit',
    name: 'Perform 5S Area Inspection',
    category: 'Quick Action',
    description: 'Launch 5S audit scoring checklist for shop floor or office zones',
    icon: Sparkles,
    targetModule: '5s-management',
    actionContext: { action: 'new-audit' },
    keywords: ['5s audit', 'inspection', 'clean checklist', 'score area', 'housekeeping audit'],
    badge: '5S'
  },
  {
    id: 'action-add-employee',
    name: 'Register New Employee',
    category: 'Quick Action',
    description: 'Create a new staff record in the master employee directory',
    icon: UserCheck,
    targetModule: 'directory',
    actionContext: { action: 'add-employee' },
    keywords: ['add employee', 'hire staff', 'new worker', 'register person', 'new hire'],
    badge: 'Staff'
  },
  {
    id: 'action-supervisor-approvals',
    name: 'Open Supervisor Leave Approvals',
    category: 'Quick Action',
    description: 'Review and approve pending staff leave applications',
    icon: UserCheck,
    targetModule: 'leave',
    actionContext: { action: 'approval' },
    keywords: ['approve leave', 'supervisor queue', 'pending approvals', 'sign off leave'],
    badge: 'Approvals'
  },
  {
    id: 'action-kpi-evaluation',
    name: 'Open 10-Point Performance Appraisal',
    category: 'Quick Action',
    description: 'Evaluate staff across 10 performance competencies (50 marks total)',
    icon: Award,
    targetModule: 'kpi',
    actionContext: { action: 'performance-evaluation' },
    keywords: ['appraisal', 'performance evaluation', 'competency', '10 points', '50 marks', 'evaluation'],
    badge: 'KPI'
  },
  {
    id: 'action-performance-reviews',
    name: 'Open Performance Reviews & Evaluation Cycles',
    category: 'Quick Action',
    description: 'Manage 360° employee performance appraisals, self/peer/supervisor reviews inside KPI Performance',
    icon: Award,
    targetModule: 'kpi',
    actionContext: { action: 'performance-reviews' },
    keywords: ['performance reviews', 'reviews', 'appraisal cycle', 'annual review', 'quarterly review', 'supervisor review', 'review schedule'],
    badge: 'KPI'
  },
  {
    id: 'action-export-reports',
    name: 'Export Operations Data to Excel',
    category: 'Quick Action',
    description: 'Generate Excel spreadsheet reports for directory, shifts, tasks or OT',
    icon: FileSpreadsheet,
    targetModule: 'reports',
    actionContext: { action: 'export' },
    keywords: ['export excel', 'download report', 'xlsx download', 'data backup'],
    badge: 'Export'
  }
];

export default function CommandPalette({
  isOpen,
  onClose,
  employees,
  spreadsheetId,
  onNavigate,
  onSelectEmployeeProfile,
  onSelectEmployee,
  userSecurityScope,
  accessLevels,
  currentModule,
  activeModule,
  themePreference
}: CommandPaletteProps) {
  const effectiveSelectEmployee = onSelectEmployee || onSelectEmployeeProfile;
  const effectiveCurrentModule = currentModule || activeModule || 'dashboard';
  const { dataMap: employeeDataHub } = useEmployeeCrossModuleHub(spreadsheetId || '');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('overview');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('erp_command_palette_recents');
      return saved ? JSON.parse(saved) : ['tasks', 'directory', 'kpi', 'leave'];
    } catch {
      return ['tasks', 'directory', 'kpi', 'leave'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const currentPalette = resolvePaletteForModule(effectiveCurrentModule, themePreference);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Check user module permissions
  const isModuleAccessible = (moduleName: string) => {
    if (userSecurityScope?.isAdmin) return true;
    if (userSecurityScope) {
      const modId = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (canUserPerformAction(userSecurityScope, modId, 'view')) return true;
      if (moduleName === 'KPI Performance' && (canUserPerformAction(userSecurityScope, 'kpi', 'view') || canUserPerformAction(userSecurityScope, 'kpi_performance', 'view') || canUserPerformAction(userSecurityScope, 'monthly_kpi', 'view'))) return true;
    }
    if (accessLevels.includes('All')) return true;
    if (accessLevels.includes(moduleName)) return true;
    if (moduleName === 'KPI Performance' && (accessLevels.includes('Monthly KPI') || accessLevels.includes('KPI Performance') || accessLevels.includes('KPI'))) return true;
    return false;
  };

  // Filter accessible modules
  const accessibleNavItems = useMemo(() => {
    return SYSTEM_NAVIGATION_ITEMS.filter(item => isModuleAccessible(item.moduleName));
  }, [accessLevels, userSecurityScope]);

  // Filter accessible quick actions
  const accessibleQuickActions = useMemo(() => {
    return QUICK_ACTIONS.filter(item => {
      const navItem = SYSTEM_NAVIGATION_ITEMS.find(n => n.id === item.targetModule);
      return navItem ? isModuleAccessible(navItem.moduleName) : true;
    });
  }, [accessLevels, userSecurityScope]);

  // Search Results Computation
  const searchResults = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();

    // 1. Navigation items
    let matchedModules = accessibleNavItems;
    if (q) {
      matchedModules = accessibleNavItems.filter(item => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords.some(k => k.toLowerCase().includes(q))
        );
      });
    }

    // 2. Quick actions
    let matchedActions = accessibleQuickActions;
    if (q) {
      matchedActions = accessibleQuickActions.filter(item => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.some(k => k.toLowerCase().includes(q))
        );
      });
    }

    // 3. Employees across entire database
    let matchedEmployees: EmployeeShiftState[] = [];
    if (q) {
      matchedEmployees = employees.filter(emp => {
        const idMatch = emp.id?.toLowerCase().includes(q);
        const nameMatch = emp.name?.toLowerCase().includes(q);
        const desigMatch = emp.designation?.toLowerCase().includes(q);
        const deptMatch = emp.department?.toLowerCase().includes(q);
        const areaMatch = emp.workingArea?.toLowerCase().includes(q);
        const phoneMatch = emp.phone?.toLowerCase().includes(q);
        const emergencyMatch = emp.emergency?.toLowerCase().includes(q);
        const bloodMatch = emp.bloodGroup?.toLowerCase().includes(q);
        const shiftMatch = emp.currentShift?.toLowerCase().includes(q);
        const statusMatch = emp.status?.toLowerCase().includes(q);
        const volunteerMatch = emp.volunteer?.toLowerCase().includes(q);

        return (
          idMatch ||
          nameMatch ||
          desigMatch ||
          deptMatch ||
          areaMatch ||
          phoneMatch ||
          emergencyMatch ||
          bloodMatch ||
          shiftMatch ||
          statusMatch ||
          volunteerMatch
        );
      }).slice(0, 15); // Top 15 matching employees for fast snappy UI
    } else {
      // If query is empty, show a few key active employees or recent
      matchedEmployees = employees.slice(0, 5);
    }

    return {
      modules: matchedModules,
      actions: matchedActions,
      employees: matchedEmployees
    };
  }, [deferredQuery, accessibleNavItems, accessibleQuickActions, employees]);

  // Combined Flattened Items for Keyboard Navigation
  const flatItems = useMemo(() => {
    const list: Array<{
      type: 'module' | 'action' | 'employee';
      item: NavigationItem | QuickActionItem | EmployeeShiftState;
      key: string;
    }> = [];

    if (activeCategory === 'all' || activeCategory === 'modules') {
      searchResults.modules.forEach(m => {
        list.push({ type: 'module', item: m, key: `mod-${m.id}` });
      });
    }

    if (activeCategory === 'all' || activeCategory === 'actions') {
      searchResults.actions.forEach(a => {
        list.push({ type: 'action', item: a, key: `act-${a.id}` });
      });
    }

    if (activeCategory === 'all' || activeCategory === 'employees') {
      searchResults.employees.forEach(e => {
        list.push({ type: 'employee', item: e, key: `emp-${e.id}` });
      });
    }

    return list;
  }, [searchResults, activeCategory]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  // Save to recent search history
  const recordRecentSearch = (id: string) => {
    try {
      const updated = [id, ...recentSearches.filter(s => s !== id)].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('erp_command_palette_recents', JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Execution Handlers
  const handleSelectModule = (navItem: NavigationItem) => {
    recordRecentSearch(navItem.id);
    onClose();
    onNavigate(navItem.id);
  };

  const handleSelectAction = (actionItem: QuickActionItem) => {
    recordRecentSearch(actionItem.targetModule);
    onClose();
    onNavigate(actionItem.targetModule, actionItem.actionContext);
  };

  const handleSelectEmployee = (emp: EmployeeShiftState, action: 'profile' | 'directory' | 'shift' = 'profile') => {
    recordRecentSearch(emp.id);
    if (action === 'profile') {
      onClose();
      if (effectiveSelectEmployee) {
        effectiveSelectEmployee(emp);
      } else {
        onNavigate('directory', { search: emp.id, employeeId: emp.id });
      }
    } else if (action === 'directory') {
      onClose();
      onNavigate('directory', { search: emp.id, employeeId: emp.id });
    } else if (action === 'shift') {
      onClose();
      onNavigate('shifts', { search: emp.name });
    }
  };

  const handleExecuteCurrent = () => {
    if (flatItems.length === 0) return;
    const current = flatItems[selectedIndex];
    if (!current) return;

    if (current.type === 'module') {
      handleSelectModule(current.item as NavigationItem);
    } else if (current.type === 'action') {
      handleSelectAction(current.item as QuickActionItem);
    } else if (current.type === 'employee') {
      handleSelectEmployee(current.item as EmployeeShiftState, 'profile');
    }
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (flatItems.length || 1)) % (flatItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteCurrent();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const categories: PaletteCategory[] = ['all', 'modules', 'employees', 'actions'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextIdx = e.shiftKey ? (currentIdx - 1 + categories.length) % categories.length : (currentIdx + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, activeCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (!listContainerRef.current) return;
    const activeEl = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Current highlighted employee for quick preview
  const highlightedEmployee = useMemo(() => {
    const current = flatItems[selectedIndex];
    if (current && current.type === 'employee') {
      return current.item as EmployeeShiftState;
    }
    return null;
  }, [flatItems, selectedIndex]);

  if (!isOpen) return null;

  const totalCount = searchResults.modules.length + searchResults.actions.length + searchResults.employees.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-10">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-all"
        aria-hidden="true"
      />

      {/* Main Command Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-200/90 overflow-hidden flex flex-col max-h-[88vh] z-10"
        style={{
          boxShadow: `0 20px 60px -15px ${currentPalette.primaryHex}30`
        }}
      >
        {/* Search Header Bar */}
        <div 
          className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 relative"
          style={{
            background: `linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
              style={{
                backgroundColor: currentPalette.pillBg,
                color: currentPalette.primaryHex
              }}
            >
              <Search className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search modules, daily tasks, employees by ID or name, shift records..."
                className="w-full text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-hidden focus:ring-0 px-0"
              />
            </div>

            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Esc to close</span>
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">ESC</kbd>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setActiveCategory('all'); setSelectedIndex(0); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'all'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70'
                }`}
                style={activeCategory === 'all' ? { backgroundColor: currentPalette.primaryHex, color: currentPalette.secondaryHex } : undefined}
              >
                <span>All Results</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-black/20 text-white">
                  {totalCount}
                </span>
              </button>

              <button
                onClick={() => { setActiveCategory('modules'); setSelectedIndex(0); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'modules'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70'
                }`}
                style={activeCategory === 'modules' ? { backgroundColor: currentPalette.primaryHex, color: currentPalette.secondaryHex } : undefined}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modules ({searchResults.modules.length})</span>
              </button>

              <button
                onClick={() => { setActiveCategory('employees'); setSelectedIndex(0); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'employees'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70'
                }`}
                style={activeCategory === 'employees' ? { backgroundColor: currentPalette.primaryHex, color: currentPalette.secondaryHex } : undefined}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Employees ({searchResults.employees.length})</span>
              </button>

              <button
                onClick={() => { setActiveCategory('actions'); setSelectedIndex(0); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'actions'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70'
                }`}
                style={activeCategory === 'actions' ? { backgroundColor: currentPalette.primaryHex, color: currentPalette.secondaryHex } : undefined}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Actions ({searchResults.actions.length})</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600">TAB</kbd>
              <span>to switch tabs</span>
            </div>
          </div>
        </div>

        {/* Modal Body: Split view when employee highlighted on desktop, or scrollable list */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[360px] max-h-[58vh]">
          {/* Main List Section */}
          <div 
            ref={listContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar"
          >
            {flatItems.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Search className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No matching items found</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  We couldn't find any ERP modules or employee records matching "<span className="font-semibold text-slate-700">{query}</span>".
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-4 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              <>
                {/* 1. MODULES SECTION */}
                {(activeCategory === 'all' || activeCategory === 'modules') && searchResults.modules.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>ERP Modules & Navigators</span>
                      </span>
                      <span>{searchResults.modules.length}</span>
                    </div>

                    {searchResults.modules.map((item) => {
                      const itemGlobalIndex = flatItems.findIndex(f => f.key === `mod-${item.id}`);
                      const isSelected = selectedIndex === itemGlobalIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          data-index={itemGlobalIndex}
                          onClick={() => handleSelectModule(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.008]'
                              : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/70 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div 
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                isSelected ? 'bg-white/15 text-white' : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {item.name}
                                </span>
                                {item.badge && (
                                  <span 
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs truncate max-w-md sm:max-w-xl ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-bold hidden sm:inline-block ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                              {item.category}
                            </span>
                            <div 
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-slate-700'
                              }`}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. QUICK ACTIONS SECTION */}
                {(activeCategory === 'all' || activeCategory === 'actions') && searchResults.actions.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Direct Actions & Dispatchers</span>
                      </span>
                      <span>{searchResults.actions.length}</span>
                    </div>

                    {searchResults.actions.map((item) => {
                      const itemGlobalIndex = flatItems.findIndex(f => f.key === `act-${item.id}`);
                      const isSelected = selectedIndex === itemGlobalIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          data-index={itemGlobalIndex}
                          onClick={() => handleSelectAction(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md transform scale-[1.008]'
                              : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/60 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div 
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                isSelected ? 'bg-black/15 text-slate-950' : 'bg-white border border-amber-200 text-amber-700'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-slate-950' : 'text-slate-900'}`}>
                                  {item.name}
                                </span>
                                {item.badge && (
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                    isSelected ? 'bg-black/20 text-slate-950' : 'bg-amber-100 text-amber-900 border border-amber-200'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs truncate max-w-md sm:max-w-xl ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold underline decoration-dotted">Execute</span>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. EMPLOYEES SECTION */}
                {(activeCategory === 'all' || activeCategory === 'employees') && searchResults.employees.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Employee Master Records & Cross-Module Hub</span>
                      </span>
                      <span>{searchResults.employees.length}</span>
                    </div>

                    {searchResults.employees.map((emp) => {
                      const itemGlobalIndex = flatItems.findIndex(f => f.key === `emp-${emp.id}`);
                      const isSelected = selectedIndex === itemGlobalIndex;
                      const shiftStyle = getShiftBadgeStyles(emp.currentShift);
                      const hubData = employeeDataHub[emp.id];

                      return (
                        <div
                          key={emp.id}
                          data-index={itemGlobalIndex}
                          onClick={() => handleSelectEmployee(emp, 'profile')}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-lg transform scale-[1.008]'
                              : 'bg-white hover:bg-slate-50/90 border-slate-200/90 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                            {/* Enlarged Avatar with Shift Indicator */}
                            <div className="relative shrink-0">
                              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shadow-sm border-2 transition-transform group-hover:scale-105 ${
                                isSelected ? 'border-indigo-400/50 bg-slate-800 text-white' : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}>
                                {emp.profilePicture ? (
                                  <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl font-black">{emp.name.charAt(0) || 'U'}</span>
                                )}
                              </div>

                              {/* Shift badge badge at avatar corner */}
                              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white shadow-xs border border-slate-200 text-slate-800 flex items-center gap-0.5">
                                {emp.currentShift === 'Day Shift' ? <Sun className="w-2.5 h-2.5 text-amber-500" /> : <Moon className="w-2.5 h-2.5 text-indigo-500" />}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Name, ID, Department Header */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-base font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {emp.name}
                                </span>
                                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {emp.id}
                                </span>
                                {emp.status === 'Inactive' ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full">
                                    Inactive
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${shiftStyle.badge}`}>
                                    {emp.currentShift}
                                  </span>
                                )}
                              </div>

                              {/* Designation & Area */}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs mt-1">
                                <span className={`font-semibold ${isSelected ? 'text-indigo-200' : 'text-indigo-700'}`}>
                                  {emp.designation || 'Staff'}
                                </span>
                                <span className={isSelected ? 'text-slate-600' : 'text-slate-300'}>•</span>
                                <span className={isSelected ? 'text-slate-300' : 'text-slate-600'}>
                                  {emp.department || 'Production'} {emp.workingArea ? `(${emp.workingArea})` : ''}
                                </span>
                                {emp.phone && (
                                  <>
                                    <span className={isSelected ? 'text-slate-600' : 'text-slate-300'}>•</span>
                                    <span className={`flex items-center gap-1 font-mono text-[11px] ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`}>
                                      <Phone className="w-3 h-3" />
                                      {emp.phone}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* CROSS-MODULE EMPLOYEE DATA PILLS */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {/* 1. KPI Performance */}
                                {hubData?.kpi?.latestScore !== undefined ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected 
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : hubData.kpi.latestScore >= 90
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : hubData.kpi.latestScore >= 75
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}>
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <span>KPI: {hubData.kpi.latestScore}% ({hubData.kpi.latestRating}★)</span>
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg border ${
                                    isSelected ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    <Target className="w-3 h-3 text-slate-400" />
                                    <span>KPI: Standard</span>
                                  </span>
                                )}

                                {/* 2. Skill Matrix */}
                                {hubData?.skills?.totalSkills ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected 
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  }`}>
                                    <Wrench className="w-3 h-3 text-indigo-500" />
                                    <span>{hubData.skills.totalSkills} Skills ({hubData.skills.highestLevel})</span>
                                  </span>
                                ) : null}

                                {/* 3. 5S Audit */}
                                {hubData?.fiveS?.latestScore !== undefined ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected 
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                                      : 'bg-purple-50 text-purple-800 border-purple-200'
                                  }`}>
                                    <Sparkles className="w-3 h-3 text-purple-500" />
                                    <span>5S: {hubData.fiveS.latestScore}% ({hubData.fiveS.latestRating})</span>
                                  </span>
                                ) : null}

                                {/* 4. Daily Tasks */}
                                {hubData?.tasks && (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected 
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' 
                                      : hubData.tasks.urgentCount > 0
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}>
                                    <CheckSquare className="w-3 h-3 text-sky-500" />
                                    <span>{hubData.tasks.openCount} Tasks {hubData.tasks.urgentCount > 0 ? `(${hubData.tasks.urgentCount} Alert)` : ''}</span>
                                  </span>
                                )}

                                {/* 5. Best Practices / Kaizen */}
                                {hubData?.bestPractices?.totalCount ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}>
                                    <Award className="w-3 h-3 text-emerald-500" />
                                    <span>{hubData.bestPractices.totalCount} Kaizen {hubData.bestPractices.totalSavingsUSD > 0 ? `($${hubData.bestPractices.totalSavingsUSD.toLocaleString()})` : ''}</span>
                                  </span>
                                ) : null}

                                {/* 6. Overtime or Leave */}
                                {hubData?.overtime?.totalHours ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isSelected ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-orange-50 text-orange-800 border-orange-200'
                                  }`}>
                                    <Clock className="w-3 h-3 text-orange-500" />
                                    <span>{hubData.overtime.totalHours}h OT</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Quick Navigation Action Chips */}
                          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100/20">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onNavigate('monthly_kpi', { search: emp.id, employeeId: emp.id });
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                                }`}
                                title="Jump to KPI Performance"
                              >
                                <Star className="w-3 h-3 text-amber-500" />
                                <span>KPI</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onNavigate('skill_matrix', { search: emp.id, employeeId: emp.id });
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-900'
                                }`}
                                title="Jump to Skill Matrix"
                              >
                                <Wrench className="w-3 h-3 text-indigo-500" />
                                <span>Skills</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onNavigate('five_s', { search: emp.id, employeeId: emp.id });
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-900'
                                }`}
                                title="Jump to 5S Audits"
                              >
                                <Sparkles className="w-3 h-3 text-purple-500" />
                                <span>5S</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onNavigate('tasks', { search: emp.name, employeeId: emp.id });
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-900'
                                }`}
                                title="Jump to Daily Tasks"
                              >
                                <CheckSquare className="w-3 h-3 text-sky-500" />
                                <span>Tasks</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEmployee(emp, 'profile');
                                }}
                                className={`p-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                                  isSelected ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                                title="Open Full Profile Hub"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span className={`text-[10px] font-medium hidden sm:inline-block ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                              Press Enter for full hub
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar: Dynamic Employee Full Cross-Module Preview Panel on Highlight (Desktop only) */}
          {highlightedEmployee && (
            <div className="hidden md:flex w-80 lg:w-96 border-l border-slate-200/90 bg-slate-50/90 p-4 flex-col justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Employee Data Hub</span>
                  </span>
                  <span className="font-mono text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {highlightedEmployee.id}
                  </span>
                </div>

                {/* Main Large Photo & Title Card */}
                <div className="text-center flex flex-col items-center bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-md flex items-center justify-center font-black text-slate-800 text-3xl overflow-hidden mb-3 ring-2 ring-slate-100">
                    {highlightedEmployee.profilePicture ? (
                      <img src={highlightedEmployee.profilePicture} alt={highlightedEmployee.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-indigo-600">{highlightedEmployee.name.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">
                    {highlightedEmployee.name}
                  </h4>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5">
                    {highlightedEmployee.designation || 'Staff'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {highlightedEmployee.department || 'Operations'} {highlightedEmployee.workingArea ? `• ${highlightedEmployee.workingArea}` : ''}
                  </p>
                </div>

                {/* Sub-Tabs for Deep Inspection */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto no-scrollbar text-xs font-bold">
                  <button
                    onClick={() => setActivePreviewTab('overview')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'overview' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('kpi')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'kpi' ? 'bg-white text-amber-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    KPI
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('skills')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'skills' ? 'bg-white text-indigo-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Skills
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('fives')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'fives' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    5S
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('tasks')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'tasks' ? 'bg-white text-sky-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('practices')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activePreviewTab === 'practices' ? 'bg-white text-emerald-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kaizen
                  </button>
                </div>

                {/* TAB CONTENTS */}
                {(() => {
                  const hub = employeeDataHub[highlightedEmployee.id];

                  if (activePreviewTab === 'overview') {
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Shift & Mode:</span>
                            <span className="font-bold text-slate-800">{highlightedEmployee.currentShift} ({highlightedEmployee.shiftMode})</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Phone Contact:</span>
                            <span className="font-mono font-bold text-slate-800">{highlightedEmployee.phone || 'N/A'}</span>
                          </div>
                          {highlightedEmployee.bloodGroup && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Blood Group:</span>
                              <span className="font-bold text-rose-600">{highlightedEmployee.bloodGroup}</span>
                            </div>
                          )}
                          {highlightedEmployee.supervisor && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Supervisor:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[130px]">{highlightedEmployee.supervisor}</span>
                            </div>
                          )}
                        </div>

                        {/* Fast module metric tiles */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5">
                            <span className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              KPI Rating
                            </span>
                            <div className="text-base font-black text-amber-950 mt-0.5">
                              {hub?.kpi?.latestScore ? `${hub.kpi.latestScore}%` : 'Standard'}
                            </div>
                            <span className="text-[10px] text-amber-700 font-bold">
                              {hub?.kpi?.latestRating ? `${hub.kpi.latestRating} Stars` : 'Evaluated'}
                            </span>
                          </div>

                          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5">
                            <span className="text-[10px] font-black text-indigo-800 uppercase flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-indigo-500" />
                              Skill Level
                            </span>
                            <div className="text-base font-black text-indigo-950 mt-0.5">
                              {hub?.skills?.highestLevel || 'Level 2'}
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold">
                              {hub?.skills?.totalSkills || 0} Certified
                            </span>
                          </div>

                          <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-2.5">
                            <span className="text-[10px] font-black text-purple-800 uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              5S Audit
                            </span>
                            <div className="text-base font-black text-purple-950 mt-0.5">
                              {hub?.fiveS?.latestScore ? `${hub.fiveS.latestScore}%` : '85%'}
                            </div>
                            <span className="text-[10px] text-purple-700 font-bold">
                              Grade {hub?.fiveS?.latestRating || 'A'}
                            </span>
                          </div>

                          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-2.5">
                            <span className="text-[10px] font-black text-sky-800 uppercase flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-sky-500" />
                              Daily Tasks
                            </span>
                            <div className="text-base font-black text-sky-950 mt-0.5">
                              {hub?.tasks?.openCount !== undefined ? `${hub.tasks.openCount} Open` : '0 Active'}
                            </div>
                            <span className="text-[10px] text-sky-700 font-bold">
                              {hub?.tasks?.completedCount || 0} Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (activePreviewTab === 'kpi') {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800">Latest KPI Evaluation</span>
                          <span className="font-mono text-xs font-black text-amber-600">
                            {hub?.kpi?.latestMonth || 'Current Month'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>Score Achievement:</span>
                            <span className="font-black text-slate-900">{hub?.kpi?.latestScore || 90}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, hub?.kpi?.latestScore || 90)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500">Average Rating:</span>
                          <span className="font-bold text-amber-600 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {hub?.kpi?.averageRating || 4.5} / 5.0
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('monthly_kpi', { search: highlightedEmployee.id, employeeId: highlightedEmployee.id });
                          }}
                          className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-center transition"
                        >
                          Open KPI Records →
                        </button>
                      </div>
                    );
                  }

                  if (activePreviewTab === 'skills') {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800">Skill Competency Matrix</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {hub?.skills?.highestLevel || 'Certified'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {hub?.skills?.totalSkills ? `${hub.skills.totalSkills} machine certifications recorded.` : 'Standard technical profile.'}
                        </p>
                        {hub?.skills?.skills && hub.skills.skills.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {hub.skills.skills.slice(0, 4).map((s, idx) => (
                              <div key={idx} className="flex justify-between items-center p-1.5 bg-slate-50 rounded-lg text-[11px]">
                                <span className="font-medium text-slate-800 truncate max-w-[150px]">{s.machineJob}</span>
                                <span className="font-bold text-indigo-700">{s.skillLevel}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('skill_matrix', { search: highlightedEmployee.id, employeeId: highlightedEmployee.id });
                          }}
                          className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-center transition"
                        >
                          View Skill Matrix →
                        </button>
                      </div>
                    );
                  }

                  if (activePreviewTab === 'fives') {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800">5S Audit Scorecard</span>
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {hub?.fiveS?.latestScore ? `${hub.fiveS.latestScore}%` : '88%'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                          <div className="bg-slate-50 p-1 rounded">Sort</div>
                          <div className="bg-slate-50 p-1 rounded">Set</div>
                          <div className="bg-slate-50 p-1 rounded">Shine</div>
                          <div className="bg-slate-50 p-1 rounded">Std</div>
                          <div className="bg-slate-50 p-1 rounded">Sust</div>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('five_s', { search: highlightedEmployee.id, employeeId: highlightedEmployee.id });
                          }}
                          className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold text-center transition"
                        >
                          Inspect 5S Audits →
                        </button>
                      </div>
                    );
                  }

                  if (activePreviewTab === 'tasks') {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800">Daily Task Assignments</span>
                          <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {hub?.tasks?.openCount || 0} Open
                          </span>
                        </div>
                        {hub?.tasks?.tasks && hub.tasks.tasks.length > 0 ? (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                            {hub.tasks.tasks.slice(0, 3).map((t) => (
                              <div key={t.id} className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                <div className="font-bold text-slate-800 truncate">{t.title}</div>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                                  <span>{t.priority}</span>
                                  <span className="font-semibold text-slate-700">{t.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-center py-2">No pending task issues.</p>
                        )}
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('tasks', { search: highlightedEmployee.name, employeeId: highlightedEmployee.id });
                          }}
                          className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg font-bold text-center transition"
                        >
                          Manage Daily Tasks →
                        </button>
                      </div>
                    );
                  }

                  if (activePreviewTab === 'practices') {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800">Best Practices & Kaizen</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {hub?.bestPractices?.totalCount || 0} Submitted
                          </span>
                        </div>
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">Cost Savings Generated</span>
                          <div className="text-lg font-black text-emerald-950">
                            ${(hub?.bestPractices?.totalSavingsUSD || 0).toLocaleString()} USD
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('best_practices', { search: highlightedEmployee.id, employeeId: highlightedEmployee.id });
                          }}
                          className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-bold text-center transition"
                        >
                          View Kaizen Proposals →
                        </button>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Action Buttons at bottom of Preview Card */}
              <div className="pt-4 space-y-2 border-t border-slate-200/80 mt-3">
                <button
                  onClick={() => handleSelectEmployee(highlightedEmployee, 'profile')}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-white shadow-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: currentPalette.primaryHex,
                    color: currentPalette.secondaryHex
                  }}
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Full Employee Profile</span>
                </button>

                <button
                  onClick={() => handleSelectEmployee(highlightedEmployee, 'directory')}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Locate in Master Directory</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Legend & Footer */}
        <div className="p-3 px-5 bg-slate-50 border-t border-slate-200/90 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">↵</kbd>
              <span>to select</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">TAB</kbd>
              <span>filter tabs</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{totalCount} results available</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
