import { useState } from 'react';
import { getRange } from '../lib/sheets';
import { Loader2, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const getXlsx = () => XLSX;

export default function Reports({ spreadsheetId }: { spreadsheetId: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('Overtime');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [enableMonthFilter, setEnableMonthFilter] = useState(true);

  const sheetsList = [
    'Users',
    'Employees',
    'MachineCapacity',
    'SkillMatrix',
    'Leave',
    'Overtime',
    'Holidays',
    'BestPractices',
    'Supervisors',
  ];

  const generateMachineCapacityReport = async (month?: string) => {
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

  const generateOvertimeReport = async (month: string) => {
    const [otRaw, empRaw] = await Promise.all([
      getRange(spreadsheetId, 'Overtime'),
      getRange(spreadsheetId, 'Employees'),
    ]);
    const otData = otRaw.length > 1 ? otRaw.slice(1) : [];
    const empData = empRaw.length > 1 ? empRaw.slice(1) : [];

    const headers = ['SL', 'ID No', 'Employee Name', 'Designation', 'Section'];
    for (let i = 1; i <= 31; i++) {
      headers.push(i.toString());
    }
    headers.push('Total Hours', 'OT Rate', 'Payable Amount');

    const rows: any[][] = [headers];
    let sl = 1;

    empData.forEach(emp => {
      const id = emp[0];
      if (!id) return;

      const row: any[] = [
        sl++,
        id,
        emp[1] || '', // Name
        emp[2] || '', // Designation
        emp[3] || '', // Department (Section)
      ];

      for (let i = 1; i <= 31; i++) row.push('');

      const empOt = otData.filter(ot => ot[2] === id && ot[1] && ot[1].startsWith(month));

      empOt.forEach(ot => {
        const d = parseInt(ot[1].split('-')[2], 10);
        if (d >= 1 && d <= 31) {
          const currentVal = row[d + 4];
          const addVal = parseFloat(ot[6] || '0');
          if (addVal > 0) {
            row[d + 4] = currentVal ? (parseFloat(currentVal as string) + addVal).toString() : addVal.toString();
          }
        }
      });

      let totalHours = 0;
      for (let i = 1; i <= 31; i++) {
        const val = parseFloat(row[i + 4] || '0');
        if (!isNaN(val) && val > 0) totalHours += val;
      }
      
      if (totalHours > 0) {
        const otRate = parseFloat(emp[8] || '0') || 0;
        const payableAmount = totalHours * otRate;
        row.push(totalHours.toFixed(1), otRate.toFixed(2), payableAmount.toFixed(2));
        rows.push(row);
      }
    });

    return rows;
  };

  const filterDataByMonth = (rawData: string[][], sheetName: string, month: string) => {
    if (!rawData || rawData.length <= 1 || !month) return rawData;
    const header = rawData[0];
    let dateColIdx = -1;
    
    if (sheetName === 'Leave') dateColIdx = 5; // From_Date
    else if (sheetName === 'Holidays') dateColIdx = 0; // Holiday_Date
    else if (sheetName === 'BestPractices') dateColIdx = 1; // Date

    if (dateColIdx === -1) return rawData;

    return [
      header,
      ...rawData.slice(1).filter(row => {
        const d = row[dateColIdx];
        return d && d.startsWith(month);
      })
    ];
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dataToExport: any[][] = [];

      if (selectedSheet === 'Overtime' && enableMonthFilter && selectedMonth) {
        dataToExport = await generateOvertimeReport(selectedMonth);
      } else if (selectedSheet === 'MachineCapacity') {
        dataToExport = await generateMachineCapacityReport();
      } else {
        const rawData = await getRange(spreadsheetId, selectedSheet);
        
        if (!rawData || rawData.length === 0) {
          alert('No data found in this sheet.');
          return;
        }

        if (enableMonthFilter && selectedMonth) {
           dataToExport = filterDataByMonth(rawData, selectedSheet, selectedMonth);
        } else {
           dataToExport = rawData;
        }
      }

      if (dataToExport.length <= 1 && selectedSheet !== 'Overtime') {
         alert('No data found for the selected criteria.');
         return;
      }

      const xlsx = getXlsx();
      const ws = xlsx.utils.aoa_to_sheet(dataToExport);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, selectedSheet);
      
      const fileName = enableMonthFilter && selectedMonth 
        ? `${selectedSheet}_Export_${selectedMonth}.xlsx`
        : `${selectedSheet}_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      xlsx.writeFile(wb, fileName);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to export data: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const xlsx = getXlsx();
      const wb = xlsx.utils.book_new();
      
      const promises = sheetsList.map(async (sheet) => {
        try {
          let data: any[][] = [];
          if (sheet === 'Overtime' && enableMonthFilter && selectedMonth) {
            data = await generateOvertimeReport(selectedMonth);
          } else if (sheet === 'MachineCapacity') {
            data = await generateMachineCapacityReport();
          } else {
            const raw = await getRange(spreadsheetId, sheet);
            if (raw && raw.length > 0) {
               data = (enableMonthFilter && selectedMonth) ? filterDataByMonth(raw, sheet, selectedMonth) : raw;
            }
          }

          if (data && data.length > 0) {
            const ws = xlsx.utils.aoa_to_sheet(data);
            xlsx.utils.book_append_sheet(wb, ws, sheet);
          }
        } catch (e) {
          console.error(`Failed to fetch sheet ${sheet}`, e);
        }
      });

      await Promise.all(promises);
      
      if (wb.SheetNames.length === 0) {
        alert('No data found to export.');
        return;
      }

      const fileName = enableMonthFilter && selectedMonth 
        ? `ERP_Full_Export_${selectedMonth}.xlsx`
        : `ERP_Full_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      xlsx.writeFile(wb, fileName);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to export full database: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-medium text-[#73879C] mb-6">Data Reports & Exports</h1>
        
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
          <div className="p-6 border-b border-[#E6E9ED]">
            <h2 className="text-lg font-semibold flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-[#337AB7]" />
              Export Specific Module Data
            </h2>
            <p className="text-[#73879C] text-sm mt-1">Select a module to export its data. Overtime will export in a daily crosstab format if a month is selected.</p>
          </div>
          
          <div className="p-6 bg-[#F9F9F9]">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-[#73879C] mb-1">Select Module</label>
                <select 
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sheetsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="flex-1 w-full">
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-[#73879C]">Filter by Month</label>
                  <label className="inline-flex items-center text-xs">
                    <input 
                      type="checkbox" 
                      checked={enableMonthFilter} 
                      onChange={(e) => setEnableMonthFilter(e.target.checked)} 
                      className="mr-1"
                    />
                    Enable
                  </label>
                </div>
                <input 
                  type="month"
                  disabled={!enableMonthFilter}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div className="w-full sm:w-auto">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2 bg-[#337AB7] text-white rounded-lg hover:bg-[#286090] disabled:opacity-50 transition-colors"
                >
                  {isExporting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                  Export {selectedSheet}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">
        <div className="p-6 border-b border-[#E6E9ED]">
          <h2 className="text-lg font-semibold flex items-center">
            <Download className="w-5 h-5 mr-2 text-green-600" />
            Full Database Export
          </h2>
          <p className="text-[#73879C] text-sm mt-1">Export all modules into a single Excel workbook. If month filter is enabled above, it will apply to supported sheets.</p>
        </div>
        
        <div className="p-6 bg-[#F9F9F9] flex items-center justify-between flex-col sm:flex-row gap-4">
          <div className="text-sm text-[#73879C]">
            <strong>Included Sheets:</strong> Users, Employees, MachineCapacity, SkillMatrix, Leave, Overtime (crosstab), Holidays, BestPractices, Supervisors
          </div>
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-[#26B99A] text-white rounded-lg font-medium hover:bg-[#169F85] disabled:opacity-50 transition-colors shadow-sm"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
            Export Entire Database
          </button>
        </div>
      </div>
    </div>
  );
}
