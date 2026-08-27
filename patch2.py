import re

content = open('src/components/MachineCapacity.tsx').read()

# 1. Remove from state initializations
content = content.replace("brandName: '', department: '', operatorCategory: '', processName: '', machineName: '',", "brandName: '', department: '', processName: '', machineName: '',")

# 2. Remove from handleEditMachine
to_replace = '''    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      operatorCategory: m[2] || '',
      processName: m[3] || '',
      machineName: m[4] || '','''
replacement = '''    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '','''
content = content.replace(to_replace, replacement)

# 3. Remove from rowData
content = content.replace("mForm.brandName, mForm.department, mForm.operatorCategory, mForm.processName, mForm.machineName,", "mForm.brandName, mForm.department, mForm.processName, mForm.machineName,")

# 4. Replace A:Q with A:P
content = content.replace("MachineCapacity!A${row}:Q${row}", "MachineCapacity!A${row}:P${row}")
content = content.replace("MachineCapacity!A:Q", "MachineCapacity!A:P")

# 5. Remove the input div
input_div_regex = r'\s*<div>\s*<label className="block text-xs font-medium text-\[#73879C\] mb-1">Operator Category</label>\s*<input required placeholder="Operator Category" value=\{mForm\.operatorCategory\} onChange=\{e => setMForm\(\{\.\.\.mForm, operatorCategory: e\.target\.value\}\)\} className="w-full px-2 py-1 text-sm border rounded-sm" />\s*</div>'
content = re.sub(input_div_regex, '', content)

# 6. Remove from table header
content = content.replace('                  <th className="px-2 py-2 text-left font-semibold text-[#73879C]">Operator Category</th>\n', '')

# 7. Remove from table body
content = content.replace('                      <td className="px-2 py-2">{m[2]}</td>\n', '')

open('src/components/MachineCapacity.tsx', 'w').write(content)
