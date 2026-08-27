const fs = require('fs');
const path = './src/components/MachineCapacity.tsx';
let code = fs.readFileSync(path, 'utf8');

const targetHeader = `<th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Action</th>`;
const replacementHeader = `                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Model No.</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Serial No.</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Asset Tag</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Onboard</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Obsolete</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Action</th>`;

const targetCell = `<td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleEditMachine(i, m)}`;
const replacementCell = `                    <td className="px-4 py-3 text-gray-600">{m[21]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[22]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[23]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[24]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[25]}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-medium whitespace-nowrap">{calculateMachineAge(m[24], new Date().toISOString())?.formatted || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider \${getMachineStatus(m[24], m[25], new Date().toISOString()) === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}\`}>
                        {getMachineStatus(m[24], m[25], new Date().toISOString())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleEditMachine(i, m)}`;
                        
code = code.replace(targetHeader, replacementHeader);
code = code.replace(targetCell, replacementCell);

// Also fix colspan in "No machines found" row
code = code.replace(`colSpan={12}`, `colSpan={19}`);

fs.writeFileSync(path, code);
