import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Globe, 
  ExternalLink, Copy, Check, ShieldCheck, Database, Key, HelpCircle 
} from 'lucide-react';
import { getAccessToken } from '../../lib/firebase';
import { getRange } from '../../lib/sheets';
import { fetchTableFromCloud, MASTER_DATABASE_OWNER } from '../../lib/realtimeSync';

interface DiagnosticResult {
  step: string;
  status: 'passed' | 'failed' | 'warning' | 'idle' | 'running';
  message: string;
  solution?: string;
}

interface LiveDeploymentDiagnosticProps {
  spreadsheetId: string;
  userEmail?: string;
}

export const LiveDeploymentDiagnostic: React.FC<LiveDeploymentDiagnosticProps> = ({
  spreadsheetId,
  userEmail
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[] | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocalDb = !spreadsheetId || spreadsheetId === 'local-storage-db';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const runFullDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. Current Domain & Origin Assessment
    if (currentOrigin.includes('netlify.app')) {
      results.push({
        step: 'Live Host Detection (Netlify)',
        status: 'passed',
        message: `Running on Netlify (${currentOrigin}).`,
      });
    } else if (currentOrigin.includes('run.app') || currentOrigin.includes('firebaseapp.com') || currentOrigin.includes('web.app')) {
      results.push({
        step: 'Live Host Detection (Cloud Run / Firebase)',
        status: 'passed',
        message: `Running on live cloud host (${currentOrigin}).`,
      });
    } else {
      results.push({
        step: 'Domain Check',
        status: 'passed',
        message: `Current origin is ${currentOrigin}.`,
      });
    }

    // 2. Google OAuth Token Check
    let token: string | null = null;
    try {
      token = await getAccessToken();
      if (token && token !== 'mock-token-for-admin') {
        results.push({
          step: 'Google OAuth Token',
          status: 'passed',
          message: 'Active Google OAuth access token found.',
        });
      } else {
        results.push({
          step: 'Google OAuth Token',
          status: 'warning',
          message: 'No live Google OAuth token detected (using local / mock mode).',
          solution: 'To write directly to Google Drive, users must click "Sign in with Google" with Sheets permissions.'
        });
      }
    } catch (e: any) {
      results.push({
        step: 'Google OAuth Token',
        status: 'failed',
        message: `Token retrieval error: ${e.message || e}`,
        solution: 'Sign out and sign back in using the Google popup.'
      });
    }

    // 3. Google Sheets Database Connection
    if (isLocalDb) {
      results.push({
        step: 'Google Drive Database Link',
        status: 'warning',
        message: 'Active database is in Local Storage fallback mode.',
        solution: `Connect a Google Spreadsheet owned by or shared with ${MASTER_DATABASE_OWNER}.`
      });
    } else {
      try {
        const rows = await getRange(spreadsheetId, 'Users!A1:B3');
        if (rows && rows.length > 0) {
          results.push({
            step: 'Google Sheets Live Read',
            status: 'passed',
            message: `Successfully connected to Google Sheet (${rows.length} rows verified).`,
          });
        } else {
          results.push({
            step: 'Google Sheets Live Read',
            status: 'warning',
            message: 'Spreadsheet responded with 0 rows.',
            solution: 'Verify that the "Users" tab exists in your Google Sheet.'
          });
        }
      } catch (err: any) {
        results.push({
          step: 'Google Sheets Live Read',
          status: 'failed',
          message: `Cannot access Google Sheet (${spreadsheetId}): ${err.message || 'Permission Denied / 403 / 404'}`,
          solution: `CRITICAL: In Google Drive, open the spreadsheet, click "Share", and change General Access to "Anyone with the link can edit", or add your users as "Editor". Otherwise Google blocks other users from reading or writing!`
        });
      }
    }

    // 4. Firestore Real-time Cloud Synchronization
    try {
      const cloudUsers = await fetchTableFromCloud('Users');
      if (cloudUsers && cloudUsers.length > 0) {
        results.push({
          step: 'Firestore Real-time Sync',
          status: 'passed',
          message: `Connected to live Firestore sync for ${MASTER_DATABASE_OWNER} (${cloudUsers.length} users synchronized).`,
        });
      } else {
        results.push({
          step: 'Firestore Real-time Sync',
          status: 'warning',
          message: `Firestore sync active, but initial table is being populated.`,
          solution: 'Firestore rules must permit read/write on erp_databases collection.'
        });
      }
    } catch (e: any) {
      results.push({
        step: 'Firestore Real-time Sync',
        status: 'failed',
        message: `Firestore connection warning: ${e.message || e}`,
        solution: 'Check your Firebase project config and ensure Firestore database is active.'
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Deployment & Real-time Connectivity Diagnostic
            </h3>
            <p className="text-xs text-slate-500">
              Diagnose and verify live data flow across Netlify, Firebase, and GitHub for <strong className="text-slate-800">{MASTER_DATABASE_OWNER}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={runFullDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Testing Live Data Flow...' : 'Run Connectivity Test'}</span>
        </button>
      </div>

      {/* Diagnostics Results List */}
      {diagnostics && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Diagnostic Results</h4>
          <div className="space-y-2">
            {diagnostics.map((item, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  item.status === 'passed' 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                    : item.status === 'failed'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {item.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {item.status === 'failed' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span>{item.step}</span>
                  </div>
                  <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-md font-bold bg-white/70">
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed pl-6">{item.message}</p>
                {item.solution && (
                  <div className="ml-6 mt-1 p-2.5 bg-white/80 rounded-lg border border-current/20 text-[11px] font-medium leading-relaxed">
                    <strong>Remedy:</strong> {item.solution}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP-BY-STEP LIVE DEPLOYMENT SETUP GUIDE */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Step-by-Step Fixes for Live Data Updates on Netlify, GitHub & Firebase
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Item 1 */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              Google Drive Permissions (Top Reason)
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              When other users sign in from Netlify, their Google account calls the Sheets API. If the spreadsheet owned by <strong>{MASTER_DATABASE_OWNER}</strong> is private, Google returns <strong>403 Forbidden</strong> and forces local storage fallback.
            </p>
            <div className="p-2 bg-blue-50 rounded-lg text-[11px] text-blue-900 border border-blue-100 font-medium">
              Open the Google Sheet &gt; Click <strong>Share</strong> &gt; Set General Access to <strong>Anyone with the link can edit</strong> (or invite your team members as Editors).
            </div>
          </div>

          {/* Item 2 */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              Firebase Authorized Domains (Netlify Fix)
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              If your Netlify domain is not whitelisted, Google Sign-In popups will fail immediately with <code>auth/unauthorized-domain</code>.
            </p>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg text-[11px]">
              <span className="font-mono text-slate-700 truncate">{currentOrigin}</span>
              <button
                onClick={() => copyToClipboard(currentOrigin, 'origin')}
                className="shrink-0 px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 rounded font-semibold text-[10px] border border-slate-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedText === 'origin' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedText === 'origin' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Paste in: <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong>.
            </p>
          </div>

          {/* Item 3 */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Google Cloud OAuth Authorized JavaScript Origins
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              In Google Cloud Console under <strong>APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
              <li>Add your Netlify URL to <strong>Authorized JavaScript origins</strong></li>
              <li>Ensure <code>https://enterprise-erp-8a176.firebaseapp.com/__/auth/handler</code> is in <strong>Authorized redirect URIs</strong></li>
            </ul>
          </div>

          {/* Item 4 */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
              Netlify Environment Variables (Auto-Discovery)
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              To guarantee that all users visiting your Netlify app automatically connect to the same Google Sheet without typing an ID:
            </p>
            <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-lg">
              VITE_SPREADSHEET_ID = {spreadsheetId && spreadsheetId !== 'local-storage-db' ? spreadsheetId : 'your_google_sheet_id'}
            </div>
            <p className="text-[10px] text-slate-500">
              Add this in Netlify under <strong>Site configuration &gt; Environment variables</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDeploymentDiagnostic;
