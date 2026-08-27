import re

with open('src/components/MachineCapacity.tsx', 'r') as f:
    content = f.read()

# Rearrange table headers
old_thead = """                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>"""

new_thead = """                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Per Shift Manpower</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Manpower Alloc.</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Pcs</th>
                  <th className="px-2 py-2 text-center font-semibold text-[#73879C]">Cap 16 Hrs Unit</th>"""
content = content.replace(old_thead, new_thead)

# Rearrange table data cells
old_tbody = """                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[9]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[10]}</td>
                    <td className="px-2 py-2 text-center">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>"""

new_tbody = """                    <td className="px-2 py-2 text-center">{m[11]}</td>
                    <td className="px-2 py-2 text-center">{m[12]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#26B99A]">{m[9]}</td>
                    <td className="px-2 py-2 text-center font-semibold text-[#337AB7]">{m[10]}</td>"""
content = content.replace(old_tbody, new_tbody)

with open('src/components/MachineCapacity.tsx', 'w') as f:
    f.write(content)
