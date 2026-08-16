import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Wrench, Calendar, Check, Clock, FileSpreadsheet, 
  Award, Network, DownloadCloud, Settings, Menu, X, LogOut,
  ChevronDown, User as UserIcon, ChevronRight, Mountain, Eye, BarChart, Download, CheckSquare
} from 'lucide-react';
import { User } from 'firebase/auth';
import EmployeeDirectory from './EmployeeDirectory';
import MachineCapacity from './MachineCapacity';
import LeaveManagement from './LeaveManagement';
import OvertimeCalendar from './OvertimeCalendar';
import Holidays from './Holidays';
import BestPractices from './BestPractices';
import SupervisorOrg from './SupervisorOrg';
import Reports from './Reports';
import UserManagement from './UserManagement';
import Dashboard from './Dashboard';
import Tasks from './Tasks';

interface LayoutProps {
  user: User;
  spreadsheetId: string;
  onLogout: () => void;
  accessLevels: string[];
}

type ModuleType = 'dashboard' | 'directory' | 'machine' | 'skill' | 'leave' | 'leaveApproval' | 'overtime' | 'holidays' | 'practices' | 'orgchart' | 'reports' | 'settings' | 'tasks';

export default function Layout({ user, spreadsheetId, onLogout, accessLevels }: LayoutProps) {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Menu, moduleName: 'All' },
    { id: 'tasks', name: 'Daily Tasks', icon: CheckSquare, moduleName: 'All' },
    { id: 'directory', name: 'Employee Directory', icon: Users, moduleName: 'Employee Directory' },
    { id: 'machine', name: 'Machine Capacity', icon: Wrench, moduleName: 'Machine & Skills' },
    { id: 'skill', name: 'Skill Matrix', icon: Award, moduleName: 'Machine & Skills' },
    { id: 'leave', name: 'Leave Application', icon: Calendar, moduleName: 'Leave Management' },
    { id: 'leaveApproval', name: 'Leave Approval', icon: Check, moduleName: 'Leave Management' },
    { id: 'overtime', name: 'Overtime', icon: Clock, moduleName: 'Overtime' },
    { id: 'holidays', name: 'Holidays', icon: FileSpreadsheet, moduleName: 'Holidays' },
    { id: 'practices', name: 'Best Practices', icon: Award, moduleName: 'Best Practices' },
    { id: 'orgchart', name: 'Organization Chart', icon: Network, moduleName: 'Organization Chart' },
    { id: 'reports', name: 'Reports & Export', icon: DownloadCloud, moduleName: 'Reports & Export' },
    { id: 'settings', name: 'Settings', icon: Settings, moduleName: 'Settings' },
  ];

  const hasAccess = (moduleName: string) => {
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
      case 'dashboard': return <Dashboard spreadsheetId={spreadsheetId} user={user} accessLevels={accessLevels} />;
      case 'tasks': return <Tasks spreadsheetId={spreadsheetId} user={user} />;
      case 'directory': return <EmployeeDirectory spreadsheetId={spreadsheetId} />;
      case 'machine': return <MachineCapacity spreadsheetId={spreadsheetId} view="machine" />;
      case 'skill': return <MachineCapacity spreadsheetId={spreadsheetId} view="skill" />;
      case 'leave': return <LeaveManagement spreadsheetId={spreadsheetId} user={user} view="apply" />;
      case 'leaveApproval': return <LeaveManagement spreadsheetId={spreadsheetId} user={user} view="approve" />;
      case 'overtime': return <OvertimeCalendar spreadsheetId={spreadsheetId} user={user} />;
      case 'holidays': return <Holidays spreadsheetId={spreadsheetId} />;
      case 'practices': return <BestPractices spreadsheetId={spreadsheetId} user={user} />;
      case 'orgchart': return <SupervisorOrg spreadsheetId={spreadsheetId} />;
      case 'reports': return <Reports spreadsheetId={spreadsheetId} />;
      case 'settings': return <UserManagement spreadsheetId={spreadsheetId} />;
      default: return <div>Select a module</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#EBEBEB] flex items-center justify-center p-0 md:p-8 font-sans">
      <div className="w-full max-w-[1400px] h-[100vh] md:h-[90vh] bg-white md:rounded-xl shadow-2xl flex overflow-hidden">
        {/* Expandable Sidebar */}
        <div 
          className="w-[80px] hover:w-[240px] transition-all duration-300 ease-in-out group bg-[#2A3F54] shrink-0 flex flex-col justify-between relative z-20 overflow-hidden shadow-[4px_0_15px_rgba(0,0,0,0.1)]"
          onMouseLeave={() => setHoveredModule(null)}
        >
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="h-[80px] bg-[#1A2A3A] flex items-center px-[24px] mb-4 overflow-hidden shrink-0 shadow-sm relative z-10">
              <Mountain className="w-8 h-8 text-white shrink-0 drop-shadow-md" />
              <span className="ml-4 text-white font-black tracking-wide text-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
                FRU ERP
              </span>
            </div>
            <div className="py-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isHighlighted = (hoveredModule || activeModule) === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id as ModuleType)}
                    onMouseEnter={() => setHoveredModule(item.id)}
                    className={`w-full h-12 flex items-center relative transition-all duration-200 px-[28px] ${
                      isHighlighted 
                        ? 'text-[#F87C6C] transform translate-x-1' 
                        : 'text-[#BAC8D6] hover:text-white'
                    }`}
                    title={item.name}
                  >
                    {isHighlighted && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute inset-y-0 right-0 left-4 bg-white rounded-l-full shadow-[0_4px_0_0_#e2e8f0,inset_0_-2px_0_0_#f8fafc]"
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
          <div className="pb-6 shrink-0 pt-4 border-t border-white/10 relative z-10">
            <button
              onClick={onLogout}
              onMouseEnter={() => setHoveredModule('logout')}
              className={`w-full h-12 flex items-center relative transition-all duration-200 px-[28px] ${
                hoveredModule === 'logout' 
                  ? 'text-[#F87C6C] transform translate-x-1' 
                  : 'text-[#BAC8D6] hover:text-white'
              }`}
              title="Logout"
            >
              {hoveredModule === 'logout' && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-y-0 right-0 left-4 bg-white rounded-l-full shadow-[0_4px_0_0_#e2e8f0,inset_0_-2px_0_0_#f8fafc]"
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
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
          <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
            {activeModule === 'dashboard' ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {renderModule()}
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-8 h-full"
                >
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-[#33495F] tracking-wide uppercase text-sm">
                      {navigation.find(n => n.id === activeModule)?.name}
                    </h2>
                    <div className="flex items-center space-x-4">
                       <span className="text-sm font-medium text-gray-500">{user.email}</span>
                       <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                          <UserIcon className="w-5 h-5" />
                       </div>
                    </div>
                  </div>
                  {renderModule()}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
