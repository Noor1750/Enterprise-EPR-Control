import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, 
  XCircle, ArrowRight, RefreshCw, FileText, Check, AlertCircle, Eye, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Employee, KPIRecord, ExcelImportRow, ExcelImportSummary, 
  normalizeMonth, normalizeDate, parsePercentage
} from './types';
import { calculatePerformanceRating } from '../../lib/kpiEngine';
import KPIModalNotification, { NotificationModalProps } from './KPIModalNotification';

interface KPIExcelUploadProps {
  employees: Employee[];
  kpiRecords: KPIRecord[];
  onConfirmImport: (recordsToInsert: KPIRecord[], recordsToUpdate: KPIRecord[]) => Promise<void>;
  onNavigateToRecords: () => void;
}

export default function KPIExcelUpload({
  employees,
  kpiRecords,
  onConfirmImport,
  onNavigateToRecords
}: KPIExcelUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ExcelImportSummary | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | 'matched' | 'unmatched' | 'update' | 'new' | 'invalid'>('all');

  // Modal Notification state
  const [modalConfig, setModalConfig] = useState<NotificationModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Fast Employee Lookup Map by uppercase ID
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => {
      if (e.id) map.set(e.id.trim().toUpperCase(), e);
    });
    return map;
  }, [employees]);

  // Fast KPI Lookup Map by `${EmployeeID}_${Month}`
  const existingKpiMap = useMemo(() => {
    const map = new Map<string, KPIRecord>();
    kpiRecords.forEach(k => {
      const key = `${k.employeeId.trim().toUpperCase()}_${k.month.trim()}`;
      map.set(key, k);
    });
    return map;
  }, [kpiRecords]);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Employee ID': 'EMP001',
        'Month': 'January 2026',
        'Date': '2026-01-31',
        'Plan (%)': 100,
        'Achievement (%)': 95,
        'Rating': 4
      },
      {
        'Employee ID': 'EMP002',
        'Month': 'January 2026',
        'Date': '2026-01-31',
        'Plan (%)': 90,
        'Achievement (%)': 88,
        'Rating': 3
      },
      {
        'Employee ID': 'EMP003',
        'Month': 'January 2026',
        'Date': '2026-01-31',
        'Plan (%)': 100,
        'Achievement (%)': 98,
        'Rating': 5
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Employee ID
      { wch: 18 }, // Month
      { wch: 14 }, // Date
      { wch: 12 }, // Plan (%)
      { wch: 16 }, // Achievement (%)
      { wch: 10 }, // Rating
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly_KPI_Template');
    XLSX.writeFile(wb, 'Monthly_KPI_Import_Template.xlsx');
  };

  // Process uploaded Excel file
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setModalConfig({
            isOpen: true,
            type: 'error',
            title: 'Empty Excel File',
            message: 'The uploaded file does not contain any data rows.',
            onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
          setIsProcessingFile(false);
          return;
        }

        // Process and validate rows
        const parsedRows: ExcelImportRow[] = [];
        const unmatchedIdsSet = new Set<string>();

        rawJson.forEach((row, index) => {
          const rowNumber = index + 2; // header is row 1
          
          // Extract Employee ID (support various column header aliases)
          const rawId = String(
            row['Employee ID'] || 
            row['Employee_ID'] || 
            row['EmployeeId'] || 
            row['ID_No'] || 
            row['ID'] || 
            row['id'] || ''
          ).trim();

          // Extract Month
          const rawMonth = row['Month'] || row['Month_Year'] || row['Period'] || row['month'] || '';
          const normalizedMonth = normalizeMonth(rawMonth);

          // Extract Date
          const rawDate = row['Date'] || row['date'] || row['Entry_Date'] || '';
          const normalizedDate = normalizeDate(rawDate, normalizedMonth);

          // Extract Plan %
          const rawPlan = row['Plan (%)'] ?? row['Plan'] ?? row['Plan %'] ?? row['Target'] ?? 100;
          const planVal = parsePercentage(rawPlan);

          // Extract Achievement %
          const rawAch = row['Achievement (%)'] ?? row['Achievement'] ?? row['Achievement %'] ?? row['Actual'] ?? 0;
          const achVal = parsePercentage(rawAch);

          // Extract Rating (1 to 5)
          const ratingVal = calculatePerformanceRating(achVal);

          const validationErrors: string[] = [];

          if (!rawId) {
            validationErrors.push('Missing Employee ID');
          }

          if (!normalizedMonth) {
            validationErrors.push('Missing or invalid Month format');
          }

          if (planVal < 0 || planVal > 100) {
            validationErrors.push(`Plan must be 0–100% (found ${planVal}%)`);
          }

          if (achVal < 0 || achVal > 100) {
            validationErrors.push(`Achievement cannot exceed 100% (found ${achVal}%)`);
          }

          const matchedEmp = rawId ? employeeMap.get(rawId.toUpperCase()) : undefined;
          
          let status: 'matched_new' | 'matched_update' | 'unmatched' | 'invalid' = 'matched_new';

          if (!matchedEmp) {
            status = 'unmatched';
            if (rawId) unmatchedIdsSet.add(rawId.toUpperCase());
          } else if (validationErrors.length > 0) {
            status = 'invalid';
          } else {
            // Check if Employee ID + Month exists
            const kpiKey = `${matchedEmp.id.toUpperCase()}_${normalizedMonth.trim()}`;
            const existingKpi = existingKpiMap.get(kpiKey);
            if (existingKpi) {
              status = 'matched_update';
            } else {
              status = 'matched_new';
            }
          }

          parsedRows.push({
            rowNumber,
            rawEmployeeId: rawId,
            employeeId: matchedEmp ? matchedEmp.id : rawId,
            employeeName: matchedEmp ? matchedEmp.name : 'Unknown / Not in DB',
            department: matchedEmp ? matchedEmp.department : '—',
            month: normalizedMonth,
            date: normalizedDate,
            plan: planVal,
            achievement: achVal,
            rating: ratingVal,
            status,
            validationErrors,
            matchedEmployee: matchedEmp,
            existingKpi: matchedEmp ? existingKpiMap.get(`${matchedEmp.id.toUpperCase()}_${normalizedMonth.trim()}`) : undefined
          });
        });

        // Compute summary counts
        const matchedCount = parsedRows.filter(r => r.status === 'matched_new' || r.status === 'matched_update').length;
        const unmatchedCount = parsedRows.filter(r => r.status === 'unmatched').length;
        const newCount = parsedRows.filter(r => r.status === 'matched_new').length;
        const updateCount = parsedRows.filter(r => r.status === 'matched_update').length;
        const invalidCount = parsedRows.filter(r => r.status === 'invalid').length;
        const unmatchedIds = Array.from(unmatchedIdsSet);

        const summary: ExcelImportSummary = {
          totalRows: parsedRows.length,
          matchedCount,
          unmatchedCount,
          newCount,
          updateCount,
          invalidCount,
          unmatchedEmployeeIds: unmatchedIds,
          rows: parsedRows
        };

        setImportSummary(summary);

        // If unmatched IDs exist, show warning notification popup
        if (unmatchedCount > 0) {
          const unmatchedDataRows = parsedRows
            .filter(r => r.status === 'unmatched')
            .map(r => ({
              'Row #': r.rowNumber,
              'Unmatched Employee ID': r.rawEmployeeId,
              'Month': r.month,
              'Plan %': `${r.plan}%`,
              'Achievement %': `${r.achievement}%`,
              'Rating': r.rating,
              'Reason': 'Employee ID was not found in the master employee database'
            }));

          setModalConfig({
            isOpen: true,
            type: 'unmatched',
            title: 'Data Not Matched Notice',
            message: `Found ${unmatchedCount} record(s) where Employee ID does not exist in the master employee database. These rows will be skipped during import.`,
            unmatchedIds: unmatchedIds,
            unmatchedRows: unmatchedDataRows,
            confirmText: 'Review Import Preview',
            onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      } catch (err: any) {
        console.error(err);
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Error Parsing Excel File',
          message: err?.message || 'Could not parse the selected Excel file. Please ensure it is a valid .xlsx or .xls file.',
          onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Filtered rows for the preview table
  const previewRows = useMemo(() => {
    if (!importSummary) return [];
    switch (activePreviewTab) {
      case 'matched':
        return importSummary.rows.filter(r => r.status === 'matched_new' || r.status === 'matched_update');
      case 'unmatched':
        return importSummary.rows.filter(r => r.status === 'unmatched');
      case 'new':
        return importSummary.rows.filter(r => r.status === 'matched_new');
      case 'update':
        return importSummary.rows.filter(r => r.status === 'matched_update');
      case 'invalid':
        return importSummary.rows.filter(r => r.status === 'invalid');
      default:
        return importSummary.rows;
    }
  }, [importSummary, activePreviewTab]);

  // Confirm and persist import
  const handleConfirmImport = async () => {
    if (!importSummary) return;

    const validRows = importSummary.rows.filter(r => r.status === 'matched_new' || r.status === 'matched_update');
    if (validRows.length === 0) {
      setModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'No Valid Records to Import',
        message: 'All rows in this file are either unmatched or contain validation errors.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const recordsToInsert: KPIRecord[] = [];
    const recordsToUpdate: KPIRecord[] = [];

    validRows.forEach(r => {
      const record: KPIRecord = {
        kpiId: `${r.employeeId.toUpperCase()}_${r.month.trim()}`,
        employeeId: r.employeeId.toUpperCase(),
        employeeName: r.employeeName,
        department: r.department,
        month: r.month.trim(),
        date: r.date,
        plan: r.plan,
        achievement: r.achievement,
        rating: r.rating,
        updatedAt: new Date().toISOString()
      };

      if (r.status === 'matched_update') {
        recordsToUpdate.push(record);
      } else {
        recordsToInsert.push(record);
      }
    });

    setIsImporting(true);
    try {
      await onConfirmImport(recordsToInsert, recordsToUpdate);

      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Excel Import Completed Successfully',
        message: `Successfully imported ${validRows.length} KPI records into Google Sheets!`,
        details: [
          `New Records Created: ${recordsToInsert.length}`,
          `Existing Records Updated: ${recordsToUpdate.length}`,
          `Unmatched Records Skipped: ${importSummary.unmatchedCount}`
        ],
        confirmText: 'View KPI Records',
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          setImportSummary(null);
          setFileName('');
          onNavigateToRecords();
        },
        onClose: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          setImportSummary(null);
          setFileName('');
        }
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Import Failed',
        message: err?.message || 'Error occurred while saving records to the database.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setImportSummary(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Upload Header & Template Download */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#2A3F54]">Monthly KPI Excel Upload</h3>
          <p className="text-xs text-gray-500 mt-1">
            Upload Excel (.xlsx, .xls) containing monthly KPI data. Matching is strictly performed using Employee ID.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 text-xs font-bold text-[#26B99A] bg-[#26B99A]/10 hover:bg-[#26B99A]/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Sample KPI Template (.xlsx)
        </button>
      </div>

      {/* File Dropzone (if no active summary) */}
      {!importSummary && (
        <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300 hover:border-[#26B99A] transition-colors shadow-2xs text-center flex flex-col items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />

          <div className="p-4 bg-emerald-50 text-[#26B99A] rounded-full mb-4">
            <Upload className="w-8 h-8" />
          </div>

          <h4 className="text-base font-bold text-gray-800 mb-1">
            Choose an Excel file or drag & drop here
          </h4>
          <p className="text-xs text-gray-400 mb-6 max-w-md">
            Upload .xlsx or .xls file containing Employee ID, Month, Date, Plan (%), Achievement (%), and Rating.
          </p>

          <button
            type="button"
            disabled={isProcessingFile}
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-[#2A3F54] hover:bg-[#1A2A3A] text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessingFile ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Reading Excel File...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-[#26B99A]" />
                Browse Excel File
              </>
            )}
          </button>
        </div>
      )}

      {/* Excel Import Preview (Summary & Table) */}
      {importSummary && (
        <div className="space-y-6">
          {/* Summary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Rows</span>
              <div className="text-xl font-black text-gray-800 mt-1">{importSummary.totalRows}</div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Matched Records</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{importSummary.matchedCount}</div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Unmatched IDs</span>
              <div className="text-xl font-black text-rose-700 mt-1">{importSummary.unmatchedCount}</div>
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">New Records</span>
              <div className="text-xl font-black text-blue-700 mt-1">{importSummary.newCount}</div>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">To Update</span>
              <div className="text-xl font-black text-amber-700 mt-1">{importSummary.updateCount}</div>
            </div>

            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Invalid Values</span>
              <div className="text-xl font-black text-purple-700 mt-1">{importSummary.invalidCount}</div>
            </div>
          </div>

          {/* Unmatched IDs Banner Notice */}
          {importSummary.unmatchedCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-rose-900">
                    Data Not Matched: {importSummary.unmatchedCount} Employee ID(s) Not Found in Master Database
                  </h5>
                  <p className="text-xs text-rose-700 mt-0.5">
                    IDs: {importSummary.unmatchedEmployeeIds.slice(0, 8).join(', ')}
                    {importSummary.unmatchedEmployeeIds.length > 8 && ` ... and ${importSummary.unmatchedEmployeeIds.length - 8} more`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const unmatchedDataRows = importSummary.rows
                    .filter(r => r.status === 'unmatched')
                    .map(r => ({
                      'Row #': r.rowNumber,
                      'Unmatched Employee ID': r.rawEmployeeId,
                      'Month': r.month,
                      'Plan %': `${r.plan}%`,
                      'Achievement %': `${r.achievement}%`,
                      'Rating': r.rating,
                      'Reason': 'Employee ID was not found in the master employee database'
                    }));

                  setModalConfig({
                    isOpen: true,
                    type: 'unmatched',
                    title: 'Data Not Matched Details',
                    message: 'The following Employee IDs were not found in the existing employee database and will not be imported:',
                    unmatchedIds: importSummary.unmatchedEmployeeIds,
                    unmatchedRows: unmatchedDataRows,
                    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                  });
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-2xs"
              >
                View Unmatched List
              </button>
            </div>
          )}

          {/* Preview Table Container */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            {/* Table Filter Tabs */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActivePreviewTab('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activePreviewTab === 'all' ? 'bg-[#2A3F54] text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({importSummary.totalRows})
                </button>
                <button
                  onClick={() => setActivePreviewTab('matched')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activePreviewTab === 'matched' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  Matched ({importSummary.matchedCount})
                </button>
                <button
                  onClick={() => setActivePreviewTab('new')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activePreviewTab === 'new' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-700'
                  }`}
                >
                  New ({importSummary.newCount})
                </button>
                <button
                  onClick={() => setActivePreviewTab('update')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activePreviewTab === 'update' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:text-amber-700'
                  }`}
                >
                  Update ({importSummary.updateCount})
                </button>
                <button
                  onClick={() => setActivePreviewTab('unmatched')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activePreviewTab === 'unmatched' ? 'bg-rose-600 text-white' : 'text-gray-600 hover:text-rose-700'
                  }`}
                >
                  Unmatched ({importSummary.unmatchedCount})
                </button>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>File: <strong className="text-gray-700">{fileName}</strong></span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100/90 backdrop-blur-xs text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Employee ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Plan (%)</th>
                    <th className="py-2.5 px-3 text-right">Ach (%)</th>
                    <th className="py-2.5 px-3 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.map((row, idx) => {
                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        New
                      </span>
                    );

                    if (row.status === 'matched_update') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          Update
                        </span>
                      );
                    } else if (row.status === 'unmatched') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          Unmatched
                        </span>
                      );
                    } else if (row.status === 'invalid') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          Invalid
                        </span>
                      );
                    }

                    return (
                      <tr key={idx} className={`hover:bg-gray-50/80 ${row.status === 'unmatched' ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-2 px-3 text-gray-400 font-mono">{row.rowNumber}</td>
                        <td className="py-2 px-3">{statusBadge}</td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-800">{row.employeeId || row.rawEmployeeId}</td>
                        <td className="py-2 px-3 font-bold text-[#2A3F54]">{row.employeeName}</td>
                        <td className="py-2 px-3 text-gray-500">{row.department}</td>
                        <td className="py-2 px-3 text-gray-700 font-semibold">{row.month}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">{row.plan}%</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{row.achievement}%</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded font-mono">
                            ★ {row.rating.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Confirm & Cancel Actions Bar */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelImport}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-2xs"
              >
                Cancel Import
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Ready to import <strong className="text-emerald-700">{importSummary.matchedCount}</strong> records
                </span>
                <button
                  type="button"
                  disabled={isImporting || importSummary.matchedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-[#26B99A] hover:bg-[#169F85] text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isImporting ? 'Saving to Database...' : 'Confirm Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Notifications */}
      <KPIModalNotification {...modalConfig} />
    </div>
  );
}
