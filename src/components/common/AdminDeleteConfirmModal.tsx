import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, ShieldAlert, KeyRound, Eye, EyeOff, 
  Trash2, X, Lock, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { verifyAdminDeletePassword } from '../../lib/appSettings';

export interface AdminDeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemDetails?: string | React.ReactNode;
  warningMessage?: string;
  confirmButtonText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const AdminDeleteConfirmModal: React.FC<AdminDeleteConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Data Deletion',
  itemName,
  itemDetails,
  warningMessage = 'This record will be permanently deleted from the database. This action cannot be reversed.',
  confirmButtonText = 'Verify & Permanently Delete',
  onConfirm,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleVerifyAndDelete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password.trim()) {
      setError('Please enter the Admin Deletion Password.');
      inputRef.current?.focus();
      return;
    }

    const isValid = verifyAdminDeletePassword(password);
    if (!isValid) {
      setError('Incorrect Admin Deletion Password. Please verify the password set under Settings → ERP Settings.');
      inputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Delete action failed:', err);
      setError(err?.message || 'Failed to delete record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="admin-delete-confirm-overlay"
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-50 to-white px-6 py-4 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {title}
                </h3>
                <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                  Admin Authorization Required
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleVerifyAndDelete} className="p-6 space-y-4">
            {/* Target Item Information Box */}
            {(itemName || itemDetails) && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Record for Deletion
                </div>
                {itemName && (
                  <div className="text-sm font-bold text-slate-900 break-words">
                    {itemName}
                  </div>
                )}
                {itemDetails && (
                  <div className="text-xs text-slate-600 mt-1 break-words">
                    {itemDetails}
                  </div>
                )}
              </div>
            )}

            {/* Warning Text */}
            <div className="flex items-start gap-2.5 p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-rose-900 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Permanent Deletion Warning: </span>
                {warningMessage}
              </div>
            </div>

            {/* Admin Password Input */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Admin Deletion Password</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Set in ERP Settings
                </span>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="Enter Admin Deletion Password..."
                  className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-hidden ${
                    error 
                      ? 'border-rose-400 ring-2 ring-rose-100 text-rose-900 bg-rose-50/30' 
                      : 'border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Security Notice: This two-step password check ensures all deletions are authorized by system administrators.
            </p>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{confirmButtonText}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdminDeleteConfirmModal;
