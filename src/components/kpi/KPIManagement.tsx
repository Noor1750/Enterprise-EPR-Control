import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, PlusCircle, Upload, Table, History, 
  FileText, RefreshCw, Layers, Award, Users, AlertCircle,
  ShieldCheck, Lock, Shield
} from 'lucide-react';
import { 
  Employee, KPIRecord, getRatingInfo, MONTH_NAMES 
} from './types';
import { calculatePerformanceRating } from '../../lib/kpiEngine';
import KPIDashboard from './KPIDashboard';
import KPIEntry from './KPIEntry';
import KPIExcelUpload from './KPIExcelUpload';
import KPIRecords from './KPIRecords';
import KPIEmployeeHistory from './KPIEmployeeHistory';
import KPIReports from './KPIReports';
import KPIPrivacyManager from './KPIPrivacyManager';
import { 
  getRange, appendRow, updateRowByPrimaryKey, 
  deleteRowByPrimaryKey, ensureKpiSheet, KPI_HEADERS,
  ensureKpiPrivacySheet, getHiddenKpiEmployeeIds,
  saveHiddenKpiEmployeeIds, toggleHiddenKpiEmployeeId
} from '../../lib/sheets';
import { UserSecurityScope, filterAuthorizedEmployees, getAuthorizedEmployeeIdSet } from '../../lib/security';

interface KPIManagementProps {
  spreadsheetId: string;
  employees: Employee[];
  accessLevels?: string[];
  userEmail?: string;
  userSecurityScope?: UserSecurityScope;
}

export type KPITab = 'dashboard' | 'entry' | 'upload' | 'records' | 'history' | 'reports' | 'privacy';

