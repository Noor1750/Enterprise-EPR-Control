const fs = require('fs');
const path = './src/components/MachineCapacity.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add searchQuery state
const stateTarget = `  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);`;
const stateReplacement = `  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');`;
code = code.replace(stateTarget, stateReplacement);

// 2. Add Search import
const importTarget = `import { Loader2, Edit2, X, Plus, Upload, LayoutDashboard, Calendar } from 'lucide-react';`;
const importReplacement = `import { Loader2, Edit2, X, Plus, Upload, LayoutDashboard, Calendar, Search } from 'lucide-react';`;
code = code.replace(importTarget, importReplacement);

// 3. Add search bar to UI
const uiTarget = `        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-xl shadow-sm flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Machine List</h3>`;
const uiReplacement = `        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Machine List</h3>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, model, serial, asset tag, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none"
            />
          </div>`;
code = code.replace(uiTarget, uiReplacement);

// 4. Update 'Add Machine' button to clear new fields
const btnTarget = `                  manpowerAllocation: 'Both Shift', overtime: 'One Shift',
                  capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes'
                });`;
const btnReplacement = `                  manpowerAllocation: 'Both Shift', overtime: 'One Shift',
                  capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
                  modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
                });`;
code = code.replace(btnTarget, btnReplacement);

// 5. Update machines mapping to filter by search query
const mapTarget = `              <tbody className="divide-y divide-gray-100 bg-white">
                {machines.map((m, i) => (`;
const mapReplacement = `              <tbody className="divide-y divide-gray-100 bg-white">
                {machines.filter(m => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  const name = (m[4] || '').toLowerCase();
                  const model = (m[21] || '').toLowerCase();
                  const serial = (m[22] || '').toLowerCase();
                  const asset = (m[23] || '').toLowerCase();
                  const status = getMachineStatus(m[24], m[25], new Date().toISOString()).toLowerCase();
                  return name.includes(q) || model.includes(q) || serial.includes(q) || asset.includes(q) || status.includes(q);
                }).map((m, originalIndex) => {
                  // Keep original index for editing
                  const i = machines.indexOf(m);
                  return (`;
code = code.replace(mapTarget, mapReplacement);

// Also close the return map correctly
const endMapTarget = `                    </td>
                  </tr>
                ))}
                {machines.length === 0 && (`;
const endMapReplacement = `                    </td>
                  </tr>
                )})}
                {machines.length === 0 && (`;
code = code.replace(endMapTarget, endMapReplacement);

fs.writeFileSync(path, code);
