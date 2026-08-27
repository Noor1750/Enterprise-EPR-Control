const fs = require('fs');
const path = './src/lib/sheets.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /\['Brand Name', 'Department', 'Operator Category', 'Process Name', 'Machine Name', 'Standard Unit', 'Specification Per Minutes', 'Standard Speed Per Minutes', 'Utilization %', 'Conversion ratio\/UPS', 'Capacity 16 Hours Pcs', 'Capacity 16 Hours Machine Unit', 'Day Shift Manpower Required', 'Night Shift Manpower Required', 'General Shift Manpower Required', 'Manpower Allocation', 'Overtime', 'Capacity with existing manpower Pcs', 'Capacity with Existing manpower Machine Unit', 'Capacity Count', 'Machine No'\]/,
  `['Brand Name', 'Department', 'Operator Category', 'Process Name', 'Machine Name', 'Standard Unit', 'Specification Per Minutes', 'Standard Speed Per Minutes', 'Utilization %', 'Conversion ratio/UPS', 'Capacity 16 Hours Pcs', 'Capacity 16 Hours Machine Unit', 'Day Shift Manpower Required', 'Night Shift Manpower Required', 'General Shift Manpower Required', 'Manpower Allocation', 'Overtime', 'Capacity with existing manpower Pcs', 'Capacity with Existing manpower Machine Unit', 'Capacity Count', 'Machine No', 'Model Number', 'Serial Number', 'Asset Tag', 'Onboard Date', 'Obsolete Date']`
);

fs.writeFileSync(path, code);
