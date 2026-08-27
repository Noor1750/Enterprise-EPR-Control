const fs = require('fs');
const path = './src/components/MachineCapacity.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldHandleEdit = `  const handleEditMachine = (index: number, m: string[]) => {
    setIsMachineModalOpen(true);
    setEditingMachineIndex(index);
    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '',
      standardUnit: m[5] || '',
      specificationPerMin: m[6] || '',
      standardSpeedPerMin: m[7] || '',
      utilization: (m[8] || '').replace('%', ''),
      conversionRatio: m[9] || '',
      aShiftManpowerRequired: m[12] || '',
      bShiftManpowerRequired: m[13] || '',
      generalShiftManpowerRequired: m[14] || '',
      manpowerAllocation: m[15] || 'Both Shift',
      overtime: 'One Shift',
      capacityExistingManpowerPcs: m[17] || '',
      capacityExistingManpowerMachineUnit: m[18] || '',
      capacityCount: m[19] || 'Yes'
    });
  };

  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setIsMachineModalOpen(false);
    setMForm({
      brandName: '', department: '', processName: '', machineName: '',
      standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
      conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
      manpowerAllocation: 'Both Shift', overtime: 'One Shift',
      capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes'
    });
  };`;

const newHandleEdit = `  const handleEditMachine = (index: number, m: string[]) => {
    setIsMachineModalOpen(true);
    setEditingMachineIndex(index);
    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '',
      standardUnit: m[5] || '',
      specificationPerMin: m[6] || '',
      standardSpeedPerMin: m[7] || '',
      utilization: (m[8] || '').replace('%', ''),
      conversionRatio: m[9] || '',
      aShiftManpowerRequired: m[12] || '',
      bShiftManpowerRequired: m[13] || '',
      generalShiftManpowerRequired: m[14] || '',
      manpowerAllocation: m[15] || 'Both Shift',
      overtime: 'One Shift',
      capacityExistingManpowerPcs: m[17] || '',
      capacityExistingManpowerMachineUnit: m[18] || '',
      capacityCount: m[19] || 'Yes',
      modelNumber: m[21] || '',
      serialNumber: m[22] || '',
      assetTag: m[23] || '',
      onboardDate: m[24] || '',
      obsoleteDate: m[25] || ''
    });
  };

  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setIsMachineModalOpen(false);
    setMForm({
      brandName: '', department: '', processName: '', machineName: '',
      standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
      conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
      manpowerAllocation: 'Both Shift', overtime: 'One Shift',
      capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
      modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
    });
  };`;

code = code.replace(oldHandleEdit, newHandleEdit);
fs.writeFileSync(path, code);
