import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Download, Copy, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface NotificationModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'unmatched' | 'confirm';
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

export default function KPIModalNotification({
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
}: NotificationModalProps) {
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
      XLSX.utils.book_append_sheet(wb, ws, 'Unmatched_KPI_Records');
      XLSX.writeFile(wb, `Unmatched_KPI_Employees_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } else if (unmatchedIds.length > 0) {
      const data = unmatchedIds.map(id => ({ 'Unmatched Employee ID': id, 'Status': 'Not found in master employee database' }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Unmatched_IDs');
      XLSX.writeFile(wb, `Unmatched_Employee_IDs_${new Date().toISOString().substring(0, 10)}.xlsx`);
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
        return <Info className="w-10 h-10 text-blue-500" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-900 border-emerald-100';
      case 'error':
        return 'bg-rose-50 text-rose-900 border-rose-100';
      case 'unmatched':
      case 'warning':
        return 'bg-amber-50 text-amber-900 border-amber-100';
      default:
        return 'bg-blue-50 text-blue-900 border-blue-100';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className={`p-5 flex items-start gap-4 border-b ${getHeaderBg()}`}>
            <div className="shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              {message && <p className="text-sm mt-1 text-gray-600 leading-relaxed">{message}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Details list */}
            {details.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 text-gray-700">
                {details.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-gray-400 font-bold">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Unmatched IDs Section */}
            {type === 'unmatched' && unmatchedIds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Unmatched Employee IDs ({unmatchedIds.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyUnmatched}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy IDs'}
                    </button>
                    <button
                      onClick={handleDownloadUnmatched}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Excel
                    </button>
                  </div>
                </div>

                <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {unmatchedIds.map((id, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 text-rose-700 px-2.5 py-1 rounded text-xs font-mono font-bold text-center shadow-2xs"
                      >
                        {id}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">
                  * These records were skipped because they do not exist in the master employee directory.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-2xs"
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
                type === 'error' || type === 'unmatched'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#26B99A] hover:bg-[#169F85]'
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
