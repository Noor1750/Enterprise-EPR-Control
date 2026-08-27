import React from 'react';
import { 
  ShieldAlert, Lock, MailCheck, Sliders, LogOut, Mail, 
  ExternalLink, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { getCompanyName, getErpName } from '../../lib/appSettings';

interface AuthStatusScreenProps {
  type: 'not-registered' | 'inactive' | 'verification-required' | 'setup-incomplete';
  userEmail?: string | null;
  message?: string | null;
  onLogout: () => void;
  onResendVerification?: () => Promise<void>;
  onRefreshVerification?: () => Promise<void>;
  onOpenSettings?: () => void;
  isAdmin?: boolean;
}

export default function AuthStatusScreens({
  type,
  userEmail,
  message,
  onLogout,
  onResendVerification,
  onRefreshVerification,
  onOpenSettings,
  isAdmin = false
}: AuthStatusScreenProps) {
  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleResend = async () => {
    if (!onResendVerification) return;
    setResendStatus('sending');
    try {
      await onResendVerification();
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 6000);
    } catch (_) {
      setResendStatus('idle');
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshVerification) return;
    setIsRefreshing(true);
    try {
      await onRefreshVerification();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-900 to-slate-950 pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-lg z-10">
        
        {/* Container Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-center">
          
          {/* Header Visual based on state */}
          <div className="p-8 sm:p-10 space-y-4">
            
            {type === 'not-registered' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Account Not Registered
                </h2>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono inline-block max-w-full truncate">
                  {userEmail || 'Authenticated User'}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  {message || 'Your authentication was successful, but your account has not been authorized by the system administrator. Public access is disabled.'}
                </p>
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 text-left text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <Mail className="w-3.5 h-3.5" />
                    <span>How to get authorized:</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Contact {getCompanyName()} Administration (<span className="font-semibold">smltrimsbd@gmail.com</span> or <span className="font-semibold">noor.alam1750@gmail.com</span>) with your employee credentials to assign your role.
                  </p>
                </div>
              </>
            )}

            {type === 'inactive' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Account Inactive
                </h2>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono inline-block max-w-full truncate">
                  {userEmail || 'Active Profile Check'}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  {message || 'Your application account is currently marked as Inactive or Suspended in the security registry. Please contact your supervisor or administrator.'}
                </p>
              </>
            )}

            {type === 'verification-required' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
                  <MailCheck className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Email Verification Required
                </h2>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono inline-block max-w-full truncate">
                  {userEmail || 'Registered Email'}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  To access enterprise modules, please verify your email address. Check your inbox and click the verification link.
                </p>

                {resendStatus === 'sent' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verification email sent! Please check your inbox.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === 'sending'}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Resend Email</span>
                  </button>
                </div>
              </>
            )}

            {type === 'setup-incomplete' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-inner">
                  <Sliders className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Account Setup Incomplete
                </h2>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono inline-block max-w-full truncate">
                  {userEmail || 'Security Setup'}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  {message || 'Your account is authenticated, but some required settings (role, department, supervisor, or navigator assignment) have not been configured yet.'}
                </p>

                {isAdmin && onOpenSettings && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Open Security & Access Control →
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Card Action Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>

        {/* Brand Bottom Link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {getCompanyName()}. {getErpName()}.</p>
        </div>

      </div>
    </div>
  );
}
