import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, 
  Loader2, ArrowRight, HelpCircle, KeyRound, Building2, User, 
  ExternalLink, Sparkles, RefreshCw, Copy, Check
} from 'lucide-react';
import { getCompanyName, getErpName } from '../../lib/appSettings';

interface EnterpriseLoginProps {
  onEmailPasswordLogin: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onForgotPassword: (identifier: string) => Promise<void>;
  isLoading: boolean;
  loadingStepText?: string;
  isPopupBlocked?: boolean;
  onClearPopupBlocked?: () => void;
  unauthorizedDomain?: string | null;
  onClearUnauthorizedDomain?: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export default function EnterpriseLogin({
  onEmailPasswordLogin,
  onGoogleLogin,
  onForgotPassword,
  isLoading,
  loadingStepText = 'Signing you in...',
  isPopupBlocked = false,
  onClearPopupBlocked,
  unauthorizedDomain,
  onClearUnauthorizedDomain,
  errorMessage,
  onClearError
}: EnterpriseLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  
  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Track Caps Lock key state
  const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    if (password.length < 6) {
      return;
    }
    if (onClearError) onClearError();
    await onEmailPasswordLogin(identifier.trim(), password, rememberMe);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setIsSendingReset(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await onForgotPassword(forgotIdentifier.trim());
      setResetSuccessMessage('If an account is associated with this email or Employee ID, password reset instructions have been sent. Please check your email.');
    } catch (err: any) {
      setResetErrorMessage('Unable to process password reset request. Please contact your system administrator.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.18),rgba(15,23,42,1))] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        
        {/* App Logo & Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 shadow-xl shadow-emerald-500/20 mb-3.5 border border-emerald-400/30 group hover:scale-105 transition-transform">
            <Shield className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl flex items-center justify-center gap-2">
            <span>{getCompanyName().toUpperCase()}</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent font-black">ERP</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-bold tracking-wider uppercase">
            Smart Operations & Manufacturing Control
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden ring-1 ring-black/5">
          
          {/* Card Top Banner */}
          <div className="bg-slate-50/90 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Sign In to Workspace</h2>
              <p className="text-xs text-slate-500 font-medium">Enterprise Secured Access</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Popup Blocked Warning */}
            {isPopupBlocked && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Google Sign-In Popup Blocked</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Your browser or iframe preview blocked the sign-in popup. Open the app in a new browser tab or click retry.
                </p>
                <div className="flex gap-2 pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Open New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearPopupBlocked) onClearPopupBlocked();
                      onGoogleLogin();
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-medium"
                  >
                    Retry Login
                  </button>
                </div>
              </div>
            )}

            {/* Firebase Unauthorized Domain Helper */}
            {unauthorizedDomain && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Authorize Domain in Firebase</span>
                  </div>
                  {onClearUnauthorizedDomain && (
                    <button
                      type="button"
                      onClick={onClearUnauthorizedDomain}
                      className="text-xs text-indigo-400 hover:text-indigo-700 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Firebase Authentication requires your current app domain to be added to Authorized Domains before Google Sign-In can proceed:
                </p>
                <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-indigo-200 font-mono text-[11px] text-indigo-900 select-all">
                  <span className="flex-1 truncate">{unauthorizedDomain}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(unauthorizedDomain);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[10px] font-bold shrink-0 transition"
                  >
                    {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-indigo-800 space-y-1 bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                  <p className="font-bold text-[10px] text-indigo-900 uppercase tracking-wider">How to add in 10 seconds:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-indigo-700">
                    <li>Go to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</li>
                    <li>Click <strong>&ldquo;Add domain&rdquo;</strong> and paste the domain above</li>
                  </ol>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href="https://console.firebase.google.com/project/enterprise-erp-8a176/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Open Firebase Settings <ExternalLink className="w-3 h-3" />
                  </a>
                  {onClearUnauthorizedDomain && (
                    <button
                      type="button"
                      onClick={onClearUnauthorizedDomain}
                      className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-medium"
                    >
                      Use Email &amp; Password
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Standard Email / Employee ID Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email or Employee ID
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or Employee ID"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyActivity}
                    onKeyUp={handleKeyActivity}
                    placeholder="Enter password (min 6 characters)"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password length helper */}
                {password.length > 0 && password.length < 6 && (
                  <p className="mt-1.5 text-[11px] font-semibold text-amber-600 animate-in fade-in">
                    Password must be at least 6 characters (Firebase Authentication requirement).
                  </p>
                )}

                {/* Caps Lock Indicator */}
                {isCapsLockOn && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Caps Lock is ON</span>
                  </div>
                )}
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs font-semibold text-slate-600">Remember me on this device</span>
                </label>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password}
                className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{loadingStepText}</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Card Footer: Enterprise Security Notice */}
          <div className="bg-slate-50/90 px-6 py-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Unregistered or need access?{' '}
              <span className="font-bold text-slate-800">Contact System Administrator</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Authorized personnel only. All access attempts are monitored and logged.
            </p>
          </div>
        </div>

        {/* Global Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {getCompanyName()}. {getErpName()}.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Password</h3>
                  <p className="text-[11px] text-slate-400">Send password recovery instructions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resetSuccessMessage ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-center animate-fadeIn">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-900">Recovery Instructions Dispatched</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {resetSuccessMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSuccessMessage(null);
                    }}
                    className="mt-3 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your registered email address or Employee ID. We will verify authorization and send you a secure Firebase reset link.
                  </p>

                  {resetErrorMessage && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      {resetErrorMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Registered Email or Employee ID
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="Enter registered email or Employee ID"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset || !forgotIdentifier.trim()}
                      className="w-1/2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
