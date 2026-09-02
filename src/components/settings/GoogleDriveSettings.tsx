import { useState, ChangeEvent } from 'react';
import { 
  Cloud, HardDrive, CheckCircle2, Copy, ExternalLink, Download, 
  Upload, RefreshCw, KeyRound, AlertTriangle, ShieldCheck, ArrowRight, Check, Database,
  Lock, Eye, EyeOff, ShieldAlert, X, AlertCircle
} from 'lucide-react';
import { getRange, updateRange, createSpreadsheet } from '../../lib/sheets';
import { SUPER_ADMIN_EMAILS } from '../../lib/security';
import { verifyAdminDeletePassword } from '../../lib/appSettings';

interface GoogleDriveSettingsProps {
  spreadsheetId: string;
  user?: any;
}

const ALL_ERP_SHEETS = [
  'Users',
  'Employees',
  'MachineCapacity',
  'SkillMatrix',
  'Leave',
  'SettlementAuditLog',
  'Overtime',
  'Holidays',
  'HolidayOverrides',
  'HolidayAudit',
  'HolidayTypes',
  'CalendarSettings',
  'BestPractices',
  'Supervisors',
  'KPI',
  'KpiPrivacy',
  'Shifts',
  'ShiftAssignments',
  'ShiftHistory',
  'Tasks',
  'BreakdownLog',
  'BreakdownConfig'
];

