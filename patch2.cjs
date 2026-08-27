const fs = require('fs');
const path = './src/components/MachineCapacity.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldHandleAdd = `  const handleAddMachine = async (e: any) => {
    e.preventDefault();
    try {
      const speed = Number(mForm.standardSpeedPerMin) || 0;
      const util = Number(mForm.utilization) || 0;
      const conv = Number(mForm.conversionRatio) || 0;
      const isKonica = mForm.machineName.toLowerCase().includes('konica');
      
      const capacity16MachineUnit = speed * 60 * 16 * (util / 100);
      const capacity16Pcs = isKonica
        ? (speed / 2) * (util / 100) * 16 * 60 * conv
        : capacity16MachineUnit * conv;
        
      const multiplier = mForm.manpowerAllocation === 'Both Shift' ? 1 : mForm.manpowerAllocation === 'One Shift' ? 0.5 : 0;
      const existCapUnit = capacity16MachineUnit * multiplier;
      const existCapPcs = capacity16Pcs * multiplier;

      const rowData = [
        mForm.brandName, mForm.department, '', mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(),
        mForm.aShiftManpowerRequired, mForm.bShiftManpowerRequired, mForm.generalShiftManpowerRequired,
        mForm.manpowerAllocation, '',
        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString(),
        mForm.capacityCount
      ];

      if (editingMachineIndex !== null) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, \`MachineCapacity!A\${row}:T\${row}\`, [rowData]);
        setEditingMachineIndex(null);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:T', [rowData]);
      }
      setMForm({
        brandName: '', department: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
        manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes'
      });
      setIsMachineModalOpen(false);
      loadData();
    } catch (err) { alert('Failed'); }
  };`;

const newHandleAdd = `  const handleAddMachine = async (e: any) => {
    e.preventDefault();
    try {
      if (mForm.onboardDate) {
        const onboard = new Date(mForm.onboardDate);
        if (onboard > new Date()) {
          alert("Machine Onboard Date cannot be later than today.");
          return;
        }
      }
      if (mForm.onboardDate && mForm.obsoleteDate) {
        if (new Date(mForm.obsoleteDate) < new Date(mForm.onboardDate)) {
           alert("Machine Obsolete Date cannot be earlier than Machine Onboard Date.");
           return;
        }
      }
      
      const isDuplicateSerial = machines.some((m, idx) => m[22] === mForm.serialNumber && mForm.serialNumber && idx !== editingMachineIndex);
      if (isDuplicateSerial) {
         alert("Serial Number already exists. Please check the machine record.");
         return;
      }
      
      const isDuplicateAsset = machines.some((m, idx) => m[23] === mForm.assetTag && mForm.assetTag && idx !== editingMachineIndex);
      if (isDuplicateAsset) {
         alert("Asset Tag already exists. Please check the machine record.");
         return;
      }

      const speed = Number(mForm.standardSpeedPerMin) || 0;
      const util = Number(mForm.utilization) || 0;
      const conv = Number(mForm.conversionRatio) || 0;
      const isKonica = mForm.machineName.toLowerCase().includes('konica');
      
      const capacity16MachineUnit = speed * 60 * 16 * (util / 100);
      const capacity16Pcs = isKonica
        ? (speed / 2) * (util / 100) * 16 * 60 * conv
        : capacity16MachineUnit * conv;
        
      const multiplier = mForm.manpowerAllocation === 'Both Shift' ? 1 : mForm.manpowerAllocation === 'One Shift' ? 0.5 : 0;
      const existCapUnit = capacity16MachineUnit * multiplier;
      const existCapPcs = capacity16Pcs * multiplier;

      const rowData = [
        mForm.brandName, mForm.department, '', mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, \`\${util}%\`, mForm.conversionRatio,
        Math.round(capacity16Pcs).toString(), Math.round(capacity16MachineUnit).toString(),
        mForm.aShiftManpowerRequired, mForm.bShiftManpowerRequired, mForm.generalShiftManpowerRequired,
        mForm.manpowerAllocation, '',
        Math.round(existCapPcs).toString(), Math.round(existCapUnit).toString(),
        mForm.capacityCount,
        editingMachineIndex !== null ? (machines[editingMachineIndex][20] || '') : \`MC-\${Date.now().toString().slice(-6)}\`,
        mForm.modelNumber, mForm.serialNumber, mForm.assetTag, mForm.onboardDate, mForm.obsoleteDate
      ];

      if (editingMachineIndex !== null) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, \`MachineCapacity!A\${row}:Z\${row}\`, [rowData]);
        setEditingMachineIndex(null);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:Z', [rowData]);
      }
      setMForm({
        brandName: '', department: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
        manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
        modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
      });
      setIsMachineModalOpen(false);
      loadData();
    } catch (err) { alert('Failed'); }
  };`;
  
code = code.replace(oldHandleAdd, newHandleAdd);
fs.writeFileSync(path, code);
