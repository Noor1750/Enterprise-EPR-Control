import re

with open('src/components/MachineCapacity.tsx', 'r') as f:
    content = f.read()

content = content.replace('th className="px-2 py-2 text-left font-semibold text-[#73879C]"', 'th className="px-2 py-2 text-center font-semibold text-[#73879C]"')

content = content.replace('<td className="px-2 py-2">', '<td className="px-2 py-2 text-center">')
content = content.replace('<td className="px-2 py-2 font-semibold text-[#26B99A]">', '<td className="px-2 py-2 text-center font-semibold text-[#26B99A]">')
content = content.replace('<td className="px-2 py-2 font-semibold text-[#337AB7]">', '<td className="px-2 py-2 text-center font-semibold text-[#337AB7]">')

content = content.replace('<th className="px-2 py-2 text-center font-semibold text-[#73879C]">Overtime</th>\n', '')
content = content.replace('                    <td className="px-2 py-2 text-center">{m[13]}</td>\n', '')

form_str = """            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Overtime</label>
              <select required value={mForm.overtime} onChange={e => setMForm({...mForm, overtime: e.target.value})} className="w-full px-2 py-1 text-sm border rounded-sm">
                <option value="Both Shift">Both Shift</option>
                <option value="One Shift">One Shift</option>
                <option value="0">0</option>
              </select>
            </div>"""

content = content.replace(form_str, '')

with open('src/components/MachineCapacity.tsx', 'w') as f:
    f.write(content)
