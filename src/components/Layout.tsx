import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Wrench, Calendar, Check, Clock, FileSpreadsheet, 
  Award, DownloadCloud, Settings, Menu, X, LogOut,
  ChevronDown, User as UserIcon, ChevronRight, Mountain, Eye, BarChart, Download, CheckSquare, Target,
  Shield, Mail, Building, Briefcase, KeyRound, FileCheck2, AlertTriangle, Compass, Sparkles, Search, PartyPopper,
  Palette, UserCheck, Activity, Layers, Bell, ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import EmployeeDirectory from './EmployeeDirectory';
import MachineCapacity from './MachineCapacity';
import LeaveManagement from './LeaveManagement';
import OvertimeCalendar from './OvertimeCalendar';
import BestPractices from './BestPractices';
import Reports from './Reports';
import UserManagement from './UserManagement';
import ShiftAssignments from './ShiftAssignments';
import Dashboard from './Dashboard';
import SkillMatrixDashboard from './SkillMatrixDashboard';
import Tasks from './Tasks';
import KPIPerformance from './kpi/KPIPerformance';
import BreakdownLog from './BreakdownLog';
import FiveSManagement from './FiveSManagement';
import WorkAnniversaries from './anniversary/WorkAnniversaries';
import PerformanceReviews from './performance/PerformanceReviews';
import ContactAndPortfolio from './contact/ContactAndPortfolio';
import GlobalLoadingScreen from './common/GlobalLoadingScreen';
import IdleSessionWatcher from './common/IdleSessionWatcher';
import { useGlobalLoading } from '../lib/loadingEngine';
import CommandPalette from './common/CommandPalette';
import EmployeeProfileModal from './employee/EmployeeProfileModal';
import { Employee } from './kpi/types';
import { EmployeeShiftState, parseEmployeeShiftState } from '../lib/shiftEngine';
import { getRange } from '../lib/sheets';
import { getErpName } from '../lib/appSettings';
import { 
  UserSecurityScope, 
  getAccessLimitDescription, 
  calculateEffectiveUserPermissions,
  canUserPerformAction 
} from '../lib/security';
import { resolveUserLandingNavigator, findNavigator } from '../lib/navigators';
import { resolvePaletteForModule, getActiveThemePreference, applyPaletteToDocument, ColorPalette } from '../lib/colorPalettes';
import ThemeSegmentSelector from './common/ThemeSegmentSelector';
import AnimatedSlogan from './common/AnimatedSlogan';
import ErrorBoundary from './common/ErrorBoundary';

interface LayoutProps {
  user: User;
  spreadsheetId: string;
  onLogout: () => void;
  accessLevels: string[];
  userSecurityScope?: UserSecurityScope;
}

type ModuleType = 'dashboard' | 'tasks' | '5s-management' | 'directory' | 'kpi' | 'machine' | 'breakdown' | 'skill' | 'leave' | 'overtime' | 'practices' | 'shifts' | 'orgchart' | 'reports' | 'settings' | 'anniversaries' | 'reviews' | 'contact-portfolio';

