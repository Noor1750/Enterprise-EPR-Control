const fs = require('fs');
let content = fs.readFileSync('src/lib/sheets.ts', 'utf8');

content = content.replace(
  "{ range: 'MachineCapacity!A1:Q1', values: [['Brand Name', 'Department', 'Operator Category', 'Process Name', 'Machine Name', 'Standard Unit', 'Specification Per Minutes', 'Standard Speed Per Minutes', 'Utilization %', 'Conversion ratio/UPS', 'Capacity 16 Hours Pcs', 'Capacity 16 Hours Machine Unit', 'Per Shift Manpower Required', 'Manpower Allocation', 'Overtime', 'Capacity with existing manpower Pcs', 'Capacity with Existing manpower Machine Unit']] },",
  "{ range: 'MachineCapacity!A1:R1', values: [['Brand Name', 'Department', 'Operator Category', 'Process Name', 'Machine Name', 'Standard Unit', 'Specification Per Minutes', 'Standard Speed Per Minutes', 'Utilization %', 'Conversion ratio/UPS', 'Capacity 16 Hours Pcs', 'Capacity 16 Hours Machine Unit', 'Per Shift Manpower Required', 'Manpower Allocation', 'Overtime', 'Capacity with existing manpower Pcs', 'Capacity with Existing manpower Machine Unit', 'Capacity Count']] },"
);

fs.writeFileSync('src/lib/sheets.ts', content);
