const fs = require('fs');
const path = './src/components/machine/MachineDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// Import getMachineStatus
const importTarget = `import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';`;
const importReplacement = `import { Activity, AlertTriangle, CheckCircle, Clock, ArchiveX, HelpCircle } from 'lucide-react';
import { getMachineStatus } from '../../lib/machineEngine';`;
code = code.replace(importTarget, importReplacement);

// Add stats fields
const statsTarget = `    let shortageCount = 0;
    const departmentCap: Record<string, number> = {};`;
const statsReplacement = `    let shortageCount = 0;
    let activeMachines = 0;
    let obsoleteMachines = 0;
    let noOnboardDate = 0;
    const departmentCap: Record<string, number> = {};`;
code = code.replace(statsTarget, statsReplacement);

// Update logic
const logicTarget = `      if (isCounted) {`;
const logicReplacement = `      const status = getMachineStatus(m[24], m[25], new Date().toISOString());
      if (status === 'Active') activeMachines++;
      if (status === 'Obsolete') obsoleteMachines++;
      if (!m[24]) noOnboardDate++;
      
      if (isCounted) {`;
code = code.replace(logicTarget, logicReplacement);

// Return stats
const returnTarget = `      totalMachines,
      countedMachines,`;
const returnReplacement = `      totalMachines,
      activeMachines,
      obsoleteMachines,
      noOnboardDate,
      countedMachines,`;
code = code.replace(returnTarget, returnReplacement);

// Add cards to UI
const gridTarget = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">`;
const gridReplacement = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <StatCard 
          title="Total Machines" value={stats.totalMachines} icon={Activity}
          colorClass="text-blue-500" bgClass="bg-white col-span-1 md:col-span-1 lg:col-span-2"
        />
        <StatCard 
          title="Active" value={stats.activeMachines} icon={CheckCircle}
          colorClass="text-emerald-500" bgClass="bg-emerald-50/50 col-span-1 md:col-span-1 lg:col-span-2"
        />
        <StatCard 
          title="Obsolete" value={stats.obsoleteMachines} icon={ArchiveX}
          colorClass="text-red-500" bgClass={stats.obsoleteMachines > 0 ? "bg-red-50" : "bg-white"}
          className="col-span-1 md:col-span-1 lg:col-span-2"
        />
        <StatCard 
          title="No Onboard Date" value={stats.noOnboardDate} icon={HelpCircle}
          colorClass="text-amber-500" bgClass={stats.noOnboardDate > 0 ? "bg-amber-50" : "bg-white"}
          className="col-span-1 md:col-span-1 lg:col-span-2"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
code = code.replace(gridTarget, gridReplacement);

// Remove the old 4 cards that were duplicated
const removeCardsTarget = `        <StatCard 
          title="Total Machines" 
          value={stats.totalMachines} 
          icon={Activity} 
          colorClass="text-blue-500"
          bgClass="bg-white"
        />
        <StatCard 
          title="Available Cap (Pcs)" 
          value={Math.round(stats.totalAvailableCapPcs).toLocaleString()} 
          subtext={\`vs Potential: \${Math.round(stats.totalPotentialCapPcs).toLocaleString()}\`}
          icon={CheckCircle} 
          colorClass="text-[#1ECA98]"
          bgClass="bg-emerald-50/50"
        />
        <StatCard 
          title="Manpower Shortage" 
          value={stats.shortageCount} 
          subtext="Machines set to 'Vacancy'"
          icon={AlertTriangle} 
          colorClass="text-red-500"
          bgClass={stats.shortageCount > 0 ? "bg-red-50" : "bg-white"}
        />
        <StatCard 
          title="Active Departments" 
          value={Object.keys(stats.departmentCap).length} 
          icon={Clock} 
          colorClass="text-orange-500"
          bgClass="bg-white"
        />`;

const replaceOldCards = `        <StatCard 
          title="Available Cap (Pcs)" 
          value={Math.round(stats.totalAvailableCapPcs).toLocaleString()} 
          subtext={\`vs Potential: \${Math.round(stats.totalPotentialCapPcs).toLocaleString()}\`}
          icon={CheckCircle} 
          colorClass="text-[#1ECA98]"
          bgClass="bg-emerald-50/50"
        />
        <StatCard 
          title="Manpower Shortage" 
          value={stats.shortageCount} 
          subtext="Machines set to 'Vacancy'"
          icon={AlertTriangle} 
          colorClass="text-red-500"
          bgClass={stats.shortageCount > 0 ? "bg-red-50" : "bg-white"}
        />
        <StatCard 
          title="Active Departments" 
          value={Object.keys(stats.departmentCap).length} 
          icon={Clock} 
          colorClass="text-orange-500"
          bgClass="bg-white"
        />`;
code = code.replace(removeCardsTarget, replaceOldCards);

// Also accept className prop in StatCard
code = code.replace(`colorClass, bgClass, subtext }: any) => (
    <div className={\`p-6 rounded-2xl border flex items-center space-x-4 \${bgClass} border-gray-100 shadow-sm\`}>`, `colorClass, bgClass, subtext, className }: any) => (
    <div className={\`p-6 rounded-2xl border flex items-center space-x-4 \${bgClass} border-gray-100 shadow-sm \${className || ''}\`}>`);

fs.writeFileSync(path, code);
