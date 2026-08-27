const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// Center all table headers
content = content.replaceAll('th className="px-2 py-2 text-left font-semibold text-[#73879C]"', 'th className="px-2 py-2 text-center font-semibold text-[#73879C]"');

// Center all table data cells
// They look like <td className="px-2 py-2">
content = content.replaceAll('<td className="px-2 py-2">', '<td className="px-2 py-2 text-center">');

// For the ones with extra classes:
content = content.replaceAll('<td className="px-2 py-2 font-semibold text-[#26B99A]">', '<td className="px-2 py-2 text-center font-semibold text-[#26B99A]">');
content = content.replaceAll('<td className="px-2 py-2 font-semibold text-[#337AB7]">', '<td className="px-2 py-2 text-center font-semibold text-[#337AB7]">');

// Remove Overtime header
content = content.replace('<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Overtime</th>', '');

// Remove Overtime table cell - it's m[13]
content = content.replace('<td className="px-2 py-2 text-center">{m[13]}</td>', '');

// Remove Overtime field from form
const overtimeFormHtml = `            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Overtime</label>
              <select required value={mForm.overtime} onChange={e => setMForm({...mForm, overtime: e.target.value})} className="w-full px-2 py-1 text-sm border rounded-sm">
                <option value="Both Shift">Both Shift</option>
                <option value="One Shift">One Shift</option>
                <option value="0">0</option>
              </select>
            </div>`;
content = content.replace(overtimeFormHtml, '');

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
