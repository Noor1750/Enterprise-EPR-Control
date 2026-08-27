const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// Revert the append to 17 columns A:Q
content = content.replace(/'MachineCapacity!A:O'/g, "'MachineCapacity!A:Q'");
content = content.replace(/\`MachineCapacity!A\$\{row\}:O\$\{row\}\`/g, "\`MachineCapacity!A${row}:Q${row}\`");

// Pad to 17
content = content.replace(/while \(padded\.length < 15\) padded\.push\(''\);/g, "while (padded.length < 17) padded.push('');");

// Fix rowData to 17 columns (insert empty for Operator Category and Overtime)
content = content.replace(
`      const rowData = [
        mForm.brandName, mForm.department, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        mForm.perShiftManpowerRequired, mForm.manpowerAllocation,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), 
        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`,
`      const rowData = [
        mForm.brandName, mForm.department, '', mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(),
        mForm.perShiftManpowerRequired, mForm.manpowerAllocation, '',
        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`
);

// Fix mapping back from 17 columns
content = content.replace(
`      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[2] || '',
      machineName: m[3] || '',
      standardUnit: m[4] || '',
      specificationPerMin: m[5] || '',
      standardSpeedPerMin: m[6] || '',
      utilization: (m[7] || '').replace('%', ''),
      conversionRatio: m[8] || '',
      perShiftManpowerRequired: m[9] || '',
      manpowerAllocation: m[10] || 'Both Shift',
      capacityExistingManpowerPcs: m[13] || '',
      capacityExistingManpowerMachineUnit: m[14] || ''`,
`      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '',
      standardUnit: m[5] || '',
      specificationPerMin: m[6] || '',
      standardSpeedPerMin: m[7] || '',
      utilization: (m[8] || '').replace('%', ''),
      conversionRatio: m[9] || '',
      perShiftManpowerRequired: m[12] || '',
      manpowerAllocation: m[13] || 'Both Shift',
      capacityExistingManpowerPcs: m[15] || '',
      capacityExistingManpowerMachineUnit: m[16] || ''`
);

// Fix tbody mapping
content = content.replace(
`                    <td className="px-2 py-2 text-center">{m[0]}</td>
                    <td className="px-2 py-2 text-center">{m[1]}</td>
                    <td className="px-2 py-2 text-center">{m[2]}</td>
                    <td className="px-2 py-2 text-center">{m[3]}</td>
                    <td className="px-2 py-2 text-center">{m[4]}</td>
                    <td className="px-2 py-2 text-center">{m[5]}</td>
                    <td className="px-2 py-2 text-center">{m[6]}</td>
                    <td className="px-2 py-2 text-center">{m[7]}</td>
                    <td className="px-2 py-2 text-center">{m[8]}</td>
                    <td className="px-2 py-2 text-center">{m[9]}</td>
                    <td className="px-2 py-2 text-center">{m[10]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[11]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[12]}</td>
                    <td className="px-2 py-2 text-center">{m[13]}</td>
                    <td className="px-2 py-2 text-center">{m[14]}</td>`,
`                    <td className="px-2 py-2 text-center">{m[0]}</td>
                    <td className="px-2 py-2 text-center">{m[1]}</td>
                    <td className="px-2 py-2 text-center">{m[3]}</td>
                    <td className="px-2 py-2 text-center">{m[4]}</td>
                    <td className="px-2 py-2 text-center">{m[5]}</td>
                    <td className="px-2 py-2 text-center">{m[6]}</td>
                    <td className="px-2 py-2 text-center">{m[7]}</td>
                    <td className="px-2 py-2 text-center">{m[8]}</td>
                    <td className="px-2 py-2 text-center">{m[9]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>
                    <td className="px-2 py-2 text-center">{m[13]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[10]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[15]}</td>
                    <td className="px-2 py-2 text-center">{m[16]}</td>`
);

// Note for the Machine dropdown mapping:
content = content.replace(
`{machines.map(m => <option key={m[3]} value={m[3]}>{m[3]}</option>)}`,
`{machines.map(m => <option key={m[4]} value={m[4]}>{m[4]}</option>)}`
);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