export default function Layout({ user, spreadsheetId, onLogout, accessLevels, userSecurityScope }: LayoutProps) {
  const [activeModule, setActiveModule] = useState<ModuleType | 'skill-dashboard'>('dashboard');
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftEmployees, setShiftEmployees] = useState<EmployeeShiftState[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<EmployeeShiftState | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [landingNotice, setLandingNotice] = useState<string | null>(null);
  const [hasInitializedLanding, setHasInitializedLanding] = useState(false);
  const [themePreference, setThemePreference] = useState<string>(getActiveThemePreference());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to global loading engine
  const loadingState = useGlobalLoading();

  // Active palette for current module
  const activePalette = resolvePaletteForModule(activeModule, themePreference);

  // Global command palette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    const handleOpenEvent = () => {
      setIsCommandPaletteOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('erp-open-command-palette', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('erp-open-command-palette', handleOpenEvent);
    };
  }, []);

  const handleCommandNavigate = (moduleId: string, extraContext?: any) => {
    setActiveModule(moduleId as any);
    if (extraContext) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('erp-module-context', { detail: { moduleId, ...extraContext } }));
      }, 100);
    }
  };

  // Synchronize CSS custom variables with document whenever palette changes
  useEffect(() => {
    applyPaletteToDocument(activePalette);
  }, [activePalette]);

  // Listen to cross-component theme changes
  useEffect(() => {
    const handleThemeEvent = (e: any) => {
      if (e.detail?.themeId) {
        setThemePreference(e.detail.themeId);
      }
    };
    window.addEventListener('erp-theme-changed', handleThemeEvent);
    return () => window.removeEventListener('erp-theme-changed', handleThemeEvent);
  }, []);

  // Active online users (other logged-in users with photos and profile info)
  const onlineUsers = useMemo(() => {
    const active = employees.filter(e => e.status === 'Active' && e.id !== userSecurityScope?.employeeId);
    if (active.length > 0) {
      return active.slice(0, 5);
    }
    return [
      { id: 'EMP-101', name: 'Farhana Yasmin', designation: 'Production Supervisor', department: 'Production', status: 'Active', profilePicture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80' },
      { id: 'EMP-102', name: 'Tanvir Ahmed', designation: 'Quality Lead', department: 'Quality Assurance', status: 'Active', profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
      { id: 'EMP-103', name: 'Rashid Khan', designation: 'Maintenance Tech', department: 'Maintenance', status: 'Active', profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
      { id: 'EMP-104', name: 'Sadia Rahman', designation: 'HR Specialist', department: 'HR & Admin', status: 'Active', profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }
    ] as Employee[];
  }, [employees, userSecurityScope]);

  const currentUserPhoto = (userSecurityScope as any)?.employeePhoto || user.photoURL || employees.find(e => e.id === userSecurityScope?.employeeId || (e as any).email === user.email)?.profilePicture || '';

  // Auto-resolve landing navigator when user logs in and permissions load
  useEffect(() => {
    if (!hasInitializedLanding && accessLevels && accessLevels.length > 0) {
      const resolution = resolveUserLandingNavigator(userSecurityScope, accessLevels);
      setActiveModule(resolution.targetNavigatorId as any);
      setHasInitializedLanding(true);

      if (resolution.wasFallback && resolution.fallbackReason && userSecurityScope?.defaultNavigator) {
        setLandingNotice(resolution.fallbackReason);
      }
    }
  }, [userSecurityScope, accessLevels, hasInitializedLanding]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load employee master list for modules like KPI and Command Palette
  useEffect(() => {
    if (!spreadsheetId) return;
    const fetchEmployees = async () => {
      try {
        const raw = await getRange(spreadsheetId, 'Employees!A:Z');
        if (raw && raw.length > 1) {
          const mapped: Employee[] = raw.slice(1).map(row => ({
            id: String(row[0] || '').trim(),
            name: String(row[1] || '').trim(),
            designation: String(row[2] || '').trim(),
            department: String(row[3] || '').trim(),
            dateOfJoin: String(row[4] || '').trim(),
            category: String(row[5] || '').trim(),
            status: String(row[9] || 'Active').trim(),
            profilePicture: String(row[16] || '').trim()
          })).filter(e => e.id);
          setEmployees(mapped);

          const parsedShifts = raw.slice(1)
            .filter(row => row && row[0] && String(row[0]).trim() !== '')
            .map(row => parseEmployeeShiftState(row, new Date()));
          setShiftEmployees(parsedShifts);
        }
      } catch (err) {
        console.error('Failed to load master employees in Layout:', err);
      }
    };
    fetchEmployees();
  }, [spreadsheetId]);

  const navigation = [
    { id: 'dashboard', name: 'ERP Dashboard', icon: Menu, moduleName: 'All' },
    { id: 'tasks', name: 'Daily Tasks', icon: CheckSquare, moduleName: 'All' },
    { id: '5s-management', name: '5S & Visual Mgmt', icon: Sparkles, moduleName: '5S & Visual Management' },
    { id: 'breakdown', name: 'Breakdown Log', icon: AlertTriangle, moduleName: 'Machine & Skills' },
    { id: 'directory', name: 'Employee Directory', icon: Users, moduleName: 'Employee Directory' },
    { id: 'anniversaries', name: 'Birthdays & Anniversaries', icon: PartyPopper, moduleName: 'All' },
    { id: 'leave', name: 'Leave', icon: Calendar, moduleName: 'Leave Management' },
    { id: 'overtime', name: 'Overtime', icon: Clock, moduleName: 'Overtime' },
    { id: 'machine', name: 'Machine Capacity', icon: Wrench, moduleName: 'Machine & Skills' },
    { id: 'shifts', name: 'Shift Assignments', icon: Briefcase, moduleName: 'Shift Assignments' },
    { id: 'skill-dashboard', name: 'Skill Matrix', icon: Target, moduleName: 'Machine & Skills' },
    { id: 'kpi', name: 'KPI Performance', icon: Target, moduleName: 'KPI Performance' },
    { id: 'practices', name: 'Best Practices', icon: Award, moduleName: 'Best Practices' },
    { id: 'contact-portfolio', name: 'Developer Contact', icon: UserIcon, moduleName: 'All' },
    { id: 'reports', name: 'Reports & Export', icon: DownloadCloud, moduleName: 'Reports & Export' },
    { id: 'settings', name: 'Settings', icon: Settings, moduleName: 'Settings' },
  ];

  const hasAccess = (moduleName: string) => {
    if (userSecurityScope?.isAdmin) return true;
    
    // Check if user has explicit permission for module
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

  const filteredNavigation = navigation.filter(item => hasAccess(item.moduleName));

  useEffect(() => {
    if (filteredNavigation.length > 0 && !hasAccess(navigation.find(n => n.id === activeModule)?.moduleName || '')) {
      setActiveModule(filteredNavigation[0].id as ModuleType);
    }
  }, [accessLevels, activeModule]);

  const renderModule = () => {
    switch (activeModule) {
      case 'skill-dashboard': return <SkillMatrixDashboard spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} />;
      case 'dashboard': return <Dashboard spreadsheetId={spreadsheetId} user={user} accessLevels={accessLevels} userSecurityScope={userSecurityScope} onNavigate={(tab) => setActiveModule(tab as any)} />;
      case 'tasks': return <Tasks spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case '5s-management': return <FiveSManagement spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'directory': return <EmployeeDirectory spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} />;
      case 'anniversaries': return <WorkAnniversaries spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} onNavigate={(tab, extra) => handleCommandNavigate(tab, extra)} />;
      case 'kpi': return <KPIPerformance spreadsheetId={spreadsheetId} employees={employees} accessLevels={accessLevels} userEmail={user.email || ''} userSecurityScope={userSecurityScope} user={user} />;
      case 'reviews': return <KPIPerformance spreadsheetId={spreadsheetId} employees={employees} accessLevels={accessLevels} userEmail={user.email || ''} userSecurityScope={userSecurityScope} user={user} initialParameter="performance-reviews" />;
      case 'machine': return <MachineCapacity spreadsheetId={spreadsheetId} view="machine" userSecurityScope={userSecurityScope} />;
      case 'breakdown': return <BreakdownLog spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} />;
      case 'leave': return <LeaveManagement spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'overtime': return <OvertimeCalendar spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'practices': return <BestPractices spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'shifts': return <ShiftAssignments spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'contact-portfolio': return <ContactAndPortfolio spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'reports': return <Reports spreadsheetId={spreadsheetId} />;
      case 'settings': return <UserManagement spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      default: return <div>Select a module</div>;
    }
  };

  const displayName = userSecurityScope?.employeeName || user.displayName || 'Noor Alam';
  const roleName = userSecurityScope?.role || 'User';

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.substring(0, 2) || 'US').toUpperCase();
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderRoleBadge = () => {
    if (userSecurityScope?.isAdmin) {
      return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">Admin</span>;
    }
    if (userSecurityScope?.isSuperuser) {
      return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">Superuser</span>;
    }
    if (userSecurityScope?.isSupervisor) {
      return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">Supervisor</span>;
    }
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">{roleName}</span>;
  };

  const handleNavClick = (id: ModuleType | 'skill-dashboard') => {
    setActiveModule(id);
    setMobileMenuOpen(false);
  };

  const currentNavTitle = navigation.find(n => n.id === activeModule)?.name || 'ERP System';

  return (
    <div 
      className="min-h-screen flex flex-col md:items-center md:justify-center p-0 md:p-3 lg:p-5 font-sans transition-colors duration-500"
      style={{
        background: `radial-gradient(ellipse 80% 80% at 50% -20%, ${activePalette.primaryHex}45, #0B132B 75%, #030712 100%)`
      }}
    >
      <div 
        className="w-full max-w-[1640px] h-screen md:h-[95vh] md:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col md:flex-row overflow-hidden border-0 md:border border-slate-800/60 ring-1 ring-white/10 transition-all duration-500"
        style={{ background: activePalette.bgPageWash }}
      >
        
        {/* Mobile Header (Visible only on < md screens) */}
        <header className="md:hidden h-14 text-white flex items-center justify-between px-4 shrink-0 shadow-lg z-30 border-b border-white/10"
          style={{ background: `linear-gradient(to right, ${activePalette.primaryHex}, #0F172A)` }}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl active:scale-95 transition-all"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs border"
                style={{ backgroundColor: `${activePalette.secondaryHex}25`, borderColor: activePalette.secondaryHex }}
              >
                <Mountain className="w-4 h-4" style={{ color: activePalette.secondaryHex }} />
              </div>
              <span className="font-extrabold text-sm tracking-wide text-white">{getErpName().toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg active:scale-95 transition-all flex items-center gap-1 bg-white/5 border border-white/10"
              title="Open Command Palette (Cmd+K)"
            >
              <Search className="w-4 h-4 text-amber-300" />
            </button>
            <span className="text-xs font-semibold truncate max-w-[100px]" style={{ color: activePalette.secondaryHex }}>
              {currentNavTitle}
            </span>
            <div 
              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-extrabold text-xs shadow-xs ring-1 ring-white/30"
              style={{ background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})` }}
            >
              {getInitials(displayName)}
            </div>
          </div>
        </header>

        {/* Mobile Slide-Out Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="fixed inset-y-0 left-0 w-[285px] bg-[#0F172A] text-white z-50 flex flex-col justify-between shadow-2xl md:hidden overflow-hidden border-r border-white/10"
              >
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Drawer Header */}
                  <div 
                    className="h-16 flex items-center justify-between px-4 shrink-0 border-b border-white/10"
                    style={{ background: `linear-gradient(to right, ${activePalette.primaryHex}, #090F1E)` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs border"
                        style={{ backgroundColor: `${activePalette.secondaryHex}25`, borderColor: activePalette.secondaryHex }}
                      >
                        <Mountain className="w-5 h-5" style={{ color: activePalette.secondaryHex }} />
                      </div>
                      <div>
                        <span className="text-white font-extrabold tracking-wide text-base block leading-tight">
                          {getErpName().toUpperCase()}
                        </span>
                        <span 
                          className="text-[10px] font-bold tracking-wider uppercase"
                          style={{ color: activePalette.secondaryHex }}
                        >
                          {activePalette.primaryName} • {activePalette.secondaryName}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                      aria-label="Close Navigation Menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Command Palette Search in Mobile Drawer */}
                  <div className="p-3 bg-[#1E293B]/90 border-b border-white/10">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsCommandPaletteOpen(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-between text-xs font-bold border border-white/10 transition-all shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-400" />
                        <span>Search & Jump (Cmd+K)</span>
                      </div>
                      <kbd className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono text-slate-300">⌘K</kbd>
                    </button>
                  </div>

                  {/* User Profile Snippet inside Drawer */}
                  <div className="p-4 bg-[#1E293B]/70 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md ring-2"
                        style={{ 
                          background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
                          boxShadow: `0 0 0 2px ${activePalette.secondaryHex}`
                        }}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-white truncate">{displayName}</div>
                        <div className="text-xs text-slate-300 flex items-center space-x-1.5 mt-0.5">
                          {renderRoleBadge()}
                          {userSecurityScope?.employeeId && (
                            <span className="font-mono text-slate-400 text-[10px]">({userSecurityScope.employeeId})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Navigation List */}
                  <div className="py-2.5 px-2.5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {filteredNavigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      const itemPalette = resolvePaletteForModule(item.id, themePreference);
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id as ModuleType)}
                          style={isActive ? {
                            background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
                            borderColor: `${activePalette.secondaryHex}80`,
                            boxShadow: `0 4px 14px ${activePalette.primaryHex}66`
                          } : undefined}
                          className={`w-full min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl transition-all border ${
                            isActive 
                              ? 'text-white font-bold shadow-md' 
                              : 'text-slate-300 hover:text-white hover:bg-white/10 border-transparent'
                          }`}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2.5 shrink-0 transition-transform duration-300 group-hover:scale-150" 
                            style={{ backgroundColor: itemPalette.primaryHex === '#0D0D0D' ? '#D9B8FF' : itemPalette.secondaryHex }}
                          />
                          <Icon className={`w-5 h-5 mr-2.5 shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold truncate">{item.name}</span>
                          {isActive && (
                            <div 
                              className="ml-auto w-2 h-2 rounded-full animate-pulse"
                              style={{ backgroundColor: activePalette.secondaryHex }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drawer Footer / Logout */}
                <div className="p-3 border-t border-white/10 bg-[#0B132B]">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-center px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs shadow-xs"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Expandable Sidebar (Visible only on md+ screens) */}
        <aside 
          className="hidden md:flex w-[74px] lg:w-[82px] hover:w-[250px] transition-all duration-300 ease-out group bg-gradient-to-b from-[#0F172A] via-[#111C30] to-[#0B132B] text-white shrink-0 flex-col justify-between relative z-20 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.25)] border-r border-slate-800/80"
          onMouseLeave={() => setHoveredModule(null)}
        >
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="h-[76px] bg-[#090F1E] flex items-center px-[22px] mb-2 overflow-hidden shrink-0 border-b border-white/10 relative z-10">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs border transition-all duration-300"
                style={{ 
                  backgroundColor: `${activePalette.primaryHex}40`, 
                  borderColor: `${activePalette.secondaryHex}60` 
                }}
              >
                <Mountain className="w-5 h-5 drop-shadow-sm" style={{ color: activePalette.secondaryHex }} />
              </div>
              <div className="ml-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                <span className="text-white font-black tracking-wide text-sm block leading-tight">
                  {getErpName().toUpperCase()}
                </span>
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider block"
                  style={{ color: activePalette.secondaryHex }}
                >
                  {activePalette.primaryName} • {activePalette.secondaryName}
                </span>
              </div>
            </div>

            {/* Command Palette Quick Search in Desktop Sidebar */}
            <div className="px-2 pt-2 pb-1">
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full h-10 flex items-center relative transition-all duration-200 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 group cursor-pointer shadow-xs"
                title="Quick Search & Navigation (Cmd+K / Ctrl+K)"
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-transform group-hover:scale-110" />
                </div>
                <span className="ml-3 text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Search & Jump
                </span>
                <kbd className="ml-auto px-1.5 py-0.5 bg-black/40 border border-white/20 rounded text-[10px] font-mono font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="py-2.5 space-y-1 px-2 flex-1 overflow-y-auto custom-scrollbar">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isHovered = hoveredModule === item.id;
                const itemPalette = resolvePaletteForModule(item.id, themePreference);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id as ModuleType)}
                    onMouseEnter={() => setHoveredModule(item.id)}
                    className={`w-full h-11 flex items-center relative transition-all duration-200 px-3 rounded-xl ${
                      isActive 
                        ? 'text-white font-bold' 
                        : isHovered 
                        ? 'text-white bg-white/10 font-semibold' 
                        : 'text-slate-400 hover:text-white font-medium'
                    }`}
                    title={`${item.name} (${itemPalette.primaryName} / ${itemPalette.secondaryName})`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl shadow-md border"
                        style={{
                          background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
                          borderColor: `${activePalette.secondaryHex}60`,
                          boxShadow: `0 4px 16px ${activePalette.primaryHex}80`
                        }}
                        initial={false}
                        transition={{ type: "spring", stiffness: 350, damping: 32 }}
                      />
                    )}
                    <div className="w-7 h-7 flex items-center justify-center shrink-0 relative z-10">
                      <Icon 
                        className={`w-5 h-5 transition-all duration-300 ${
                          isActive 
                            ? 'text-white scale-110 drop-shadow-md' 
                            : isHovered 
                            ? 'scale-125 rotate-6 text-white group-hover-icon-anim' 
                            : 'text-slate-400'
                        }`} 
                        style={!isActive && isHovered ? { color: itemPalette.secondaryHex } : undefined}
                      />
                    </div>
                    <span className="ml-3 relative z-10 text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                      {item.name}
                    </span>
                    {isActive && (
                      <div 
                        className="w-2 h-2 rounded-full ml-auto relative z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs" 
                        style={{ backgroundColor: activePalette.secondaryHex }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2.5 shrink-0 border-t border-white/10 bg-[#090F1E]/80 relative z-10">
            <button
              onClick={onLogout}
              onMouseEnter={() => setHoveredModule('logout')}
              className={`w-full h-11 flex items-center relative transition-all duration-200 px-3 rounded-xl ${
                hoveredModule === 'logout' 
                  ? 'text-rose-300 bg-rose-500/20 border border-rose-500/30 font-bold' 
                  : 'text-slate-400 hover:text-rose-300 hover:bg-white/5 font-medium'
              }`}
              title="Logout"
            >
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-rose-400" />
              </div>
              <span className="ml-3 text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold text-rose-300 truncate">
                Sign Out
              </span>
            </button>
          </div>
        </aside>

        {/* Main content container */}
        <div 
          className="flex-1 flex flex-col overflow-hidden relative transition-colors duration-500"
          style={{ background: activePalette.bgPageWash }}
        >
          {/* Desktop Top Bar Header */}
          <header 
            className="hidden md:flex h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-6 items-center justify-between shrink-0 shadow-xs z-30 transition-all"
          >
            {/* Left: ERP Control Branding, Breadcrumbs & Module Title */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex items-center gap-2">
                <div 
                  className="px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-xs border transition-all"
                  style={{ 
                    backgroundColor: `${activePalette.primaryHex}15`, 
                    borderColor: `${activePalette.primaryHex}40`,
                    color: activePalette.primaryHex 
                  }}
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black tracking-wider uppercase whitespace-nowrap">ERP Control</span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const currentNav = navigation.find(n => n.id === activeModule);
                    const CurrentIcon = currentNav?.icon || Compass;
                    return (
                      <>
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                          style={{ backgroundColor: activePalette.primaryHex }}
                        >
                          <CurrentIcon className="w-3.5 h-3.5" />
                        </div>
                        <h1 className="text-sm lg:text-base font-extrabold text-slate-900 truncate">
                          {currentNav?.name || 'Dashboard'}
                        </h1>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Command Palette Button */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 text-xs font-semibold transition shadow-2xs cursor-pointer ml-1"
                title="Quick Search & Navigation (Cmd+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Search & Jump</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-600 shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Center / Right: Theme Selector, Online Users & Logged-In User Information */}
            <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
              {/* Theme Selection Points in Top Bar */}
              <div className="flex items-center gap-1.5" title="Color Theme Selection">
                <ThemeSegmentSelector 
                  activeModule={activeModule} 
                  onThemeChange={(themeId) => setThemePreference(themeId)} 
                  variant="compact"
                />
              </div>

              <div className="h-6 w-px bg-slate-200" />

              {/* Other Logged-In / Online Users with Hover Tooltip */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center -space-x-2 overflow-visible">
                  {onlineUsers.map((onlineUser, idx) => (
                    <div 
                      key={onlineUser.id || idx}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        const matchedShift = shiftEmployees.find(s => s.id === onlineUser.id) || {
                          ...onlineUser,
                          currentShift: 'Day Shift',
                          isWorkingToday: true,
                          shiftStartTime: '08:00',
                          shiftEndTime: '17:00'
                        };
                        setSelectedProfileEmployee(matchedShift as any);
                      }}
                    >
                      {/* User Avatar with Photo or Initial */}
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs hover:scale-110 hover:z-30 transition-all duration-200 overflow-hidden ring-1 ring-slate-200">
                        {onlineUser.profilePicture ? (
                          <img 
                            src={onlineUser.profilePicture} 
                            alt={onlineUser.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span>{(onlineUser.name || 'U').charAt(0)}</span>
                        )}
                      </div>

                      {/* Live Green Online Dot */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-600/30 animate-pulse" />

                      {/* Hover Tooltip displaying User Name, Photo, Role & Department */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        {/* Little Arrow */}
                        <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mb-1 shadow-xs" />
                        {/* Tooltip Card */}
                        <div className="bg-slate-900 text-white rounded-xl py-2.5 px-3.5 shadow-2xl border border-slate-700/80 text-center whitespace-nowrap min-w-[150px]">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active Online</span>
                          </div>
                          <div className="text-xs font-black text-white">{onlineUser.name}</div>
                          <div className="text-[11px] text-slate-300 font-medium mt-0.5">{onlineUser.designation}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{onlineUser.department}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-1.5 pt-1.5 border-t border-slate-800">
                            ID: {onlineUser.id} • Click to view profile
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:flex items-center text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  <span>{onlineUsers.length + 1} online</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              {/* Right Side: Logged-in User Information Card & Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  className="flex items-center space-x-2.5 p-1.5 pl-2 rounded-2xl hover:bg-slate-100/90 border border-transparent hover:border-slate-200 transition-all duration-200 text-left group cursor-pointer"
                  title="Click for Profile & Account Details"
                >
                  {/* Current User Avatar */}
                  <div className="relative">
                    <div 
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm ring-2 overflow-hidden"
                      style={{ 
                        background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
                        boxShadow: `0 0 0 2px ${activePalette.secondaryHex}`
                      }}
                    >
                      {currentUserPhoto ? (
                        <img 
                          src={currentUserPhoto} 
                          alt={displayName} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>{getInitials(displayName)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                  </div>

                  {/* Name and Role info */}
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition truncate max-w-[130px]">
                      {displayName}
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      {renderRoleBadge()}
                    </div>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-slate-700' : 'group-hover:text-slate-600'}`} />
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 overflow-hidden"
                    >
                      {/* Header info */}
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md ring-2 overflow-hidden"
                            style={{ 
                              background: `linear-gradient(135deg, ${activePalette.gradientFrom}, ${activePalette.gradientTo})`,
                              boxShadow: `0 0 0 2px ${activePalette.secondaryHex}`
                            }}
                          >
                            {currentUserPhoto ? (
                              <img 
                                src={currentUserPhoto} 
                                alt={displayName} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span>{getInitials(displayName)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-slate-900 truncate">{displayName}</div>
                            <div className="text-xs text-slate-500 truncate">{user.email}</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              {renderRoleBadge()}
                              {userSecurityScope?.employeeId && (
                                <span className="text-[10px] font-mono text-slate-400 font-bold">ID: {userSecurityScope.employeeId}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2 space-y-1 text-xs">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            const myShift = shiftEmployees.find(s => s.id === userSecurityScope?.employeeId) || {
                              id: userSecurityScope?.employeeId || 'EMP-ME',
                              name: displayName,
                              department: userSecurityScope?.assignedDepartment || 'Administration',
                              designation: userSecurityScope?.employeeDesignation || roleName,
                              status: 'Active',
                              currentShift: 'Day Shift',
                              isWorkingToday: true,
                              shiftStartTime: '08:00',
                              shiftEndTime: '17:00'
                            };
                            setSelectedProfileEmployee(myShift as any);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition text-left cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-indigo-600" />
                          <span>My Profile & Shift Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setIsCommandPaletteOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Search className="w-4 h-4 text-amber-500" />
                            <span>Command Palette</span>
                          </div>
                          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-500">⌘K</kbd>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setActiveModule('settings');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition text-left cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-slate-600" />
                          <span>Security Scope & Settings</span>
                        </button>
                      </div>

                      {/* Logout button */}
                      <div className="p-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Logout Icon Button */}
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200 cursor-pointer"
                title="Sign Out of ERP"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          {landingNotice && (
            <div className="bg-amber-50/90 border-b border-amber-200 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Default Navigator Notice:</strong> {landingNotice}</span>
              </div>
              <button 
                onClick={() => setLandingNotice(null)} 
                className="text-amber-700 hover:text-amber-900 font-bold ml-4 text-xs px-2 py-0.5 hover:bg-amber-100 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
            {(activeModule === 'dashboard' || activeModule === 'skill-dashboard') ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="relative min-h-full p-3 sm:p-5 md:p-6 lg:p-8"
                >
                  <ErrorBoundary fallbackTitle="Dashboard Loading Error">
                    {renderModule()}
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="p-3 sm:p-5 md:p-6 lg:p-8 min-h-full"
                >
                  <div className="min-h-full">
                    <ErrorBoundary fallbackTitle="Module Loading Error">
                      {renderModule()}
                    </ErrorBoundary>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      {/* Global Idle Session Timeout Watcher */}
      <IdleSessionWatcher onLogout={onLogout} userEmail={user?.email || 'Admin'} />

      {/* Global Command Palette Search & Navigation */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleCommandNavigate}
        onSelectEmployee={(emp) => {
          setIsCommandPaletteOpen(false);
          setSelectedProfileEmployee(emp);
        }}
        employees={shiftEmployees}
        spreadsheetId={spreadsheetId}
        userSecurityScope={userSecurityScope}
        accessLevels={accessLevels}
        activeModule={activeModule}
        themePreference={themePreference}
      />

      {/* Employee Quick View Modal */}
      {selectedProfileEmployee && (
        <EmployeeProfileModal
          employee={selectedProfileEmployee}
          spreadsheetId={spreadsheetId}
          onClose={() => setSelectedProfileEmployee(null)}
          onNavigate={handleCommandNavigate}
          onEdit={(emp) => {
            setSelectedProfileEmployee(null);
            handleCommandNavigate('directory', { search: emp.id });
          }}
          onOpenShift={(emp) => {
            setSelectedProfileEmployee(null);
            handleCommandNavigate('shifts', { search: emp.name });
          }}
          onOpenHistory={(emp) => {
            setSelectedProfileEmployee(null);
            handleCommandNavigate('directory', { search: emp.id });
          }}
        />
      )}

      {/* Global Application Loading Animation Overlay */}
      <GlobalLoadingScreen />
    </div>
  );
}
