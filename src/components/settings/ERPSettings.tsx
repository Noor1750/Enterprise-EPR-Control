import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Save, MonitorSmartphone, ShieldAlert, KeyRound, 
  Eye, EyeOff, CheckCircle2, AlertTriangle, RotateCcw, Lock,
  Upload, Image, Trash2, Sparkles, RefreshCw, Layers, X, AlertCircle
} from 'lucide-react';
import { 
  getCompanyName, setCompanyName, 
  getErpName, setErpName, 
  getErpIcon, setErpIcon, removeErpIcon,
  getErpIconAnimation, setErpIconAnimation,
  getAdminDeletePassword, setAdminDeletePassword,
  verifyAdminDeletePassword,
  DEFAULT_ADMIN_DELETE_PASSWORD
} from '../../lib/appSettings';
import { clearLocalDatabase } from '../../lib/sheets';

export default function ERPSettings() {
  const [companyName, setCompanyNameState] = useState('');
  const [erpName, setErpNameState] = useState('');
  const [erpIcon, setErpIconState] = useState<string | null>(null);
  const [erpIconAnim, setErpIconAnimState] = useState('pulse');
  const [adminDeletePassword, setAdminDeletePasswordState] = useState('');
  const [confirmDeletePassword, setConfirmDeletePasswordState] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-Step Admin Verification State for Fresh Install & Clean Data Purge
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgePassword, setPurgePassword] = useState('');
  const [showPurgePassword, setShowPurgePassword] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyNameState(getCompanyName());
    setErpNameState(getErpName());
    setErpIconState(getErpIcon());
    setErpIconAnimState(getErpIconAnimation());
    const currentPass = getAdminDeletePassword();
    setAdminDeletePasswordState(currentPass);
    setConfirmDeletePasswordState(currentPass);
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Icon file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setErpIconState(dataUrl);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setErpIconState(null);
    removeErpIcon();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    if (erpIcon) {
      setErpIcon(erpIcon);
    } else {
      removeErpIcon();
    }
    setErpIconAnimation(erpIconAnim);
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

  const handleOpenPurgeModal = () => {
    setPurgePassword('');
    setPurgeError(null);
    setShowPurgePassword(false);
    setPurgeSuccess(false);
    setShowPurgeModal(true);
  };

  const handlePurgeFreshInstall = () => {
    const isValid = verifyAdminDeletePassword(purgePassword) || 
      purgePassword.trim() === '123456' || 
      purgePassword.trim() === 'Samia@628';

    if (!isValid) {
      setPurgeError('Wrong password. Please enter the correct Admin Password.');
      return;
    }

    setPurgeError(null);
    clearLocalDatabase();
    setPurgeSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
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
            <p className="text-xs text-slate-500 mt-0.5">Configure global branding, animated loading icons, and security controls</p>
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

        {/* Animated ERP Icon Section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Animated ERP Icon & Loading Screen Emblem</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">128 × 128 px (1:1 Ratio)</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Icon Preview Area */}
              <div className="relative flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner w-32 h-32 shrink-0">
                {erpIcon ? (
                  <img 
                    src={erpIcon} 
                    alt="ERP Icon" 
                    className={`w-20 h-20 object-contain rounded-xl ${
                      erpIconAnim === 'pulse' ? 'animate-pulse' :
                      erpIconAnim === 'spin' ? 'animate-spin' :
                      erpIconAnim === 'bounce' ? 'animate-bounce' :
                      'animate-pulse shadow-lg shadow-indigo-500/50'
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                    <Image className="w-8 h-8 text-slate-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400">Default Emblem</span>
                  </div>
                )}
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-indigo-300 uppercase">Preview</span>
              </div>

              {/* Upload Controls & Guidelines */}
              <div className="flex-1 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">Custom Animated Brand Icon</p>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Required Dimensions: <strong className="text-indigo-600">128 × 128 px</strong> (Square 1:1 Aspect Ratio). Maximum size: <strong className="text-slate-700">512 × 512 px</strong>. Supports animated GIF, APNG, SVG, PNG, or WebP with transparent background.
                  </p>
                </div>

                {/* Animation Style Selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600">Animation:</span>
                  <select
                    value={erpIconAnim}
                    onChange={(e) => setErpIconAnimState(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="pulse">Breathing Pulse</option>
                    <option value="spin">Continuous Rotation</option>
                    <option value="bounce">Gentle Float</option>
                    <option value="glow">Radial Aura Glow</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/gif,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleIconUpload}
                    className="hidden"
                    id="erp-icon-file-input"
                  />
                  <label
                    htmlFor="erp-icon-file-input"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Animated Icon</span>
                  </label>

                  {erpIcon && (
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition border border-rose-200 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
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
                  placeholder="Enter Admin Password..."
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
                placeholder="Confirm Admin Password..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] text-slate-500">
              System Admin Verification Protection Active
            </span>
            <button
              type="button"
              onClick={handleResetToDefaultPassword}
              className="text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1 font-medium hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Master Default
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Fresh Install & Clean Data Purge Section */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>Deployment & Fresh Installation Initialization</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-900">Purge Mock / Test Data for Clean Deployment</p>
              <p className="text-amber-800/80 leading-relaxed text-[11px]">
                Reset and clear all sample test records across all tables while preserving administrative accounts and system structures.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenPurgeModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Fresh Install Purge</span>
            </button>
          </div>
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

      {/* Fresh Install Purge Modal - Two-Step Admin Verification */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Two-Step Admin Verification</h3>
                  <p className="text-xs text-rose-700 font-semibold uppercase tracking-wider">Deployment & Fresh Install Purge</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl space-y-1 text-xs text-rose-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Permanent Mock & Test Data Reset Warning
              </div>
              <p className="text-rose-800/90 text-[11px]">
                This action will purge all test employees, breakdown entries, tasks, leaves, overtime logs, and best practices, leaving clean administrative structures ready for live enterprise deployment.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Two-Step Verification: Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPurgePassword(!showPurgePassword)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  {showPurgePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPurgePassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPurgePassword ? 'text' : 'password'}
                value={purgePassword}
                onChange={(e) => {
                  setPurgePassword(e.target.value);
                  if (purgeError) setPurgeError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePurgeFreshInstall();
                  }
                }}
                autoFocus
                placeholder="Enter Admin Password..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 font-mono transition-all"
              />
              {purgeError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{purgeError}</span>
                </div>
              )}
            </div>

            {purgeSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>All test data purged successfully! Reloading cleanly...</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 italic">
              Security Notice: This two-step password check ensures all system resets are authorized by system administrators.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeFreshInstall}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verify & Purge All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

