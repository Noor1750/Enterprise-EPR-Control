import React from 'react';
import { History, X, Clock } from 'lucide-react';
import { EmployeeShiftState, ShiftHistoryRecord, getShiftModeBadgeStyles } from '../../lib/shiftEngine';
import ShiftBadge from '../common/ShiftBadge';
import { format } from 'date-fns';

interface ShiftHistoryModalProps {
  employee: EmployeeShiftState | null;
  shiftHistoryRaw: string[][];
  onClose: () => void;
}

export default function ShiftHistoryModal({
  employee,
  shiftHistoryRaw,
  onClose
}: ShiftHistoryModalProps) {
  if (!employee) return null;

  // Filter history for this employee
  const empHistory: ShiftHistoryRecord[] = shiftHistoryRaw
    .filter(row => (row[1] || '').trim().toUpperCase() === employee.id.toUpperCase())
    .map(row => ({
      historyId: row[0] || '',
      employeeId: row[1] || '',
      employeeName: row[2] || '',
      previousShift: row[3] || '',
      newShift: row[4] || '',
      effectiveDate: row[5] || '',
      assignmentType: (row[6] || 'Automatic Rotation') as any,
      changedBy: row[7] || '',
      changedAt: row[8] || '',
      remarks: row[9] || ''
    }))
    .reverse();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Shift Assignment History</h3>
              <p className="text-xs text-slate-500">
                {employee.name} ({employee.id}) • {employee.department}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {empHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No shift changes recorded yet.</p>
            <p className="text-slate-400 mt-1">This employee is running on baseline shift rotation rules.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Transition</th>
                  <th className="px-3 py-2.5">Effective Date</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Changed By</th>
                  <th className="px-3 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {empHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                      {item.changedAt ? format(new Date(item.changedAt), 'dd-MMM-yyyy HH:mm') : '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        {item.previousShift ? (
                          <ShiftBadge shift={item.previousShift} size="xs" />
                        ) : (
                          <span className="font-semibold text-slate-400 text-[11px]">Initial</span>
                        )}
                        <span className="text-slate-400">→</span>
                        <ShiftBadge shift={item.newShift} size="xs" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{item.effectiveDate}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getShiftModeBadgeStyles(item.assignmentType).bg}`}>
                        {item.assignmentType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-medium">{item.changedBy || 'Admin'}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-xs truncate">{item.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
