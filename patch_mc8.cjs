const fs = require('fs');
let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// Replace "Util %" with "Utilization %"
content = content.replace(
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Util %</th>',
  '<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Utilization %</th>'
);

// Define a simple format function inside the component if not present, or we can just inline it.
// Let's inline it as \`Number(m[10]).toLocaleString() === 'NaN' ? m[10] : Number(m[10]).toLocaleString()\`
// Actually, a helper is cleaner. Wait, let's just inline a simple formatter.

content = content.replace(
  '<td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[10]}</td>',
  '<td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[10] ? Number(m[10]).toLocaleString() : ""}</td>'
);

content = content.replace(
  '<td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[11]}</td>',
  '<td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[11] ? Number(m[11]).toLocaleString() : ""}</td>'
);

content = content.replace(
  '<td className="px-2 py-2 text-center">{m[15]}</td>',
  '<td className="px-2 py-2 text-center">{m[15] ? Number(m[15]).toLocaleString() : ""}</td>'
);

content = content.replace(
  '<td className="px-2 py-2 text-center">{m[16]}</td>',
  '<td className="px-2 py-2 text-center">{m[16] ? Number(m[16]).toLocaleString() : ""}</td>'
);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);
