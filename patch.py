import re

content = open('src/components/MachineCapacity.tsx').read()

# Update handleAddMachine
new_handleAddMachine = """  const handleAddMachine = async (e: any) => {
    e.preventDefault();
    try {
      const speed = Number(mForm.standardSpeedPerMin) || 0;
      const util = Number(mForm.utilization) || 0;
      const conv = Number(mForm.conversionRatio) || 0;
      
      const capacity16MachineUnit = speed * 60 * 16 * (util / 100);
      const capacity16Pcs = capacity16MachineUnit * conv;
      
      const multiplier = mForm.manpowerAllocation === 'Both Shift' ? 1 : mForm.manpowerAllocation === 'One Shift' ? 0.5 : 0;
      const existCapUnit = capacity16MachineUnit * multiplier;
      const existCapPcs = capacity16Pcs * multiplier;

      const rowData = [
        mForm.brandName, mForm.department, mForm.operatorCategory, mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, `${util}%`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(), mForm.perShiftManpowerRequired,
        mForm.manpowerAllocation, mForm.overtime, Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString()
      ];

      if (editingMachineIndex !== null) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, `MachineCapacity!A${row}:Q${row}`, [rowData]);
        setEditingMachineIndex(null);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:Q', [rowData]);
      }
      setMForm({
        brandName: '', department: '', operatorCategory: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''
      });
      loadData();
    } catch (err) { alert('Failed'); }
  };"""

content = re.sub(r'  const handleAddMachine = async.*?catch \(err\) \{ alert\(\'Failed\'\); \}\n  \};\n', new_handleAddMachine + '\n', content, flags=re.DOTALL)

# Add read-only variables inside component
read_only_vars = """
  const speedVal = Number(mForm.standardSpeedPerMin) || 0;
  const utilVal = Number(mForm.utilization) || 0;
  const convVal = Number(mForm.conversionRatio) || 0;
  const autoCap16Unit = speedVal * 60 * 16 * (utilVal / 100);
  const autoCap16Pcs = autoCap16Unit * convVal;
  const autoMultiplier = mForm.manpowerAllocation === 'Both Shift' ? 1 : mForm.manpowerAllocation === 'One Shift' ? 0.5 : 0;
  const autoExistUnit = autoCap16Unit * autoMultiplier;
  const autoExistPcs = autoCap16Pcs * autoMultiplier;
"""

content = content.replace("return (\n    <div className=\"p-8", read_only_vars + "\n  return (\n    <div className=\"p-8")

# Replace the two manual input fields with the 4 auto display fields
form_inputs_replacement = """            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Cap 16 Hrs Pcs</label>
              <div className="w-full px-2 py-1 text-sm border rounded-sm bg-gray-50 text-gray-500 font-semibold">{Math.round(autoCap16Pcs).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Cap 16 Hrs Unit</label>
              <div className="w-full px-2 py-1 text-sm border rounded-sm bg-gray-50 text-gray-500 font-semibold">{Math.round(autoCap16Unit).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Exist Cap Pcs</label>
              <div className="w-full px-2 py-1 text-sm border rounded-sm bg-gray-50 text-[#26B99A] font-semibold">{Math.round(autoExistPcs).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#73879C] mb-1">Exist Cap Unit</label>
              <div className="w-full px-2 py-1 text-sm border rounded-sm bg-gray-50 text-[#337AB7] font-semibold">{Math.round(autoExistUnit).toLocaleString()}</div>
            </div>"""

content = re.sub(r'            <div>\n              <label className="block text-xs font-medium text-\[#73879C\] mb-1">Cap. w/ Exist Manpower Pcs</label>.*?</div>\n            <div>\n              <label className="block text-xs font-medium text-\[#73879C\] mb-1">Cap. w/ Exist Manpower Unit</label>.*?</div>', form_inputs_replacement, content, flags=re.DOTALL)

open('src/components/MachineCapacity.tsx', 'w').write(content)

