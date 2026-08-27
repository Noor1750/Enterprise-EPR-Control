const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

const capCountField = `
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Capacity Count</label>
              <select required value={mForm.capacityCount} onChange={e => setMForm({...mForm, capacityCount: e.target.value})} className="w-full px-2 py-1 text-sm border rounded-sm">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>`;

content = content.replace(
  '<option value="Vacancy">Vacancy</option>\\n              </select>\\n            </div>',
  '<option value="Vacancy">Vacancy</option>\\n              </select>\\n            </div>' + capCountField
);

if(!content.includes("Capacity Count")) {
  console.log("Failed to insert, trying fallback replacement");
  content = content.replace(
    '</select>\\n            </div>\\n\\n            <div>\\n              <label className="block text-xs font-medium text-[#73879C] mb-1">Cap 16 Hrs Pcs</label>',
    '</select>\\n            </div>\\n' + capCountField + '\\n\\n            <div>\\n              <label className="block text-xs font-medium text-[#73879C] mb-1">Cap 16 Hrs Pcs</label>'
  );
}

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
