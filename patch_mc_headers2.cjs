const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

content = content.replace(
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap w/ Exist Manpower Unit</th>\\n                  <th className="px-2 py-2 text-right font-semibold text-[#73879C]">Action</th>',
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap w/ Exist Manpower Unit</th>\\n                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap Count</th>\\n                  <th className="px-2 py-2 text-right font-semibold text-[#73879C]">Action</th>'
);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
