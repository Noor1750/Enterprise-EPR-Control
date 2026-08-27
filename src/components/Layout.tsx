import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Wrench, Calendar, Check, Clock, FileSpreadsheet, 
  Award, DownloadCloud, Settings, Menu, X, LogOut,
  ChevronDown, User as UserIcon, ChevronRight, Mountain, Eye, BarChart, Download, CheckSquare, Target,
  Shield, Mail, Building, Briefcase, KeyRound, FileCheck2, AlertTriangle, Compass, Sparkles
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
import KPIManagement from './kpi/KPIManagement';
import BreakdownLog from './BreakdownLog';
import FiveSManagement from './FiveSManagement';
import { Employee } from './kpi/types';
import { getRange } from '../lib/sheets';
import { getErpName } from '../lib/appSettings';
import { 
  UserSecurityScope, 
  getAccessLimitDescription, 
  calculateEffectiveUserPermissions,
  canUserPerformAction 
} from '../lib/security';
import { resolveUserLandingNavigator, findNavigator } from '../lib/navigators';
import AnimatedSlogan from './common/AnimatedSlogan';
import ErrorBoundary from './common/ErrorBoundary';

interface LayoutProps {
  user: User;
  spreadsheetId: string;
  onLogout: () => void;
  accessLevels: string[];
  userSecurityScope?: UserSecurityScope;
}

type ModuleType = 'dashboard' | 'tasks' | '5s-management' | 'directory' | 'kpi' | 'machine' | 'breakdown' | 'skill' | 'leave' | 'overtime' | 'practices' | 'shifts' | 'orgchart' | 'reports' | 'settings';

