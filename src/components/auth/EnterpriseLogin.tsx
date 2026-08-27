import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, 
  Loader2, ArrowRight, HelpCircle, KeyRound, Building2, User, 
  ExternalLink, Sparkles, RefreshCw
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
  errorMessage,
  onClearError
}: EnterpriseLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  
  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  // Track Caps Lock key state
  const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-900 to-slate-950 pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        
        {/* App Logo & Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 mb-3 border border-blue-400/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl flex items-center justify-center gap-2">
            <span>{getCompanyName().toUpperCase()}</span>
            <span className="text-blue-400 font-light">ERP</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide uppercase">
            Operations & Manufacturing Control System
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100/90 overflow-hidden">
          
          {/* Card Top Banner */}
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign In to Workspace</h2>
              <p className="text-xs text-slate-500">Firebase Authenticated & Secured</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Popup Blocked Warning */}
            {isPopupBlocked && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Open New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearPopupBlocked) onClearPopupBlocked();
                      onGoogleLogin();
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-medium"
                  >
                    Retry Login
                  </button>
                </div>
              </div>
            )}

            {/* Standard Email / Employee ID Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email or Employee ID
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. noor.alam1750@gmail.com or EMP001"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyActivity}
                    onKeyUp={handleKeyActivity}
                    placeholder="Enter your password"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Caps Lock Indicator */}
                {isCapsLockOn && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 animate-fadeIn">
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
                    className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-600">Remember me on this device</span>
                </label>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password}
                className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:pointer-events-none"
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

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Or Continue With
              </span>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs sm:text-sm font-bold shadow-xs hover:border-slate-300 transition active:scale-[0.99] disabled:opacity-50"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google logo"
                className="w-4 h-4"
              />
              <span>Continue with Google</span>
            </button>

          </div>

          {/* Card Footer: Enterprise Security Notice */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Unregistered or need access?{' '}
              <span className="font-semibold text-slate-700">Contact System Administrator</span>
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
                      placeholder="e.g. noor.alam1750@gmail.com or EMP001"
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