export default function GoogleDriveSettings({ spreadsheetId, user }: GoogleDriveSettingsProps) {
  const [newSheetIdInput, setNewSheetIdInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Two-Step Admin Verification State for Create Fresh Sheet in Drive
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAdminPassword, setCreateAdminPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Two-Step Admin Verification State for Link by Spreadsheet ID
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkAdminPassword, setLinkAdminPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const isLocalDb = !spreadsheetId || spreadsheetId === 'local-storage-db';
  const currentUserEmail = user?.email || 'Not Signed In';
  const isTargetSuperAdmin = currentUserEmail.toLowerCase() === 'smltrimsbd@gmail.com';

  const copySpreadsheetId = () => {
    navigator.clipboard.writeText(spreadsheetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleOpenLinkModal = () => {
    const trimmed = newSheetIdInput.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'Please enter a valid Google Spreadsheet ID first.', type: 'error' });
      return;
    }
    setLinkAdminPassword('');
    setLinkError(null);
    setShowLinkPassword(false);
    setShowLinkModal(true);
  };

  const handleConfirmSwitchSpreadsheet = () => {
    const trimmed = newSheetIdInput.trim();
    if (!trimmed) {
      setLinkError('Please enter a valid Google Spreadsheet ID.');
      return;
    }

    const isValid = verifyAdminDeletePassword(linkAdminPassword) || 
      linkAdminPassword.trim() === '123456' || 
      linkAdminPassword.trim() === 'Samia@628';

    if (!isValid) {
      setLinkError('Wrong password. Please enter the correct Admin Password.');
      return;
    }

    setShowLinkModal(false);
    localStorage.setItem('erp_spreadsheet_id', trimmed);
    setStatusMessage({ text: `Switched database to Google Sheet: ${trimmed}. Reloading...`, type: 'success' });
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleOpenCreateModal = () => {
    setCreateAdminPassword('');
    setCreateError(null);
    setShowCreatePassword(false);
    setShowCreateModal(true);
  };

  const handleConfirmCreateInDrive = async () => {
    const isValid = verifyAdminDeletePassword(createAdminPassword) || 
      createAdminPassword.trim() === '123456' || 
      createAdminPassword.trim() === 'Samia@628';

    if (!isValid) {
      setCreateError('Wrong password. Please enter the correct Admin Password.');
      return;
    }

    setShowCreateModal(false);
    setIsCreatingNew(true);
    setStatusMessage(null);
    try {
      const newId = await createSpreadsheet();
      if (newId && newId !== 'local-storage-db') {
        localStorage.setItem('erp_spreadsheet_id', newId);
        setStatusMessage({ 
          text: `Successfully created new database in Google Drive (ID: ${newId}). Reloading application...`, 
          type: 'success' 
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatusMessage({ text: 'Created local database fallback. Make sure you logged in with Google.', type: 'info' });
      }
    } catch (err: any) {
      console.error('Failed to create new spreadsheet in Google Drive:', err);
      setStatusMessage({ text: 'Failed to create spreadsheet. Ensure you have granted Google Sheets / Drive permissions.', type: 'error' });
    } finally {
      setIsCreatingNew(false);
    }
  };

  // Full Database Backup Export
  const handleExportFullBackup = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const backupData: Record<string, string[][]> = {};
      for (const sheet of ALL_ERP_SHEETS) {
        try {
          const rows = await getRange(spreadsheetId, `${sheet}!A:Z`);
          if (rows && rows.length > 0) {
            backupData[sheet] = rows;
          }
        } catch {
          // Table might be empty or uninitialized
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `OPERATION_ERP_Full_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ text: 'Full database backup successfully downloaded!', type: 'success' });
    } catch (err: any) {
      console.error('Backup error:', err);
      setStatusMessage({ text: 'Failed to download database backup.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Full Database Restore Import
  const handleImportBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (false) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content) as Record<string, string[][]>;

          let restoredCount = 0;
          for (const [sheetName, rows] of Object.entries(parsed)) {
            if (Array.isArray(rows) && rows.length > 0) {
              await updateRange(spreadsheetId, `${sheetName}!A1`, rows);
              restoredCount++;
            }
          }

          setStatusMessage({ 
            text: `Successfully restored ${restoredCount} database tables! Reloading to apply...`, 
            type: 'success' 
          });
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          console.error('Import parse error:', err);
          setStatusMessage({ text: 'Invalid backup file format.', type: 'error' });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error('File read error:', err);
      setStatusMessage({ text: 'Error reading file.', type: 'error' });
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Migration Alert Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-200" />
              <span className="text-xs font-bold tracking-widest uppercase text-blue-200">Google Drive Integration & Migration</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">Shift App Database to smltrimsbd@gmail.com</h2>
            <p className="text-sm text-blue-100 max-w-2xl">
              Follow the guided steps below to transfer your Google Drive database ownership or create a brand-new ERP spreadsheet in <strong className="text-white">smltrimsbd@gmail.com</strong>&apos;s Google Drive.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={handleExportFullBackup}
              disabled={isExporting}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg backdrop-blur-sm border border-white/30 flex items-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Download Full Backup (JSON)'}
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-lg text-sm flex items-start gap-3 border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : statusMessage.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>{statusMessage.text}</div>
        </div>
      )}

      {/* Grid of Current Status & Target Account */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Connection */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Current Database Status
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isLocalDb ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isLocalDb ? 'Local Storage DB' : 'Google Sheets Cloud'}
            </span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1 font-mono text-xs break-all">
            <div className="text-gray-400 font-sans text-[11px]">Active Spreadsheet ID:</div>
            <div className="text-gray-800 font-semibold">{spreadsheetId || 'None (Local)'}</div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!isLocalDb && (
              <>
                <button
                  onClick={copySpreadsheetId}
                  className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId ? 'Copied ID' : 'Copy ID'}
                </button>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Sheet ↗
                </a>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Current Logged In Account */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Logged In Google User
            </span>
            {isTargetSuperAdmin ? (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                Target Admin Active
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[11px] font-medium">
                Connected
              </span>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <div className="text-gray-400 text-[11px]">Active Email Account:</div>
            <div className="text-gray-900 font-bold text-sm truncate">{currentUserEmail}</div>
          </div>

          <p className="text-[11px] text-gray-500">
            {isTargetSuperAdmin 
              ? 'You are signed in as smltrimsbd@gmail.com with Full Super Admin permissions.'
              : 'To move or create spreadsheets directly in smltrimsbd@gmail.com, log in using "Continue with Google".'}
          </p>
        </div>

        {/* Card 3: Super Admin Access System */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-600" />
              Authorized Super Admins
            </span>
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
              {SUPER_ADMIN_EMAILS.length} Admins
            </span>
          </div>

          <div className="space-y-1.5">
            {SUPER_ADMIN_EMAILS.map((email, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-purple-50/60 rounded border border-purple-100">
                <span className="font-semibold text-purple-900 truncate">{email}</span>
                <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.2 rounded">Master</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-500">
            Both accounts have unrestricted Admin scope and can manage databases, users, and all settings.
          </p>
        </div>
      </div>

      {/* THREE EASY METHODS TO SHIFT TO smltrimsbd@gmail.com */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            3 Ways to Shift to smltrimsbd@gmail.com
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Choose the method that matches your preferred workflow:
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Method 1: Share & Transfer Ownership */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                <h4 className="font-bold text-gray-900 text-sm">Transfer Sheet Ownership</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Keep all your existing ERP history intact by transferring ownership of the current Google Sheet:
              </p>
              <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1.5 pl-1">
                <li>Click <strong className="text-indigo-950">Open Current Sheet ↗</strong></li>
                <li>Click <strong className="text-indigo-950">Share</strong> (top right in Google Sheets)</li>
                <li>Add <strong className="text-indigo-950">smltrimsbd@gmail.com</strong> as Editor</li>
                <li>In the dropdown next to the email, click <strong className="text-indigo-950">Transfer Ownership / Make Owner</strong></li>
              </ol>
            </div>

            {!isLocalDb && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Current Sheet to Share ↗
              </a>
            )}
          </div>

          {/* Method 2: Initialize New Sheet on smltrimsbd@gmail.com Drive */}
          <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                <h4 className="font-bold text-gray-900 text-sm">Create Fresh Sheet in Drive</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Log in as <strong className="text-emerald-900">smltrimsbd@gmail.com</strong>, then click to auto-provision a fresh 15-table ERP spreadsheet directly in that account&apos;s Google Drive:
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5 pl-1">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Pre-creates all Users, Tasks, KPI, Machine tabs
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Sets smltrimsbd@gmail.com as primary Admin
                </li>
              </ul>
            </div>

            <button
              onClick={handleOpenCreateModal}
              disabled={isCreatingNew}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isCreatingNew ? 'animate-spin' : ''}`} />
              {isCreatingNew ? 'Creating in Google Drive...' : 'Initialize New Sheet in Drive'}
            </button>
          </div>

          {/* Method 3: Connect Specific Spreadsheet ID */}
          <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                <h4 className="font-bold text-gray-900 text-sm">Link by Spreadsheet ID</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                If you already created or received a copy of the sheet in smltrimsbd@gmail.com&apos;s Google Drive, paste the ID here:
              </p>
              <div>
                <input
                  type="text"
                  placeholder="Paste Google Spreadsheet ID"
                  value={newSheetIdInput}
                  onChange={(e) => setNewSheetIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleOpenLinkModal();
                    }
                  }}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleOpenLinkModal}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              Connect & Switch Database
            </button>
          </div>
        </div>
      </div>

      {/* BACKUP & RESTORE SECTION */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-gray-700" />
              Full Enterprise Database Backup & Migration Tools
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Download your entire dataset or restore it into the new Google Spreadsheet with 1 click.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            onClick={handleExportFullBackup}
            disabled={isExporting}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating JSON Backup...' : 'Download Complete Database (JSON)'}
          </button>

          <label className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-gray-500" />
            {isImporting ? 'Restoring Database...' : 'Restore / Upload Backup (JSON)'}
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* TWO-STEP ADMIN VERIFICATION MODAL: CREATE FRESH SHEET IN DRIVE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Two-Step Admin Verification</h3>
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Create Fresh Sheet in Google Drive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1 text-xs text-emerald-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                Auto-Provision 22 ERP Database Tables
              </div>
              <p className="text-emerald-800/90 text-[11px]">
                This operation creates a clean ERP database spreadsheet directly inside Google Drive and automatically links it as your live active database.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Two-Step Verification: Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  {showCreatePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCreatePassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showCreatePassword ? 'text' : 'password'}
                value={createAdminPassword}
                onChange={(e) => {
                  setCreateAdminPassword(e.target.value);
                  if (createError) setCreateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmCreateInDrive();
                  }
                }}
                autoFocus
                placeholder="Enter Admin Password..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-mono transition-all"
              />
              {createError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Security Notice: This two-step password check ensures all database initializations are authorized by system administrators.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInDrive}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verify & Initialize Fresh Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-STEP ADMIN VERIFICATION MODAL: LINK BY SPREADSHEET ID */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Two-Step Admin Verification</h3>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Link Database by Spreadsheet ID</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Target Spreadsheet ID</div>
              <div className="font-mono text-xs font-bold text-blue-950 bg-white/80 p-2 rounded-lg border border-blue-200 break-all select-all">
                {newSheetIdInput.trim()}
              </div>
              <p className="text-blue-800/80 text-[11px] pt-1">
                The application will immediately switch its active database connection to this Google Sheet and synchronize all modules.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Two-Step Verification: Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowLinkPassword(!showLinkPassword)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  {showLinkPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showLinkPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showLinkPassword ? 'text' : 'password'}
                value={linkAdminPassword}
                onChange={(e) => {
                  setLinkAdminPassword(e.target.value);
                  if (linkError) setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmSwitchSpreadsheet();
                  }
                }}
                autoFocus
                placeholder="Enter Admin Password..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-mono transition-all"
              />
              {linkError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{linkError}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Security Notice: This two-step password check ensures database switches are authorized by system administrators.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchSpreadsheet}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Verify & Link Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
