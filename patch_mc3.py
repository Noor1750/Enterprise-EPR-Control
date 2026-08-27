import re

with open('src/components/MachineCapacity.tsx', 'r') as f:
    content = f.read()

content = content.replace('<td className="px-2 py-2 text-center">{m[2]}</td>\n                    <td className="px-2 py-2 text-center">{m[2]}</td>', '<td className="px-2 py-2 text-center">{m[2]}</td>')

with open('src/components/MachineCapacity.tsx', 'w') as f:
    f.write(content)