export default function Layout({ user, spreadsheetId, onLogout, accessLevels, userSecurityScope }: LayoutProps) {
  const [activeModule, setActiveModule] = useState<ModuleType | 'skill-dashboard'>('dashboard');
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [landingNotice, setLandingNotice] = useState<string | null>(null);
  const [hasInitializedLanding, setHasInitializedLanding] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Mock online users
  const onlineUsers = employees.filter(e => e.status === 'Active').slice(0, 4);

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

  // Load employee master list for modules like KPI
  useEffect(() => {
    if (!spreadsheetId) return;
    const fetchEmployees = async () => {
      try {
        const raw = await getRange(spreadsheetId, 'Employees!A:V');
        if (raw && raw.length > 1) {
            const mapped: Employee[] = raw.slice(1).map(row => ({
            id: String(row[0] || '').trim(),
            name: String(row[1] || '').trim(),
            designation: String(row[2] || '').trim(),
            department: String(row[3] || '').trim(),
            status: String(row[9] || 'Active').trim(),
            profilePicture: String(row[16] || '').trim()
          })).filter(e => e.id);
          setEmployees(mapped);
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
    { id: 'leave', name: 'Leave', icon: Calendar, moduleName: 'Leave Management' },
    { id: 'overtime', name: 'Overtime', icon: Clock, moduleName: 'Overtime' },
    { id: 'machine', name: 'Machine Capacity', icon: Wrench, moduleName: 'Machine & Skills' },
    { id: 'shifts', name: 'Shift Assignments', icon: Briefcase, moduleName: 'Shift Assignments' },
    { id: 'skill-dashboard', name: 'Skill Matrix', icon: Target, moduleName: 'Machine & Skills' },
    { id: 'kpi', name: 'Monthly KPI', icon: Target, moduleName: 'Monthly KPI' },
    { id: 'practices', name: 'Best Practices', icon: Award, moduleName: 'Best Practices' },
    { id: 'reports', name: 'Reports & Export', icon: DownloadCloud, moduleName: 'Reports & Export' },
    { id: 'settings', name: 'Settings', icon: Settings, moduleName: 'Settings' },
  ];

  const hasAccess = (moduleName: string) => {
    if (userSecurityScope?.isAdmin) return true;
    
    // Check if user has explicit permission for module
    if (userSecurityScope) {
      const modId = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (canUserPerformAction(userSecurityScope, modId, 'view')) return true;
    }

    if (accessLevels.includes('All')) return true;
    return accessLevels.includes(moduleName);
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
      case 'kpi': return <KPIManagement spreadsheetId={spreadsheetId} employees={employees} accessLevels={accessLevels} userEmail={user.email || ''} userSecurityScope={userSecurityScope} />;
      case 'machine': return <MachineCapacity spreadsheetId={spreadsheetId} view="machine" userSecurityScope={userSecurityScope} />;
      case 'breakdown': return <BreakdownLog spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} />;
      case 'leave': return <LeaveManagement spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'overtime': return <OvertimeCalendar spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'practices': return <BestPractices spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
      case 'shifts': return <ShiftAssignments spreadsheetId={spreadsheetId} user={user} userSecurityScope={userSecurityScope} />;
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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col md:items-center md:justify-center p-0 md:p-4 lg:p-6 font-sans">
      <div className="w-full max-w-[1600px] h-screen md:h-[94vh] bg-white md:rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden border-0 md:border border-slate-200/80">
        
        {/* Mobile Header (Visible only on < md screens) */}
        <header className="md:hidden h-14 bg-[#2A3F54] text-white flex items-center justify-between px-4 shrink-0 shadow-md z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg active:scale-95 transition"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Mountain className="w-6 h-6 text-[#1ABB9C]" />
              <span className="font-black text-sm tracking-wide">{getErpName().toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-300 font-medium truncate max-w-[120px]">
              {currentNavTitle}
            </span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1A2A3A] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-white/30">
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
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="fixed inset-y-0 left-0 w-[280px] bg-[#2A3F54] z-50 flex flex-col justify-between shadow-2xl md:hidden overflow-hidden"
              >
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Drawer Header */}
                  <div className="h-16 bg-[#1A2A3A] flex items-center justify-between px-4 shrink-0 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <Mountain className="w-7 h-7 text-[#1ABB9C]" />
                      <div>
                        <span className="text-white font-black tracking-wide text-base block leading-tight">
                          {getErpName().toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Enterprise Management</span>
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

                  {/* User Profile Snippet inside Drawer */}
                  <div className="p-4 bg-[#233547] border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A2A3A] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-sm ring-2 ring-[#1ABB9C]/30 shrink-0">
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
                  <div className="py-2.5 px-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {filteredNavigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id as ModuleType)}
                          className={`w-full min-h-[44px] flex items-center px-3.5 py-2.5 rounded-xl transition-all ${
                            isActive 
                              ? 'bg-[#1ABB9C] text-white font-bold shadow-sm' 
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold">{item.name}</span>
                          {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/80" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drawer Footer / Logout */}
                <div className="p-3 border-t border-white/10 bg-[#1A2A3A]">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-center px-4 py-2.5 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white transition font-bold text-xs"
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
          className="hidden md:flex w-[72px] lg:w-[80px] hover:w-[240px] transition-all duration-300 ease-in-out group bg-[#2A3F54] shrink-0 flex-col justify-between relative z-20 overflow-hidden shadow-[4px_0_15px_rgba(0,0,0,0.1)]"
          onMouseLeave={() => setHoveredModule(null)}
        >
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="h-[72px] bg-[#1A2A3A] flex items-center px-[22px] mb-3 overflow-hidden shrink-0 shadow-sm relative z-10">
              <Mountain className="w-8 h-8 text-[#1ABB9C] shrink-0 drop-shadow-md" />
              <span className="ml-4 text-white font-black tracking-wide text-base whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
                {getErpName().toUpperCase()}
              </span>
            </div>
            <div className="py-2 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isHighlighted = (hoveredModule || activeModule) === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id as ModuleType)}
                    onMouseEnter={() => setHoveredModule(item.id)}
                    className={`w-full h-11 flex items-center relative transition-all duration-200 px-[24px] ${
                      isHighlighted 
                        ? 'text-[#F87C6C] transform translate-x-1' 
                        : 'text-[#BAC8D6] hover:text-white'
                    }`}
                    title={item.name}
                  >
                    {isHighlighted && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute inset-y-0 right-0 left-3 bg-white rounded-l-full shadow-[0_4px_0_0_#e2e8f0,inset_0_-2px_0_0_#f8fafc]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 relative z-10 shrink-0 ${isHighlighted ? 'drop-shadow-sm' : ''}`} />
                    <span className="ml-4 relative z-10 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pb-5 shrink-0 pt-3 border-t border-white/10 relative z-10">
            <button
              onClick={onLogout}
              onMouseEnter={() => setHoveredModule('logout')}
              className={`w-full h-11 flex items-center relative transition-all duration-200 px-[24px] ${
                hoveredModule === 'logout' 
                  ? 'text-[#F87C6C] transform translate-x-1' 
                  : 'text-[#BAC8D6] hover:text-white'
              }`}
              title="Logout"
            >
              {hoveredModule === 'logout' && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-y-0 right-0 left-3 bg-white rounded-l-full shadow-[0_4px_0_0_#e2e8f0,inset_0_-2px_0_0_#f8fafc]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <LogOut className={`w-5 h-5 relative z-10 shrink-0 ${hoveredModule === 'logout' ? 'drop-shadow-sm' : ''}`} />
              <span className="ml-4 relative z-10 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Logout
              </span>
            </button>
          </div>
        </aside>

        {/* Main content container */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC]">
          {landingNotice && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-800 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Default Navigator Notice:</strong> {landingNotice}</span>
              </div>
              <button 
                onClick={() => setLandingNotice(null)} 
                className="text-amber-700 hover:text-amber-900 font-bold ml-4 text-xs px-2 py-0.5 hover:bg-amber-100 rounded"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative min-h-full p-3 sm:p-5 md:p-6 lg:p-8"
                >
                  {/* Top bar on Dashboard */}
                  <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 flex flex-wrap justify-between items-center bg-white shadow-xs mb-4 sm:mb-6 gap-3 relative min-h-[60px] sm:min-h-[68px]">
                    <div className="flex items-center space-x-2 z-10 shrink-0">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{getErpName()}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] sm:max-w-[220px] md:max-w-none">
                        {userSecurityScope ? getAccessLimitDescription(userSecurityScope) : 'Operational Mode'}
                      </span>
                    </div>

                    {/* Dashboard Slogan - Scaled & Animated with realistic effects */}
                    <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center z-0 pointer-events-none">
                      <AnimatedSlogan size="responsive" />
                    </div>

                    {/* Employee Profile Header */}
                    <div className="relative z-10 flex items-center space-x-4" ref={profileMenuRef}>
                      
                      {/* Online Users */}
                      <div className="hidden sm:flex items-center space-x-[-8px]">
                        {onlineUsers.map((emp, i) => (
                          <div 
                            key={emp.id} 
                            title={`${emp.name} is online`}
                            className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-[10px] text-slate-700 overflow-hidden shadow-sm z-10 relative hover:z-20 hover:scale-110 transition-transform"
                            style={{ zIndex: onlineUsers.length - i }}
                          >
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(emp.name)
                            )}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></div>
                          </div>
                        ))}
                      </div>

                      <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                      <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center space-x-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-hidden"
                      >
                        <div className="text-right hidden sm:block">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                            {displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-end space-x-1.5 mt-0.5">
                            {renderRoleBadge()}
                            {userSecurityScope?.employeeId && (
                              <span className="font-mono text-slate-400 font-medium">({userSecurityScope.employeeId})</span>
                            )}
                          </div>
                        </div>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#2A3F54] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs ring-2 ring-white">
                          {getInitials(displayName)}
                        </div>
                      </button>

                      {/* Dropdown Card */}
                      {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2A3F54] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                              {getInitials(displayName)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-slate-900 truncate text-sm">{displayName}</div>
                              <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="py-2.5 space-y-1.5 text-xs text-slate-600 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">System Role:</span>
                              <span className="font-semibold text-slate-800">{userSecurityScope?.role || 'Standard User'}</span>
                            </div>
                            {userSecurityScope?.employeeId && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Employee ID:</span>
                                <span className="font-mono font-semibold text-slate-800">{userSecurityScope.employeeId}</span>
                              </div>
                            )}
                            {userSecurityScope?.employeeDesignation && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Designation:</span>
                                <span className="font-medium text-slate-800 truncate max-w-[140px]">{userSecurityScope.employeeDesignation}</span>
                              </div>
                            )}
                            {userSecurityScope?.assignedDepartment && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Department:</span>
                                <span className="font-medium text-slate-800">{userSecurityScope.assignedDepartment}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-slate-400">Access Scope:</span>
                              <span className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                {userSecurityScope?.accessLimitType?.toUpperCase() || 'ALL'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-slate-400">Default Landing:</span>
                              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                <Compass className="w-3 h-3 text-blue-600 shrink-0" />
                                {userSecurityScope?.defaultNavigator 
                                  ? (findNavigator(userSecurityScope.defaultNavigator)?.name || userSecurityScope.defaultNavigator) 
                                  : 'System Default'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={onLogout}
                              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {renderModule()}
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="p-3 sm:p-5 md:p-6 lg:p-8 min-h-full"
                >
                  <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200/80 relative min-h-[48px] sm:min-h-[56px]">
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight z-10 shrink-0">
                      {navigation.find(n => n.id === activeModule)?.name}
                    </h2>

                    {/* Slogan in top header when space allows */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center z-0 pointer-events-none">
                      <AnimatedSlogan size="lg" />
                    </div>

                    {/* Employee Profile Header */}
                    <div className="relative flex items-center space-x-4" ref={profileMenuRef}>
                      
                      {/* Online Users */}
                      <div className="hidden sm:flex items-center space-x-[-8px]">
                        {onlineUsers.map((emp, i) => (
                          <div 
                            key={emp.id} 
                            title={`${emp.name} is online`}
                            className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-[10px] text-slate-700 overflow-hidden shadow-sm z-10 relative hover:z-20 hover:scale-110 transition-transform"
                            style={{ zIndex: onlineUsers.length - i }}
                          >
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(emp.name)
                            )}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-white border rounded-full"></div>
                          </div>
                        ))}
                      </div>

                      <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                      <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center space-x-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-hidden"
                      >
                        <div className="text-right hidden sm:block">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                            {displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-end space-x-1.5 mt-0.5">
                            {renderRoleBadge()}
                            {userSecurityScope?.employeeId && (
                              <span className="font-mono text-slate-400 font-medium">({userSecurityScope.employeeId})</span>
                            )}
                          </div>
                        </div>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#2A3F54] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs ring-2 ring-white">
                          {getInitials(displayName)}
                        </div>
                      </button>

                      {/* Dropdown Card */}
                      {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2A3F54] to-[#1ABB9C] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                              {getInitials(displayName)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-slate-900 truncate text-sm">{displayName}</div>
                              <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="py-2.5 space-y-1.5 text-xs text-slate-600 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">System Role:</span>
                              <span className="font-semibold text-slate-800">{userSecurityScope?.role || 'Standard User'}</span>
                            </div>
                            {userSecurityScope?.employeeId && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Employee ID:</span>
                                <span className="font-mono font-semibold text-slate-800">{userSecurityScope.employeeId}</span>
                              </div>
                            )}
                            {userSecurityScope?.employeeDesignation && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Designation:</span>
                                <span className="font-medium text-slate-800 truncate max-w-[140px]">{userSecurityScope.employeeDesignation}</span>
                              </div>
                            )}
                            {userSecurityScope?.assignedDepartment && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Department:</span>
                                <span className="font-medium text-slate-800">{userSecurityScope.assignedDepartment}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-slate-400">Access Scope:</span>
                              <span className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                {userSecurityScope?.accessLimitType?.toUpperCase() || 'ALL'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={onLogout}
                              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
    </div>
  );
}
