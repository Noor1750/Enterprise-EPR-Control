import React, { useState, useEffect } from 'react';
import { 
  Building2, Save, MonitorSmartphone, ShieldAlert, KeyRound, 
  Eye, EyeOff, CheckCircle2, AlertTriangle, RotateCcw, Lock
} from 'lucide-react';
import { 
  getCompanyName, setCompanyName, 
  getErpName, setErpName, 
  getAdminDeletePassword, setAdminDeletePassword,
  DEFAULT_ADMIN_DELETE_PASSWORD
} from '../../lib/appSettings';

export default function ERPSettings() {
  const [companyName, setCompanyNameState] = useState('');
  const [erpName, setErpNameState] = useState('');
  const [adminDeletePassword, setAdminDeletePasswordState] = useState('');
  const [confirmDeletePassword, setConfirmDeletePasswordState] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompanyNameState(getCompanyName());
    setErpNameState(getErpName());
    const currentPass = getAdminDeletePassword();
    setAdminDeletePasswordState(currentPass);
    setConfirmDeletePasswordState(currentPass);
  }, []);

  const handleSave = () => {
    setError(null);

    // Validation for admin delete password
    if (!adminDeletePassword.trim()) {
      setError('Admin Deletion Password cannot be empty.');
      return;
    }

    if (adminDeletePassword !== confirmDeletePassword) {
      setError('Admin Deletion Password and confirmation do not match.');
      return;
    }

    setCompanyName(companyName);
    setErpName(erpName);
    setAdminDeletePassword(adminDeletePassword.trim());
    
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Reload page to reflect company/ERP name globally
      window.location.reload();
    }, 1200);
  };

  const handleResetToDefaultPassword = () => {
    setAdminDeletePasswordState(DEFAULT_ADMIN_DELETE_PASSWORD);
    setConfirmDeletePasswordState(DEFAULT_ADMIN_DELETE_PASSWORD);
    setError(null);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden max-w-2xl mx-auto my-8">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ERP Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure global branding and data deletion security controls</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Company & System Name Branding */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            Application Identity & Branding
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Company Name</label>
            <p className="text-xs text-slate-500 mb-2">This name will be displayed on the login screen, navigation headers, and export headers.</p>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyNameState(e.target.value)}
              placeholder="e.g., SML Trims"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">System / ERP Name</label>
            <p className="text-xs text-slate-500 mb-2">This name is used for the application title inside navigators and headers.</p>
            <input
              type="text"
              value={erpName}
              onChange={(e) => setErpNameState(e.target.value)}
              placeholder="e.g., Enterprise ERP"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Data Deletion Security Section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Data Deletion Security (Admin Master Password)</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Active Protection
            </span>
          </div>

          <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs text-rose-900">
                <p className="font-bold">Mandatory Data Delete Authorization</p>
                <p className="text-rose-800/90 leading-relaxed font-normal">
                  Any delete action across the ERP (Employees, Tasks, Breakdown Logs, Leaves, KPIs, Holidays, Best Practices, Users, etc.) requires verifying this password before the record is permanently deleted.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Admin Deletion Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminDeletePassword}
                  onChange={(e) => {
                    setAdminDeletePasswordState(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter Admin Delete Password..."
                  className="w-full pl-3.5 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Confirm Admin Deletion Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmDeletePassword}
                onChange={(e) => {
                  setConfirmDeletePasswordState(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Confirm password..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] text-slate-500">
              Default system password: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">123456</code>
            </span>
            <button
              type="button"
              onClick={handleResetToDefaultPassword}
              className="text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1 font-medium hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Default (123456)
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Save CTA */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {saved ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully!
              </span>
            ) : (
              <span>Changes apply system-wide immediately.</span>
            )}
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save ERP Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

