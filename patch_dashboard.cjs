const fs = require('fs');

let dash = fs.readFileSync('src/components/SkillMatrixDashboard.tsx', 'utf8');

const tabState = `  const [activeTab, setActiveTab] = useState('dashboard');
  
  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'employees', label: 'Employees' },
    { id: 'machines', label: 'Machines' },
    { id: 'skillgaps', label: 'Skill Gaps' },
    { id: 'training', label: 'Training' },
    { id: 'reports', label: 'Reports' }
  ];
`;

dash = dash.replace("const [deptFilter, setDeptFilter] = useState('All');", "const [deptFilter, setDeptFilter] = useState('All');\n" + tabState);

// Add Tab Navigation UI before the KPI Cards
const tabNavUI = `
      {/* Sub Navigation */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={\`py-4 text-sm font-bold border-b-2 transition-colors \${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}\`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
`;

dash = dash.replace('<div className="p-8 space-y-8 max-w-[1600px] mx-auto">', tabNavUI);

// Wrap content in conditions
const wrapContent = `
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
`;

dash = dash.replace('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">', wrapContent);

// End wrap before Employee Overview
dash = dash.replace('{/* Employee Skill Overview & Search */}', `</>
        )}
        
        {activeTab === 'employees' && (
          <>
            {/* Employee Skill Overview & Search */}`);

// End wrap at the end
dash = dash.replace('</div>\n    </div>\n  );\n}', `</>
        )}
        
        {activeTab === 'machines' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Machine Operator Coverage</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold">Department</th>
                    <th className="px-6 py-4 font-bold text-center">Qualified Operators</th>
                    <th className="px-6 py-4 font-bold text-center">Required</th>
                    <th className="px-6 py-4 font-bold text-center">Coverage</th>
                    <th className="px-6 py-4 font-bold">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {machineOverview.map((m, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3 font-semibold text-slate-800">{m.name} {m.no ? \`(\${m.no})\` : ''}</td>
                      <td className="px-6 py-3 text-slate-600">{m.department}</td>
                      <td className="px-6 py-3 text-center font-bold text-indigo-600">{m.qualifiedCount}</td>
                      <td className="px-6 py-3 text-center">{m.reqOperators}</td>
                      <td className="px-6 py-3 text-center font-mono font-bold text-slate-700">{m.coverage}%</td>
                      <td className="px-6 py-3">
                        <span className={\`px-2.5 py-1 rounded-md text-xs font-bold \${m.status === '🔴 Critical' ? 'bg-rose-100 text-rose-700' : m.status === '🟡 Risk' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'skillgaps' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Skill Gap Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Employee</th>
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold text-center">Current Level</th>
                    <th className="px-6 py-4 font-bold text-center">Required Level</th>
                    <th className="px-6 py-4 font-bold text-center">Gap</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeOverview.flatMap(e => 
                    e.skillDetails.filter(s => s.gap > 0).map((s, i) => (
                      <tr key={\`\${e.id}-\${i}\`}>
                        <td className="px-6 py-3 font-semibold text-slate-800">{e.name} <span className="text-slate-400 font-mono text-xs">({e.id})</span></td>
                        <td className="px-6 py-3 text-slate-600">{s.machine}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-700">{s.current}</td>
                        <td className="px-6 py-3 text-center text-slate-500">{s.req}</td>
                        <td className="px-6 py-3 text-center font-bold text-rose-600">-{s.gap}</td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Training Needs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-600">
                    <th className="px-6 py-4 font-bold">Priority</th>
                    <th className="px-6 py-4 font-bold">Employee</th>
                    <th className="px-6 py-4 font-bold">Department</th>
                    <th className="px-6 py-4 font-bold">Machine</th>
                    <th className="px-6 py-4 font-bold text-center">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeOverview.flatMap(e => 
                    e.skillDetails.filter(s => s.gap > 0).map(s => ({...s, emp: e}))
                  ).sort((a,b) => b.gap - a.gap).map((item, i) => (
                      <tr key={i}>
                        <td className="px-6 py-3">
                          {item.gap >= 2 ? (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">🔴 High</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">🟡 Medium</span>
                          )}
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-800">{item.emp.name}</td>
                        <td className="px-6 py-3 text-slate-600">{item.emp.department}</td>
                        <td className="px-6 py-3 text-slate-600">{item.machine}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-700">{item.gap} Level(s)</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center py-20">
             <Download className="w-12 h-12 text-indigo-200 mb-4" />
             <h3 className="text-lg font-bold text-slate-800 mb-2">Export Reports</h3>
             <p className="text-slate-500 mb-6 max-w-md text-center">Download detailed skill matrix analysis, including employee coverage, skill gaps, and training requirements in Excel format.</p>
             <button onClick={() => alert("Report generation triggered.")} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm">
               Generate Excel Report
             </button>
          </div>
        )}

      </div>
    </div>
  );
}`);

fs.writeFileSync('src/components/SkillMatrixDashboard.tsx', dash);
console.log("Dashboard tabs added");
