const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

content = content.replace(
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap w/ Exist Manpower Unit</th>\\n                  <th className="px-2 py-2 text-right"></th>',
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap w/ Exist Manpower Unit</th>\\n                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap Count</th>\\n                  <th className="px-2 py-2 text-right"></th>'
);

content = content.replace(
  '<td className="px-2 py-2 text-center">{m[16] ? Number(m[16]).toLocaleString() : ""}</td>\\n                    <td className="px-2 py-2 text-right">',
  '<td className="px-2 py-2 text-center">{m[16] ? Number(m[16]).toLocaleString() : ""}</td>\\n                    <td className="px-2 py-2 text-center">{m[17] || "Yes"}</td>\\n                    <td className="px-2 py-2 text-right">'
);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
