import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Download, Copy, Check, X, ShieldCheck, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ActionModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'unmatched' | 'confirm' | 'info';
  title: string;
  message?: string;
  details?: string[];
  unmatchedIds?: string[];
  unmatchedRows?: any[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function ActionModalNotification({
  isOpen,
  type,
  title,
  message,
  details = [],
  unmatchedIds = [],
  unmatchedRows = [],
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onClose
}: ActionModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyUnmatched = () => {
    if (unmatchedIds.length > 0) {
      navigator.clipboard.writeText(unmatchedIds.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadUnmatched = () => {
    if (unmatchedRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(unmatchedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Unmatched_Records');
      XLSX.writeFile(wb, `Unmatched_Records_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } else if (unmatchedIds.length > 0) {
      const data = unmatchedIds.map(id => ({ 'Unmatched ID': id, 'Status': 'Validation skipped / not found' }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Unmatched_IDs');
      XLSX.writeFile(wb, `Unmatched_IDs_${new Date().toISOString().substring(0, 10)}.xlsx`);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-10 h-10 text-rose-500" />;
      case 'unmatched':
      case 'warning':
        return <AlertTriangle className="w-10 h-10 text-amber-500" />;
      default:
        return <Info className="w-10 h-10 text-indigo-500" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-950 border-emerald-100';
      case 'error':
        return 'bg-rose-50 text-rose-950 border-rose-100';
      case 'unmatched':
      case 'warning':
        return 'bg-amber-50 text-amber-950 border-amber-100';
      default:
        return 'bg-indigo-50 text-indigo-950 border-indigo-100';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className={`p-5 flex items-start gap-4 border-b ${getHeaderBg()}`}>
            <div className="shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
              {message && <p className="text-xs mt-1 text-slate-600 leading-relaxed">{message}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Details list */}
            {details.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 text-slate-700">
                {details.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-black">•</span>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Unmatched IDs Section */}
            {type === 'unmatched' && unmatchedIds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Unmatched Records ({unmatchedIds.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyUnmatched}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleDownloadUnmatched}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Excel
                    </button>
                  </div>
                </div>

                <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {unmatchedIds.map((id, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-center shadow-2xs"
                      >
                        {id}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                if (onConfirm) {
                  onConfirm();
                } else {
                  onClose();
                }
              }}
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-colors shadow-sm flex items-center gap-2 ${
                type === 'error' || type === 'unmatched'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
