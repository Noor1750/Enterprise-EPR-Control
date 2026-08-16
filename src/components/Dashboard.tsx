import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon, CheckCircle, Loader2, Download, Gift } from 'lucide-react';
import { getRange } from '../lib/sheets';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isWithinInterval, isWeekend, isBefore, isToday } from 'date-fns';
import bannerImg from '../assets/images/3d_dashboard_banner_1786861208382.jpg';

export default function Dashboard({ spreadsheetId, user, accessLevels }: { spreadsheetId: string, user?: any, accessLevels?: string[] }) {
  const [brandCapacity, setBrandCapacity] = useState<{ name: string, value: number }[]>([]);
  const [departmentCapacity, setDepartmentCapacity] = useState<{ name: string, value: number, color: string }[]>([]);
  const [stats, setStats] = useState({
    totalEmployee: 0,
    numberOfMachine: 0,
    dailyCapacity: 0,
    monthlyCapacity: 0
  });
  const [leavesPerDay, setLeavesPerDay] = useState<Record<string, number>>({});
  const [pendingTasks, setPendingTasks] = useState<string[][]>([]);
  const [birthdays, setBirthdays] = useState<string[][]>([]);
  const [supervisors, setSupervisors] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });

  const totalWorkingDays = daysInMonth.filter(day => !isWeekend(day)).length;
  const daysPassed = daysInMonth.filter(day => isBefore(day, today) || isToday(day));
  const workingDaysPassed = daysPassed.filter(day => !isWeekend(day)).length;
  const remainingWorkingDays = totalWorkingDays - workingDaysPassed;

  useEffect(() => {
    async function loadData() {
      if (!spreadsheetId) return;
      setIsLoading(true);
      try {
        const [mRaw, eRaw, lRaw, tRaw, sRaw] = await Promise.all([
          getRange(spreadsheetId, 'MachineCapacity'),
          getRange(spreadsheetId, 'Employees'),
          getRange(spreadsheetId, 'Leave'),
          getRange(spreadsheetId, 'Tasks').catch(() => []),
          getRange(spreadsheetId, 'Supervisors').catch(() => [])
        ]);
        
        const machines = mRaw.length > 1 ? mRaw.slice(1) : [];
        const employees = eRaw.length > 1 ? eRaw.slice(1) : [];
        const leaves = lRaw.length > 1 ? lRaw.slice(1) : [];
        const tasks = tRaw.length > 1 ? tRaw.slice(1) : [];
        const supervisorsList = sRaw.length > 1 ? sRaw.slice(1) : [];

        const uniqueSupIds = Array.from(new Set(supervisorsList.map(s => s[1]).filter(Boolean)));
        const uniqueSupNames = uniqueSupIds.map(id => {
          const emp = employees.find(e => e[0] === id);
          return emp ? emp[1] : id;
        });
        
        let currentPendingTasks = tasks.filter(t => t[2] === 'Pending' || t[2] === 'In Progress');
        if (user?.email !== 'noor.alam1750@gmail.com') {
           currentPendingTasks = currentPendingTasks.filter(t => t[1] === user?.displayName || t[1] === user?.email);
        }
        setPendingTasks(currentPendingTasks);
        setSupervisors(uniqueSupNames.map(name => [name])); // Just store names as single element array to reuse state
        
        let numberOfMachine = 0;
        let totalDailyCapacity = 0;

        const capacityByBrand: Record<string, number> = {};
        const capacityByDept: Record<string, number> = {};
        
        machines.forEach(m => {
          const count = Number(m[1]) || 0;
          const speed = Number(m[3]) || 0;
          const rboName = m[4] || 'Unknown';
          const category = m[5] || '';
          const department = m[6] || 'Unknown';
          const dailyCapacity = count * speed * 16;
          
          numberOfMachine += count;
          
          capacityByBrand[rboName] = (capacityByBrand[rboName] || 0) + dailyCapacity;
          capacityByDept[department] = (capacityByDept[department] || 0) + dailyCapacity;
          totalDailyCapacity += dailyCapacity;
        });

        const data = Object.keys(capacityByBrand).map(key => ({
          name: key,
          value: capacityByBrand[key]
        }));
        
        // Sort by value descending
        data.sort((a, b) => b.value - a.value);
        setBrandCapacity(data);

        const colors = ['#F4C75D', '#1ECA98', '#FFFFFF', '#3498DB', '#F87C6C', '#9B59B6', '#E74C3C'];
        const deptData = Object.keys(capacityByDept).map((key, index) => ({
          name: key,
          value: capacityByDept[key],
          color: colors[index % colors.length]
        }));
        deptData.sort((a, b) => b.value - a.value);
        setDepartmentCapacity(deptData);
        
        const activeEmployees = employees.filter(e => e[9] !== 'Inactive');

        const currentMonthBirthdays = activeEmployees.filter(e => {
          if (!e[21]) return false;
          try {
            const dob = new Date(e[21]);
            return dob.getMonth() === today.getMonth();
          } catch(err) {
            return false;
          }
        });
        currentMonthBirthdays.sort((a, b) => new Date(a[21]).getDate() - new Date(b[21]).getDate());
        setBirthdays(currentMonthBirthdays);

        setStats({
          totalEmployee: activeEmployees.length,
          numberOfMachine,
          dailyCapacity: totalDailyCapacity,
          monthlyCapacity: totalDailyCapacity * 22
        });

        const leavesMap: Record<string, number> = {};
        leaves.forEach(l => {
          // Leave format: [leaveId, empId, empName, dept, desig, fromDate, toDate, days, status]
          if (l[8] === 'Approved' || l[8] === 'Pending') { // Or only Approved? Assuming all leaves for now or just approved. Let's include approved and pending
            try {
              const from = parseISO(l[5]);
              const to = parseISO(l[6]);
              if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
                const leaveInterval = { start: from, end: to };
                daysInMonth.forEach(day => {
                  if (isWithinInterval(day, leaveInterval)) {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    leavesMap[dateStr] = (leavesMap[dateStr] || 0) + 1;
                  }
                });
              }
            } catch (e) {
               // ignore invalid dates
            }
          }
        });
        setLeavesPerDay(leavesMap);

      } catch (err: any) {
        if (!err?.message?.includes('Database (Spreadsheet) not found')) {
          console.error('Failed to load dashboard data', err);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [spreadsheetId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* 3D Banner */}
      <div className="w-full h-[200px] md:h-[260px] rounded-2xl overflow-hidden relative shadow-[0_10px_20px_rgba(0,0,0,0.1)] border border-white">
        <img src={bannerImg} alt="Workspace Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
           <div>
             <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">FRU Overview</h1>
             <p className="text-white/80 font-medium mt-1">Real-time metrics and capacity</p>
           </div>
        </div>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* WORKING DAYS INFO */}
        <div className="md:col-span-3 bg-[#F4C75D] rounded-xl p-6 text-white relative flex flex-col justify-center items-center text-center shadow-[0_6px_0_0_#D4A73D] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#D4A73D]">
          <h3 className="uppercase text-sm tracking-widest font-bold mb-6 text-white/90">This Month ({format(today, 'MMMM')})</h3>
          <div className="space-y-4 w-full">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm shadow-sm border border-white/10">
              <div className="text-white/90 text-[11px] uppercase tracking-widest font-bold mb-1">Working Days</div>
              <div className="text-5xl font-black tracking-tighter">{workingDaysPassed} <span className="text-2xl font-semibold opacity-75">/ {totalWorkingDays}</span></div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm shadow-sm border border-white/10">
              <div className="text-white/90 text-[11px] uppercase tracking-widest font-bold mb-1">Remaining Days</div>
              <div className="text-4xl font-black tracking-tighter">{remainingWorkingDays}</div>
            </div>
          </div>
        </div>

        {/* STATISTICS */}
        <div className="md:col-span-6 bg-white rounded-xl p-6 border border-gray-100 flex flex-col shadow-[0_6px_0_0_#e5e7eb] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#e5e7eb]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="uppercase text-sm tracking-wider font-semibold text-gray-500">Statistics (Brand Capacity)</h3>
            <div className="flex items-center text-sm text-[#F87C6C] font-medium">
              <span className="w-4 h-0.5 bg-[#F87C6C] mr-2"></span>
              CAPACITY
            </div>
          </div>
          <div className="flex-1 min-h-[150px] relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : brandCapacity.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No capacity data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandCapacity} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#33495F', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <RechartsTooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Bar dataKey="value" fill="#F87C6C" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="h-1 w-full bg-[#1ECA98] mt-2 rounded-full relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#1ECA98] opacity-50"></div>
          </div>
        </div>

        {/* DEPARTMENT CAPACITY */}
        <div className="md:col-span-3 bg-[#1ECA98] rounded-xl p-6 text-white flex flex-col shadow-[0_6px_0_0_#0EAA78] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#0EAA78]">
          <h3 className="uppercase text-sm tracking-wider font-semibold mb-2">Department Capacity</h3>
          <div className="flex-1 flex items-center justify-center relative">
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            ) : departmentCapacity.length === 0 ? (
              <span className="text-white/50 text-sm">No data</span>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <RechartsTooltip 
                    formatter={(value: number) => value.toLocaleString()}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#33495F' }}
                  />
                  <Pie
                    data={departmentCapacity}
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {departmentCapacity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium uppercase tracking-wider mt-4">
            {departmentCapacity.map((dept, idx) => (
              <div key={idx} className="flex items-center truncate" title={dept.name}>
                <span className="w-2 h-2 rounded-full shrink-0 mr-2" style={{ backgroundColor: dept.color }}></span> 
                <span className="truncate">{dept.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#F87C6C] rounded-xl p-6 text-white text-center flex flex-col justify-center shadow-[0_6px_0_0_#D85C4C] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#D85C4C] cursor-default">
          <h3 className="uppercase text-xs tracking-wider font-semibold mb-1">Total Employee</h3>
          <p className="text-4xl font-bold">{stats.totalEmployee.toLocaleString()}</p>
        </div>
        <div className="bg-[#1ECA98] rounded-xl p-6 text-white text-center flex flex-col justify-center relative overflow-hidden shadow-[0_6px_0_0_#0EAA78] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#0EAA78] cursor-default">
          <h3 className="uppercase text-xs tracking-wider font-semibold mb-1">Number of machine</h3>
          <div className="flex items-end justify-center space-x-2">
            <p className="text-4xl font-bold">{stats.numberOfMachine.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-[#F4C75D] rounded-xl p-6 text-white text-center flex flex-col justify-center shadow-[0_6px_0_0_#D4A73D] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#D4A73D] cursor-default">
          <h3 className="uppercase text-xs tracking-wider font-semibold mb-1">Daily capacity</h3>
          <p className="text-4xl font-bold">{stats.dailyCapacity.toLocaleString()}</p>
        </div>
        <div className="bg-[#1ECA98] rounded-xl p-6 text-white text-center flex flex-col justify-center shadow-[0_6px_0_0_#0EAA78] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#0EAA78] cursor-default">
          <h3 className="uppercase text-xs tracking-wider font-semibold mb-1">Monthly capacity</h3>
          <div className="flex items-end justify-center space-x-2">
            <p className="text-4xl font-bold">{stats.monthlyCapacity.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* DAILY TASKS */}
        <div className="md:col-span-7 bg-[#F4C75D] rounded-xl p-6 shadow-[0_6px_0_0_#D4A73D] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#D4A73D]">
          <h3 className="uppercase text-sm tracking-wider font-semibold text-white mb-6">Daily Tasks</h3>
          <div className="max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
            {pendingTasks.length === 0 ? (
              <div className="text-white/80 text-sm italic">No pending tasks</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingTasks.slice(0, 10).map((task, i) => {
                  const isOverdue = task[3] && new Date(task[3]) < new Date(new Date().setHours(0,0,0,0));
                  return (
                    <div key={i} className={`relative pl-6 py-2 border-l-2 border-white/30 text-white`}>
                      <div className={`absolute w-3 h-3 rounded-sm -left-[7px] top-3 ${isOverdue ? 'bg-red-500' : 'bg-white'}`}></div>
                      <h4 className="font-bold text-lg leading-none mb-2">{task[0]}</h4>
                      <p className={`text-sm leading-tight line-clamp-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-white/90'}`}>
                        {task[1] ? `Assignee: ${task[1]}` : ''} {task[3] ? `| Due: ${task[3]}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CALENDAR */}
        <div className="md:col-span-5 bg-white rounded-xl p-6 border border-gray-100 flex flex-col md:flex-row gap-6 shadow-[0_6px_0_0_#e5e7eb] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#e5e7eb]">
          <div className="flex-1">
            <h3 className="uppercase text-sm tracking-wider font-semibold text-gray-500 mb-4">Calendar - {format(today, 'MMMM')}</h3>
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-gray-400 mb-1">{day}</div>
              ))}
              
              {Array.from({ length: currentMonthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {daysInMonth.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const leaveCount = leavesPerDay[dateStr] || 0;
                
                return (
                  <div 
                    key={dateStr} 
                    className={`aspect-square rounded-sm flex flex-col items-center justify-center text-xs relative ${
                      leaveCount > 0 ? 'bg-[#F87C6C] text-white' : 'bg-gray-50 text-gray-600'
                    }`}
                    title={`${leaveCount} leaves`}
                  >
                    <span>{format(day, 'd')}</span>
                    {leaveCount > 0 && (
                      <span className="text-[9px] leading-tight font-bold opacity-90">{leaveCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-px bg-gray-200 hidden md:block"></div>
          <div className="flex-1 relative pr-4">
            <div className="flex items-center text-[#F87C6C] font-bold uppercase tracking-wide text-sm mb-4">
              <span className="text-xs mr-1">▼</span> {format(today, 'MMMM').toUpperCase()}
            </div>
            <h4 className="font-bold text-[#33495F] mb-2 uppercase text-sm tracking-wider">Leave Summary</h4>
            <div className="text-xs text-gray-500 space-y-3">
              <p>Red dates indicate employees are on leave.</p>
              <p>Total leaves this month: {Object.values(leavesPerDay).reduce((a: any, b: any) => a + b, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-[#9B59B6] rounded-xl p-6 text-white flex flex-col shadow-[0_6px_0_0_#7B3996] transform transition-transform hover:-translate-y-1 hover:shadow-[0_10px_0_0_#7B3996]">
          <h3 className="uppercase text-sm tracking-wider font-semibold mb-6 flex items-center gap-2">
            <Gift className="w-4 h-4" /> Upcoming Birthdays ({format(today, 'MMMM')})
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 max-h-[300px]">
            {birthdays.length === 0 ? (
              <div className="text-white/80 text-sm italic">No active employee birthdays this month.</div>
            ) : (
              <ul className="space-y-4">
                {birthdays.map((emp, i) => {
                  let dobDate: Date | null = null;
                  try {
                    dobDate = new Date(emp[21]);
                  } catch (e) {}

                  return (
                    <li key={i} className="flex items-center justify-between border-b border-white/20 pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        {emp[16] ? (
                          <img src={emp[16]} alt={emp[1]} className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                            {emp[1]?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-sm">{emp[1]}</div>
                          <div className="text-white/70 text-xs truncate max-w-[150px]">{emp[2]}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {dobDate && (
                          <>
                            <div className="font-bold text-lg">{format(dobDate, 'd')}</div>
                            <div className="text-white/70 text-xs uppercase tracking-wider">{format(dobDate, 'MMM')}</div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
