const fs = require('fs');
let code = fs.readFileSync('src/components/shift/MachineAllocationsTab.tsx', 'utf8');

code = code.replace(
  `          await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', a.oldId, {
            10: 'Inactive',
            11: 'System',
            12: nowStr
          });`,
  `          const existingRow = props.assignments.find((r: any) => r[0] === a.oldId);
          if (existingRow) {
             const newRow = [...existingRow];
             newRow[10] = 'Inactive';
             newRow[11] = 'System';
             newRow[12] = nowStr;
             await updateRowByPrimaryKey(spreadsheetId, 'ShiftAssignments', a.oldId, newRow);
          }`
);

fs.writeFileSync('src/components/shift/MachineAllocationsTab.tsx', code);
