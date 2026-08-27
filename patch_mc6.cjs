const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// The thead should be:
// Per Shift Manpower, Manpower Alloc., Cap 16 Hrs Pcs, Cap 16 Hrs Unit, Exist Cap Pcs, Exist Cap Unit
content = content.replace(
`                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>`,
`                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>`
);

// The tbody should be:
// m[9] (Manpower), m[10] (Alloc), m[11] (Cap Pcs), m[12] (Cap Unit), m[13] (Exist Pcs), m[14] (Exist Unit)
content = content.replace(
`                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[9]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[10]}</td>
                    <td className="px-2 py-2 text-center">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>
                    <td className="px-2 py-2 text-center">{m[13]}</td>
                    <td className="px-2 py-2 text-center">{m[14]}</td>`,
`                    <td className="px-2 py-2 text-center">{m[9]}</td>
                    <td className="px-2 py-2 text-center">{m[10]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[11]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[12]}</td>
                    <td className="px-2 py-2 text-center">{m[13]}</td>
                    <td className="px-2 py-2 text-center">{m[14]}</td>`
);

// The form parsing from array should be:
// perShiftManpowerRequired: m[9], manpowerAllocation: m[10]
content = content.replace(
`      perShiftManpowerRequired: m[11] || '',
      manpowerAllocation: m[12] || 'Both Shift',
      capacityExistingManpowerPcs: m[13] || '',
      capacityExistingManpowerMachineUnit: m[14] || ''`,
`      perShiftManpowerRequired: m[9] || '',
      manpowerAllocation: m[10] || 'Both Shift',
      capacityExistingManpowerPcs: m[13] || '',
      capacityExistingManpowerMachineUnit: m[14] || ''`
);

// The rowData saving to spreadsheet:
// manpower, alloc, capPcs, capUnit
content = content.replace(
`      const rowData = [
        mForm.brandName, mForm.department, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), mForm.perShiftManpowerRequired,
        mForm.manpowerAllocation, Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`,
`      const rowData = [
        mForm.brandName, mForm.department, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        mForm.perShiftManpowerRequired, mForm.manpowerAllocation,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), 
        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`
);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
