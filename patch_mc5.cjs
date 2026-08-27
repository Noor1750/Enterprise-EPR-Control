const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// Fix the spreadsheet append to O
content = content.replace(/'MachineCapacity!A:P'/g, "'MachineCapacity!A:O'");
content = content.replace(/\`MachineCapacity!A\$\{row\}:P\$\{row\}\`/g, "\`MachineCapacity!A${row}:O${row}\`");

// Fix the padding to 15
content = content.replace(/while \(padded\.length < 16\) padded\.push\(''\);/g, "while (padded.length < 15) padded.push('');");

// Fix rowData to remove overtime
const oldRowData = `      const rowData = [
        mForm.brandName, mForm.department, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), mForm.perShiftManpowerRequired,
        mForm.manpowerAllocation, mForm.overtime, Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`;
const newRowData = `      const rowData = [
        mForm.brandName, mForm.department, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), mForm.perShiftManpowerRequired,
        mForm.manpowerAllocation, Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];`;
content = content.replace(oldRowData, newRowData);

// Also fix form mapping from m
const oldMapping = `      perShiftManpowerRequired: m[11] || '',
      manpowerAllocation: m[12] || 'Both Shift',
      overtime: m[13] || 'One Shift',
      capacityExistingManpowerPcs: m[14] || '',
      capacityExistingManpowerMachineUnit: m[15] || ''`;
const newMapping = `      perShiftManpowerRequired: m[11] || '',
      manpowerAllocation: m[12] || 'Both Shift',
      capacityExistingManpowerPcs: m[13] || '',
      capacityExistingManpowerMachineUnit: m[14] || ''`;
content = content.replace(oldMapping, newMapping);

const oldSetMForm = `      conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift', overtime: 'One Shift',
      capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''`;
const newSetMForm = `      conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift',
      capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''`;
content = content.replaceAll(oldSetMForm, newSetMForm);

// Now fix the UI table order
const oldThead = `                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>`;
const newThead = `                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>`;
content = content.replace(oldThead, newThead);

const oldTbody = `                    <td className="px-2 py-2 text-center">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[9]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[10]}</td>
                    <td className="px-2 py-2 text-center">{m[14]}</td>
                    <td className="px-2 py-2 text-center">{m[15]}</td>`;
const newTbody = `                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[9]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[10]}</td>
                    <td className="px-2 py-2 text-center">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>
                    <td className="px-2 py-2 text-center">{m[13]}</td>
                    <td className="px-2 py-2 text-center">{m[14]}</td>`;
content = content.replace(oldTbody, newTbody);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);

