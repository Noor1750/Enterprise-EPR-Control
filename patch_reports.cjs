const fs = require('fs');
let content = fs.readFileSync('src/components/Reports.tsx', 'utf8');

// Insert generateMachineCapacityReport function
const newFunc = `  const generateMachineCapacityReport = async (month?: string) => {
    let raw = await getRange(spreadsheetId, 'MachineCapacity');
    if (!raw || raw.length === 0) return [];
    
    if (month) {
        // Machine capacity doesn't have a date by default, but if you want to filter, you might not be able to.
        // We will just process all data since MachineCapacity isn't strictly month-based.
        // Or if it is filtered, we apply month filter. But for now let's just return the processed array.
    }
    
    // Process the data to remove "Operator Category" (index 2) and "Overtime" (index 14)
    // We assume the header in the sheet might be the full 17 columns.
    return raw.map(row => {
        // If the row is from the 17-column format:
        if (row.length >= 15) {
             const newRow = [...row];
             // Ensure it has 17 elements just in case
             while (newRow.length < 17) newRow.push('');
             
             // Remove index 14 first so it doesn't shift index 2
             newRow.splice(14, 1);
             newRow.splice(2, 1);
             return newRow;
        }
        return row;
    });
  };

  const generateOvertimeReport`;
content = content.replace("  const generateOvertimeReport", newFunc);

// Update handleExport
const oldHandleExport = `      if (selectedSheet === 'Overtime' && enableMonthFilter && selectedMonth) {
        dataToExport = await generateOvertimeReport(selectedMonth);
      } else {
        const rawData = await getRange(spreadsheetId, selectedSheet);
        
        if (!rawData || rawData.length === 0) {`;

const newHandleExport = `      if (selectedSheet === 'Overtime' && enableMonthFilter && selectedMonth) {
        dataToExport = await generateOvertimeReport(selectedMonth);
      } else if (selectedSheet === 'MachineCapacity') {
        dataToExport = await generateMachineCapacityReport();
      } else {
        const rawData = await getRange(spreadsheetId, selectedSheet);
        
        if (!rawData || rawData.length === 0) {`;

content = content.replace(oldHandleExport, newHandleExport);

// Update handleExportAll
const oldHandleExportAll = `          if (sheet === 'Overtime' && enableMonthFilter && selectedMonth) {
            data = await generateOvertimeReport(selectedMonth);
          } else {
            const raw = await getRange(spreadsheetId, sheet);
            if (raw && raw.length > 0) {
               data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, sheet, selectedMonth) : raw;
            }
          }`;

const newHandleExportAll = `          if (sheet === 'Overtime' && enableMonthFilter && selectedMonth) {
            data = await generateOvertimeReport(selectedMonth);
          } else if (sheet === 'MachineCapacity') {
            data = await generateMachineCapacityReport();
          } else {
            const raw = await getRange(spreadsheetId, sheet);
            if (raw && raw.length > 0) {
               data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, sheet, selectedMonth) : raw;
            }
          }`;

content = content.replace(oldHandleExportAll, newHandleExportAll);

fs.writeFileSync('src/components/Reports.tsx', content);