export default function KPIManagement({
  spreadsheetId,
  employees: masterEmployees,
  accessLevels = [],
  userEmail = '',
  userSecurityScope
}: KPIManagementProps) {
  const [activeTab, setActiveTab] = useState<KPITab>('dashboard');
  const [rawKpiRecords, setKpiRecords] = useState<KPIRecord[]>([]);
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historySelectedEmployeeId, setHistorySelectedEmployeeId] = useState<string>('');

  // Determine if current user is an Admin
  const isAdmin = useMemo(() => {
    if (userEmail && userEmail.toLowerCase() === 'noor.alam1750@gmail.com') return true;
    if (userSecurityScope?.isAdmin) return true;
    if (!accessLevels || accessLevels.length === 0) return true; // Default fallback
    return accessLevels.includes('All') || accessLevels.includes('Settings') || accessLevels.includes('Admin');
  }, [accessLevels, userEmail, userSecurityScope]);

  // Security filtered employees
  const employees = useMemo(() => {
    return filterAuthorizedEmployees(masterEmployees, userSecurityScope);
  }, [masterEmployees, userSecurityScope]);

  const authorizedIdSet = useMemo(() => {
    return getAuthorizedEmployeeIdSet(masterEmployees, userSecurityScope);
  }, [masterEmployees, userSecurityScope]);

  const isRestrictedScope = useMemo(() => {
    return Boolean(userSecurityScope && !userSecurityScope.isAdmin && userSecurityScope.accessLimitType !== 'all');
  }, [userSecurityScope]);

  // Filtered KPI records matching security access
  const kpiRecords = useMemo(() => {
    if (!isRestrictedScope) return rawKpiRecords;
    return rawKpiRecords.filter(r => authorizedIdSet.has(r.employeeId.toUpperCase()));
  }, [rawKpiRecords, isRestrictedScope, authorizedIdSet]);

  // Load hidden KPI privacy settings from Google Sheets
  const loadPrivacyData = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      await ensureKpiPrivacySheet(spreadsheetId);
      const ids = await getHiddenKpiEmployeeIds(spreadsheetId);
      setHiddenEmployeeIds(ids);
    } catch (err) {
      console.error('Failed to load hidden KPI employee IDs:', err);
    }
  }, [spreadsheetId]);

  // Toggle individual employee privacy
  const handleToggleHide = async (employeeId: string) => {
    if (!spreadsheetId) return;
    try {
      const updated = await toggleHiddenKpiEmployeeId(spreadsheetId, employeeId);
      setHiddenEmployeeIds(updated);
    } catch (err) {
      console.error('Failed to toggle hidden employee KPI ID:', err);
    }
  };

  // Bulk save privacy
  const handleSaveHiddenList = async (ids: string[]) => {
    if (!spreadsheetId) return;
    try {
      await saveHiddenKpiEmployeeIds(spreadsheetId, ids);
      setHiddenEmployeeIds(ids);
    } catch (err) {
      console.error('Failed to save hidden KPI list:', err);
    }
  };

  // Fetch KPI data from Google Sheets
  const loadKpiData = useCallback(async () => {
    if (!spreadsheetId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Ensure KPI sheet & Privacy sheet exist
      await Promise.all([
        ensureKpiSheet(spreadsheetId),
        loadPrivacyData()
      ]);

      // Fetch all rows from KPI sheet
      const rows = await getRange(spreadsheetId, 'KPI!A:K');
      
      if (!rows || rows.length <= 1) {
        setKpiRecords([]);
        setIsLoading(false);
        return;
      }

      // Map rows to KPIRecord objects (skip header row 0)
      const records: KPIRecord[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const kpiId = String(row[0] || '').trim();
        const employeeId = String(row[1] || '').trim();
        const employeeName = String(row[2] || '').trim();
        const department = String(row[3] || '').trim();
        const month = String(row[4] || '').trim();
        const date = String(row[5] || '').trim();
        const plan = parseFloat(row[6]) || 0;
        const achievement = parseFloat(row[7]) || 0;
        // Auto-recalculate rating from achievement on load
        const rating = calculatePerformanceRating(achievement);
        const createdAt = String(row[9] || '');
        const updatedAt = String(row[10] || '');

        records.push({
          kpiId,
          employeeId,
          employeeName,
          department,
          month,
          date,
          plan: isNaN(plan) ? 100 : plan,
          achievement: isNaN(achievement) ? 0 : Math.min(100, achievement),
          rating,
          createdAt,
          updatedAt
        });
      }

      setKpiRecords(records);
    } catch (err: any) {
      console.error('Failed to load KPI records:', err);
      setError(err?.message || 'Failed to fetch KPI records from Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  }, [spreadsheetId, loadPrivacyData]);

  useEffect(() => {
    loadKpiData();
  }, [loadKpiData]);

  // Available unique evaluation months in data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    kpiRecords.forEach(k => {
      if (k.month) set.add(k.month.trim());
    });
    // Add current and recent months if list is empty
    if (set.size === 0) {
      const now = new Date();
      set.add(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
    }
    return Array.from(set);
  }, [kpiRecords]);

  // Convert KPIRecord to Sheet Row Array
  const recordToRow = (r: KPIRecord): string[] => [
    r.kpiId,
    r.employeeId,
    r.employeeName,
    r.department,
    r.month,
    r.date,
    String(r.plan),
    String(r.achievement),
    String(r.rating),
    r.createdAt || new Date().toISOString(),
    r.updatedAt || new Date().toISOString()
  ];

  // Save or Update Single KPI Record
  const handleSaveRecord = async (record: KPIRecord) => {
    const existingIndex = kpiRecords.findIndex(k => k.kpiId === record.kpiId);
    
    if (existingIndex >= 0) {
      // Update in Google Sheet
      await updateRowByPrimaryKey(spreadsheetId, 'KPI', record.kpiId, recordToRow(record));
      // Update locally
      setKpiRecords(prev => {
        const next = [...prev];
        next[existingIndex] = record;
        return next;
      });
    } else {
      // Append to Google Sheet
      await appendRow(spreadsheetId, 'KPI!A:K', [recordToRow(record)]);
      // Add locally
      setKpiRecords(prev => [record, ...prev]);
    }
  };

  // Batch Save Records (used by batch entry)
  const handleBatchSaveRecords = async (records: KPIRecord[]) => {
    const newRecords: KPIRecord[] = [];
    const updatePromises: Promise<void>[] = [];

    records.forEach(rec => {
      const exists = kpiRecords.some(k => k.kpiId === rec.kpiId);
      if (exists) {
        updatePromises.push(updateRowByPrimaryKey(spreadsheetId, 'KPI', rec.kpiId, recordToRow(rec)));
      } else {
        newRecords.push(rec);
      }
    });

    if (newRecords.length > 0) {
      await appendRow(spreadsheetId, 'KPI!A:K', newRecords.map(recordToRow));
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Refresh entire dataset
    await loadKpiData();
  };

  // Confirm Excel Import (both inserts & updates)
  const handleConfirmImport = async (recordsToInsert: KPIRecord[], recordsToUpdate: KPIRecord[]) => {
    if (recordsToInsert.length > 0) {
      await appendRow(spreadsheetId, 'KPI!A:K', recordsToInsert.map(recordToRow));
    }

    if (recordsToUpdate.length > 0) {
      // Update existing records in parallel batches
      const chunkSize = 10;
      for (let i = 0; i < recordsToUpdate.length; i += chunkSize) {
        const chunk = recordsToUpdate.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(r => updateRowByPrimaryKey(spreadsheetId, 'KPI', r.kpiId, recordToRow(r)))
        );
      }
    }

    await loadKpiData();
  };

  // Update existing record
  const handleUpdateRecord = async (record: KPIRecord) => {
    await updateRowByPrimaryKey(spreadsheetId, 'KPI', record.kpiId, recordToRow(record));
    setKpiRecords(prev => prev.map(k => k.kpiId === record.kpiId ? record : k));
  };

  // Delete record
  const handleDeleteRecord = async (kpiId: string) => {
    await deleteRowByPrimaryKey(spreadsheetId, 'KPI', kpiId);
    setKpiRecords(prev => prev.filter(k => k.kpiId !== kpiId));
  };

  // Navigation handlers
  const handleNavigateToHistory = (employeeId: string) => {
    setHistorySelectedEmployeeId(employeeId);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Security Scope Banner */}
      {isRestrictedScope && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-amber-900 text-sm shadow-2xs">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Security Access Scoped:</strong> KPI assessment & records restricted to <strong>{employees.length} employee{employees.length !== 1 ? 's' : ''}</strong>
              {userSecurityScope?.supervisorName ? ` under Supervisor "${userSecurityScope.supervisorName}"` : ''}
              {userSecurityScope?.accessLimitType === 'department' && userSecurityScope?.assignedDepartment ? ` in Department "${userSecurityScope.assignedDepartment}"` : ''}.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold uppercase">
            {userSecurityScope?.accessLimitType} Mode
          </span>
        </div>
      )}

      {/* KPI Management Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-[#26B99A] rounded-lg">
                <Award className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#2A3F54]">Monthly KPI Management System</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synchronized with Master Employee Database • Employee ID Primary Matching
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadKpiData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#26B99A]' : ''}`} />
              Refresh Data
            </button>

            <button
              onClick={() => setActiveTab('entry')}
              className="px-4 py-2 bg-[#26B99A] hover:bg-[#169F85] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              New KPI Entry
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            KPI Dashboard
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'entry'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Monthly KPI Entry
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Excel Bulk Upload
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'records'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4" />
            KPI Records ({kpiRecords.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Employee KPI History
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[#2A3F54] text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            KPI Reports
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ml-auto ${
                activeTab === 'privacy'
                  ? 'bg-[#2A3F54] text-white shadow-2xs'
                  : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-900 border border-amber-200 shadow-2xs'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Admin Privacy Controls</span>
              {hiddenEmployeeIds.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-mono font-bold">
                  {hiddenEmployeeIds.length} Hidden
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="text-xs font-semibold">{error}</div>
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {isLoading && kpiRecords.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center text-gray-500 shadow-2xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#26B99A] mb-3" />
          <h4 className="text-sm font-bold text-gray-700">Connecting to Google Sheets KPI database...</h4>
          <p className="text-xs text-gray-400 mt-1">Fetching monthly KPI records and validating employee matching</p>
        </div>
      ) : (
        /* Tab Content Routing */
        <div>
          {activeTab === 'dashboard' && (
            <KPIDashboard
              employees={employees}
              kpiRecords={kpiRecords}
              hiddenEmployeeIds={hiddenEmployeeIds}
              isAdmin={isAdmin}
              onNavigateToEntry={() => setActiveTab('entry')}
              onNavigateToUpload={() => setActiveTab('upload')}
              onNavigateToRecords={() => setActiveTab('records')}
              onNavigateToHistory={handleNavigateToHistory}
            />
          )}

          {activeTab === 'entry' && (
            <KPIEntry
              employees={employees}
              kpiRecords={kpiRecords}
              onSaveRecord={handleSaveRecord}
              onBatchSaveRecords={handleBatchSaveRecords}
            />
          )}

          {activeTab === 'upload' && (
            <KPIExcelUpload
              employees={employees}
              kpiRecords={kpiRecords}
              onConfirmImport={handleConfirmImport}
              onNavigateToRecords={() => setActiveTab('records')}
            />
          )}

          {activeTab === 'records' && (
            <KPIRecords
              employees={employees}
              kpiRecords={kpiRecords}
              availableMonths={availableMonths}
              hiddenEmployeeIds={hiddenEmployeeIds}
              isAdmin={isAdmin}
              onToggleHide={handleToggleHide}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onNavigateToHistory={handleNavigateToHistory}
            />
          )}

          {activeTab === 'history' && (
            <KPIEmployeeHistory
              employees={employees}
              kpiRecords={kpiRecords}
              initialEmployeeId={historySelectedEmployeeId}
              hiddenEmployeeIds={hiddenEmployeeIds}
              isAdmin={isAdmin}
              onToggleHide={handleToggleHide}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onNavigateToEntry={() => setActiveTab('entry')}
            />
          )}

          {activeTab === 'reports' && (
            <KPIReports
              employees={employees}
              kpiRecords={kpiRecords}
              availableMonths={availableMonths}
            />
          )}

          {activeTab === 'privacy' && isAdmin && (
            <KPIPrivacyManager
              employees={employees}
              kpiRecords={kpiRecords}
              hiddenEmployeeIds={hiddenEmployeeIds}
              onToggleHide={handleToggleHide}
              onBatchSaveHidden={handleSaveHiddenList}
            />
          )}
        </div>
      )}
    </div>
  );
}
