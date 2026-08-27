const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// mForm state and resets
content = content.replace(/capacityExistingManpowerMachineUnit: ''(\s*)\}/g, "capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes'$1}");
content = content.replace(/capacityExistingManpowerMachineUnit: m\[16\] \|\| ''/g, "capacityExistingManpowerMachineUnit: m[16] || '',\n      capacityCount: m[17] || 'Yes'");

// padding
content = content.replace(/while \(padded\.length < 17\) padded\.push\(''\);/g, "while (padded.length < 18) padded.push('');");

// rowData definition
const oldRowData = `        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`;
const newRowData = `        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString(),
        mForm.capacityCount
      ];`;
content = content.replace(oldRowData, newRowData);

// updateRange call
content = content.replace(/MachineCapacity!A\$\{row\}:Q\$\{row\}/g, "MachineCapacity!A${row}:R${row}");
// appendRow call
content = content.replace(/MachineCapacity!A:Q/g, "MachineCapacity!A:R");

// header buttons move to right: already flex justify-between. Just need to make sure Add Machine / Bulk upload are on right.
// Wait, looking at the code earlier:
// <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex justify-between items-center">
//          <div className="flex gap-2">
// This means the first child is "flex gap-2", so it's on the left. We need to add an empty div before it, or change it.
const oldHeader = `<div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex justify-between items-center">
          <div className="flex gap-2">`;
const newHeader = `<div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex justify-end items-center">
          <div className="flex gap-2">`;
content = content.replace(oldHeader, newHeader);

// table header
content = content.replace(
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>\n                  <th className="px-2 py-2 text-right"></th>',
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>\n                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap Count</th>\n                  <th className="px-2 py-2 text-right"></th>'
);

// table body
content = content.replace(
  '<td className="px-2 py-2 text-center">{m[16] ? Number(m[16]).toLocaleString() : ""}</td>\n                    <td className="px-2 py-2 text-right">',
  '<td className="px-2 py-2 text-center">{m[16] ? Number(m[16]).toLocaleString() : ""}</td>\n                    <td className="px-2 py-2 text-center">{m[17] || "Yes"}</td>\n                    <td className="px-2 py-2 text-right">'
);

// form field
const manpowerAlloc = `            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Manpower Allocation</label>
              <select value={mForm.manpowerAllocation} onChange={e => setMForm({...mForm, manpowerAllocation: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded-sm">
                <option value="Both Shift">Both Shift</option>
                <option value="One Shift">One Shift</option>
                <option value="None">None</option>
              </select>
            </div>`;

const capCountField = `
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Capacity Count</label>
              <select value={mForm.capacityCount} onChange={e => setMForm({...mForm, capacityCount: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded-sm">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>`;

content = content.replace(manpowerAlloc, manpowerAlloc + capCountField);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
