import React from 'react';
import { X, Printer } from 'lucide-react';
import { CalculatedMachinePlanItem, MachinePlanSummaryKPIs } from '../../types/machinePlan';
import { formatNumeric } from '../../lib/machinePlanEngine';

interface MachinePlanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CalculatedMachinePlanItem[];
  kpis: MachinePlanSummaryKPIs;
  dateLabel: string;
}

export default function MachinePlanPrintModal({
  isOpen,
  onClose,
  items,
  kpis,
  dateLabel
}: MachinePlanPrintModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold">Print Preview: Machine Plan vs Achievement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-slate-900 font-sans" id="printable-machine-plan-report">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                Machine Plan vs Achievement Report
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Production Floor Capacity, Target Scheduling, Actual Output & UEE Visibility
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                Report Period / Date: <span className="underline decoration-blue-500 font-bold">{dateLabel}</span>
              </div>
            </div>

            <div className="text-right text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900">SML TRIMS BD</div>
              <div className="text-slate-500">Factory Operational Systems</div>
              <div className="text-[11px] text-slate-400">
                Printed: {new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} (BST)
              </div>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-6 gap-3 p-3 bg-slate-100 rounded-lg border border-slate-300 text-center text-xs mb-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Machines</span>
              <span className="text-base font-black text-slate-900">{kpis.totalMachines}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Plan Hours</span>
              <span className="text-base font-black text-slate-900">{kpis.totalPlanHours}h</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Output</span>
              <span className="text-base font-black text-slate-900">{formatNumeric(kpis.totalTargetOutput)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Actual Output</span>
              <span className="text-base font-black text-slate-900">{formatNumeric(kpis.totalActualOutput)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Achievement %</span>
              <span className="text-base font-black text-slate-900">
                {kpis.overallAchievementPct !== null ? `${kpis.overallAchievementPct}%` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg UEE %</span>
              <span className="text-base font-black text-slate-900">
                {kpis.averageUeePct !== null ? `${kpis.averageUeePct}%` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse text-[10px] mb-8">
            <thead>
              <tr className="bg-slate-200 border-y border-slate-400 font-bold text-slate-900">
                <th className="py-1.5 px-1.5 text-center">SL</th>
                <th className="py-1.5 px-1.5">Date</th>
                <th className="py-1.5 px-1.5">Department</th>
                <th className="py-1.5 px-1.5">UOM</th>
                <th className="py-1.5 px-1.5">Machine Model</th>
                <th className="py-1.5 px-1.5 text-right">Spec speed/H</th>
                <th className="py-1.5 px-1.5 text-right">Av. Working Hrs</th>
                <th className="py-1.5 px-1.5 text-right">Total</th>
                <th className="py-1.5 px-1.5 text-right">Cap. Imp/Hrs</th>
                <th className="py-1.5 px-1.5 text-right">Plan Hrs</th>
                <th className="py-1.5 px-1.5">Status</th>
                <th className="py-1.5 px-1.5 text-right">Target Output</th>
                <th className="py-1.5 px-1.5 text-right">Actual Output</th>
                <th className="py-1.5 px-1.5">SKU</th>
                <th className="py-1.5 px-1.5">MO</th>
                <th className="py-1.5 px-1.5 text-center">Total UEE%</th>
                <th className="py-1.5 px-1.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-1.5 px-1.5 text-center font-bold">{item.sl}</td>
                  <td className="py-1.5 px-1.5">{item.date}</td>
                  <td className="py-1.5 px-1.5 font-semibold">{item.department}</td>
                  <td className="py-1.5 px-1.5">{item.uom}</td>
                  <td className="py-1.5 px-1.5 font-bold">{item.machineModel}</td>
                  <td className="py-1.5 px-1.5 text-right">{formatNumeric(item.specSpeedPerHour)}</td>
                  <td className="py-1.5 px-1.5 text-right">{item.avWorkingHours.toFixed(1)}</td>
                  <td className="py-1.5 px-1.5 text-right">{item.totalCapacityBasis.toFixed(1)}</td>
                  <td className="py-1.5 px-1.5 text-right">{formatNumeric(item.capacityImplementPerHour)}</td>
                  <td className="py-1.5 px-1.5 text-right font-bold">{item.planHours.toFixed(1)}</td>
                  <td className="py-1.5 px-1.5">{item.machineStatus}</td>
                  <td className="py-1.5 px-1.5 text-right font-semibold">{formatNumeric(item.targetOutput)}</td>
                  <td className="py-1.5 px-1.5 text-right font-bold">{formatNumeric(item.actualOutput)}</td>
                  <td className="py-1.5 px-1.5 font-mono">{item.sku || '-'}</td>
                  <td className="py-1.5 px-1.5 font-mono">{item.mo || '-'}</td>
                  <td className="py-1.5 px-1.5 text-center font-bold">
                    {item.totalUeePct !== null ? `${item.totalUeePct.toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="py-1.5 px-1.5 text-slate-700">{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-bold border-t-2 border-slate-500">
                <td colSpan={9} className="py-2 px-1.5 text-right">
                  Summary Totals ({items.length} Machines):
                </td>
                <td className="py-2 px-1.5 text-right">{kpis.totalPlanHours}h</td>
                <td></td>
                <td className="py-2 px-1.5 text-right">{formatNumeric(kpis.totalTargetOutput)}</td>
                <td className="py-2 px-1.5 text-right">{formatNumeric(kpis.totalActualOutput)}</td>
                <td colSpan={2}></td>
                <td className="py-2 px-1.5 text-center">
                  {kpis.averageUeePct !== null ? `${kpis.averageUeePct}%` : 'N/A'}
                </td>
                <td className="py-2 px-1.5">
                  Gap: {kpis.productionGap >= 0 ? `+${formatNumeric(kpis.productionGap)}` : formatNumeric(kpis.productionGap)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-300 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto h-8"></div>
              <p className="font-bold text-slate-800">Prepared by</p>
              <p className="text-[10px] text-slate-500">Operator / Production Planner</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto h-8"></div>
              <p className="font-bold text-slate-800">Checked & Verified by</p>
              <p className="text-[10px] text-slate-500">Floor Supervisor</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto h-8"></div>
              <p className="font-bold text-slate-800">Approved by</p>
              <p className="text-[10px] text-slate-500">Production / Factory Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
