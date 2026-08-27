import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { updateRange } from '../../lib/sheets';
import { format } from 'date-fns';

interface BulkUploadOTModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  allEmployees: string[][];
  otData: string[][];
  onSuccess: () => void;
}

export function BulkUploadOTModal({
  isOpen,
  onClose,
  spreadsheetId,
  allEmployees,
  otData,
  onSuccess
}: BulkUploadOTModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ id: string, name: string, date: string, ot: string, valid: boolean, error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Parse rows as array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
        
        // Ensure there is data
        if (data.length < 2) {
          throw new Error('File is empty or missing data rows.');
        }

        // Validate headers roughly
        const headers = (data[0] || []).map(h => String(h).trim().toUpperCase());
        const idIdx = headers.findIndex(h => h === 'ID' || h === 'EMP ID');
        const nameIdx = headers.findIndex(h => h === 'NAME');
        const dateIdx = headers.findIndex(h => h === 'DATE');
        const otIdx = headers.findIndex(h => h === 'OT' || h === 'OVERTIME');

        if (idIdx === -1 || dateIdx === -1 || otIdx === -1) {
          throw new Error('Missing required columns. Expected: ID, Date, OT');
        }

        const parsedPreview = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || !row[idIdx] && !row[dateIdx] && !row[otIdx]) continue;
          
          let empId = String(row[idIdx] || '').trim();
          let dateRaw = String(row[dateIdx] || '').trim();
          let otRaw = String(row[otIdx] || '').trim();
          let nameRaw = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';

          let valid = true;
          let error = '';

          if (!empId) {
            valid = false;
            error = 'Missing Employee ID';
          }

          if (!dateRaw) {
            valid = false;
            error = error ? error + ', Missing Date' : 'Missing Date';
          } else {
            // Attempt standard JS parse first
            let parsedDate = new Date(dateRaw);
            
            // If invalid, try parsing as DD-MM-YYYY or DD/MM/YYYY
            if (isNaN(parsedDate.getTime()) && typeof dateRaw === 'string') {
              const parts = dateRaw.split(/[-/]/);
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                parsedDate = new Date(year, month, day);
              }
            }

            // Handle Excel serial date if still invalid (or if raw: true was passed somehow)
            if (isNaN(parsedDate.getTime()) && !isNaN(Number(dateRaw))) {
              const excelEpoch = new Date(Date.UTC(1899, 11, 30));
              parsedDate = new Date(excelEpoch.getTime() + Number(dateRaw) * 86400000);
            }

            if (isNaN(parsedDate.getTime())) {
              valid = false;
              error = error ? error + ', Invalid Date' : 'Invalid Date';
            } else {
              dateRaw = format(parsedDate, 'yyyy-MM-dd');
            }
          }

          if (!otRaw || isNaN(parseFloat(otRaw))) {
            valid = false;
            error = error ? error + ', Invalid OT' : 'Invalid OT Hours';
          }

          const empExists = allEmployees.find(e => String(e[0] || '').trim().toUpperCase() === empId.toUpperCase());
          if (!empExists && valid) {
             valid = false;
             error = `Employee ID ${empId} not found in directory`;
          }

          parsedPreview.push({
            id: empId,
            name: nameRaw || (empExists ? empExists[1] : 'Unknown'),
            date: dateRaw,
            ot: otRaw,
            valid,
            error
          });
        }

        setPreviewData(parsedPreview);
        setIsProcessing(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to parse Excel file.');
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async () => {
    if (previewData.length === 0) return;
    const validRows = previewData.filter(r => r.valid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows to import.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. We have otData which is an array of rows from Google Sheets (excluding header)
      //    We need to update existing ones, or push new ones.
      // Let's create a map of existing OT records by EMP_ID + DATE
      // We will rebuild the entire OT sheet data
      
      const newOtDataList = [...otData];
      
      for (const row of validRows) {
        const emp = allEmployees.find(e => String(e[0] || '').trim().toUpperCase() === row.id.toUpperCase());
        if (!emp) continue; // safety check
        
        const empId = emp[0];
        const empName = emp[1];
        const empDesig = emp[2];
        const empSection = emp[3];

        const existingIndex = newOtDataList.findIndex(ot => 
          String(ot[2] || '').trim().toUpperCase() === row.id.toUpperCase() && 
          ot[1] === row.date
        );

        if (existingIndex !== -1) {
          // Update existing
          newOtDataList[existingIndex][6] = row.ot;
        } else {
          // Append new
          const otId = `OT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          newOtDataList.push([
            otId,
            row.date,
            empId,
            empName,
            empDesig,
            empSection,
            row.ot
          ]);
        }
      }

      // We have updated newOtDataList, now we need to push it back
      // The header is ['OT_ID', 'Date', 'Emp_ID', 'Name', 'Designation', 'Section', 'Hours']
      const header = ['OT_ID', 'Date', 'Emp_ID', 'Name', 'Designation', 'Section', 'Hours'];
      const rowsToSave = [header, ...newOtDataList];
      
      await updateRange(spreadsheetId, 'Overtime!A:G', rowsToSave);
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update Overtime records.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = previewData.filter(d => d.valid).length;
  const invalidCount = previewData.filter(d => !d.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk Upload Overtime</h2>
              <p className="text-xs text-slate-500">Upload an Excel/CSV file with columns: ID, Name, Date, OT</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {previewData.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">Select an Excel or CSV file</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                File must contain headers: <span className="font-mono bg-slate-200 px-1 rounded text-slate-700">ID</span>, 
                <span className="font-mono bg-slate-200 px-1 rounded text-slate-700 ml-1">Name</span>, 
                <span className="font-mono bg-slate-200 px-1 rounded text-slate-700 ml-1">Date</span>, 
                <span className="font-mono bg-slate-200 px-1 rounded text-slate-700 ml-1">OT</span>
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {isProcessing ? 'Processing...' : 'Browse File'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-bold">{validCount}</span> valid rows
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-bold">{invalidCount}</span> invalid rows
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-4 py-2 border-b border-slate-200 w-8 text-center">#</th>
                        <th className="px-4 py-2 border-b border-slate-200">ID</th>
                        <th className="px-4 py-2 border-b border-slate-200">Name</th>
                        <th className="px-4 py-2 border-b border-slate-200">Date</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-right">OT Hours</th>
                        <th className="px-4 py-2 border-b border-slate-200">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'bg-white' : 'bg-rose-50/50'}>
                          <td className="px-4 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-2 font-mono font-medium text-slate-700">{row.id}</td>
                          <td className="px-4 py-2 text-slate-600">{row.name}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{row.date}</td>
                          <td className="px-4 py-2 font-mono font-bold text-slate-800 text-right">{row.ot}</td>
                          <td className="px-4 py-2">
                            {row.valid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full" title={row.error}>
                                <AlertTriangle className="w-3 h-3" /> {row.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={() => {
              if (previewData.length > 0) {
                setPreviewData([]);
                setErrorMsg(null);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {previewData.length > 0 ? 'Clear & Re-upload' : 'Cancel'}
          </button>
          
          <button
            onClick={processImport}
            disabled={isProcessing || validCount === 0}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isProcessing ? 'Importing...' : `Import ${validCount} Records`}
          </button>
        </div>
      </div>
    </div>
  );
}
