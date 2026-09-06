import React from 'react';
import { X, Printer, Award, Calendar, User, Building, Briefcase, FileText, CheckCircle2 } from 'lucide-react';
import { EmployeePromotionRecord } from '../../lib/promotionEngine';
import { getCompanyName } from '../../lib/appSettings';
import { format } from 'date-fns';

interface PromotionLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: EmployeePromotionRecord | null;
}

export default function PromotionLetterModal({
  isOpen,
  onClose,
  promotion
}: PromotionLetterModalProps) {
  if (!isOpen || !promotion) return null;

  const companyName = getCompanyName();
  const formattedDate = (() => {
    try {
      return format(new Date(promotion.promotionDate), 'MMMM dd, yyyy');
    } catch {
      return promotion.promotionDate;
    }
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Action Header (Hidden on print) */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Promotion & Designation Letter</h3>
              <p className="text-[11px] text-slate-500 font-medium">Ref: {promotion.id} • {promotion.employeeName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#F87C6C] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Letter</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document */}
        <div className="p-8 sm:p-12 max-h-[80vh] overflow-y-auto bg-white text-slate-800 print:p-0 print:max-h-none print:overflow-visible">
          
          {/* Company Letterhead */}
          <div className="border-b-2 border-indigo-900 pb-5 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">{companyName}</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Corporate Human Resources & Talent Development Department</p>
              <p className="text-[11px] text-slate-400">Internal Career Advancement & Escalation Record</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-mono font-bold">
                REF: {promotion.id}
              </div>
              <p className="text-xs text-slate-500 mt-1">Date: <strong>{formattedDate}</strong></p>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 mb-6 flex flex-wrap justify-between items-center gap-3">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Employee Details</p>
              <h2 className="text-base font-black text-slate-900">{promotion.employeeName}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                <span>Staff ID: <strong className="font-mono text-slate-800">{promotion.employeeId}</strong></span>
                <span>•</span>
                <span>Department: <strong className="text-slate-800">{promotion.department}</strong></span>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Progression Category</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> {promotion.promotionType}
              </span>
            </div>
          </div>

          {/* Letter Body */}
          <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
            <p>
              Dear <strong>{promotion.employeeName}</strong>,
            </p>

            <p>
              On behalf of the executive management of <strong>{companyName}</strong>, we take immense pleasure in informing you that in recognition of your exemplary work performance, professionalism, and dedication towards company objectives, you have been officially promoted to the position of:
            </p>

            {/* Role Transition Highlight Card */}
            <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-amber-50/40 border border-indigo-100 flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous Title</span>
                <span className="text-sm font-semibold text-slate-600">{promotion.previousDesignation || 'Staff'}</span>
                {promotion.previousSalary && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Prev: BDT {promotion.previousSalary}</span>
                )}
              </div>

              <div className="px-3 text-indigo-600 font-black text-lg">
                ➔
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Promoted Designation</span>
                <span className="text-base font-black text-indigo-950">{promotion.newDesignation}</span>
                {promotion.newSalary && (
                  <span className="text-xs font-bold text-emerald-700 block mt-0.5">New Salary: BDT {promotion.newSalary}</span>
                )}
              </div>
            </div>

            <p>
              This promotion takes effect on <strong>{formattedDate}</strong> (Promotion Year: <strong>{promotion.promotionYear}</strong>). All revised compensation, allowances, and job responsibilities associated with this designation shall apply from the effective date.
            </p>

            {promotion.remarks && (
              <div className="p-3 bg-amber-50/60 border-l-4 border-amber-500 text-xs text-amber-950 rounded-r-xl">
                <strong>Management Appraisal Remarks:</strong> {promotion.remarks}
              </div>
            )}

            <p>
              We are confident that you will continue to discharge your duties with the same high level of commitment, leadership, and operational excellence. Please accept our hearty congratulations on this well-deserved career achievement.
            </p>

            <p className="pt-2">Sincerely yours,</p>
          </div>

          {/* Signatures */}
          <div className="mt-14 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-12 flex items-end justify-center">
                <span className="font-serif italic font-bold text-slate-700 text-base">{promotion.approvedBy}</span>
              </div>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-900">{promotion.approvedBy}</p>
                <p className="text-[10px] text-slate-500">Authorized Management / HR Authority</p>
                <p className="text-[10px] text-slate-400">{companyName}</p>
              </div>
            </div>

            <div>
              <div className="h-12 flex items-end justify-center">
                <span className="text-slate-300 italic text-xs">[Employee Signature]</span>
              </div>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-900">{promotion.employeeName}</p>
                <p className="text-[10px] text-slate-500">Employee Acknowledgment & Acceptance</p>
                <p className="text-[10px] text-slate-400">Date: ________________________</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
