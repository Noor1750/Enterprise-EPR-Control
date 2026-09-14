import React from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  MoreVertical,
  ChevronRight,
  PowerOff
} from 'lucide-react';
import { 
  CalculatedMachinePlanItem, 
  MachinePlanThresholds, 
  MachinePlanSettings,
  MachineStatusType 
} from '../../types/machinePlan';
import { formatNumeric, getMachineTargetUee, isUeeFailed } from '../../lib/machinePlanEngine';

interface MachinePlanTableProps {
  items: CalculatedMachinePlanItem[];
  sortField: keyof CalculatedMachinePlanItem | 'sl';
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof CalculatedMachinePlanItem | 'sl') => void;
  thresholds: MachinePlanThresholds;
  settings?: MachinePlanSettings;
  canEdit: boolean;
  onSelectRecord: (record: CalculatedMachinePlanItem) => void;
  onEditRecord: (record: CalculatedMachinePlanItem) => void;
  onQuickStatusChange?: (recordId: string, newStatus: MachineStatusType) => void;
  onPutOffRecord?: (record: CalculatedMachinePlanItem) => void;
}

export default function MachinePlanTable({
  items,
  sortField,
  sortDirection,
  onSort,
  thresholds,
  settings,
  canEdit,
  onSelectRecord,
  onEditRecord,
  onQuickStatusChange,
  onPutOffRecord
}: MachinePlanTableProps) {
  // Sort icon renderer
  const renderSortIcon = (field: keyof CalculatedMachinePlanItem | 'sl') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  // Status Badge styling
  const getStatusBadge = (status: MachineStatusType) => {
    switch (status) {
      case 'Running':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Planned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Idle':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Breakdown':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse';
      case 'Maintenance':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Off':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'Holiday':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Completed':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Partially Completed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'No Plan':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Achievement % Color Badge
  const getAchievementBadge = (pct: number | null) => {
    if (pct === null) return 'text-slate-400 bg-slate-50 border-slate-200';
    if (pct >= thresholds.achievementExcellent) return 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold';
    if (pct >= thresholds.achievementGood) return 'text-sky-700 bg-sky-50 border-sky-200 font-semibold';
    if (pct >= thresholds.achievementAttention) return 'text-amber-700 bg-amber-50 border-amber-200 font-semibold';
    return 'text-rose-700 bg-rose-50 border-rose-200 font-bold';
  };

  // UEE % Color Badge - machine-wise target comparison
  // "machine wise target UEE percentage & Department wise scrap percentage. if the target over, than it will be red other than red will be green for both part UEE & Scrap."
  const getUeeBadge = (machineModel: string, uee: number | null) => {
    if (uee === null || isNaN(uee)) return 'text-slate-400 bg-slate-50 border-slate-200';
    const failed = isUeeFailed(machineModel, uee, settings);
    if (failed) {
      return 'text-rose-700 bg-rose-50 border-rose-200 font-bold'; // Red if target missed
    }
    return 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold'; // Green if target reached
  };

  // Table summary calculations
  const totalPlanHours = items.reduce((acc, curr) => acc + curr.planHours, 0);
  const totalTargetOutput = items.reduce((acc, curr) => acc + curr.targetOutput, 0);
  const totalActualOutput = items.reduce((acc, curr) => acc + curr.actualOutput, 0);
  const overallAchievement = totalTargetOutput > 0 ? (totalActualOutput / totalTargetOutput) * 100 : null;
  const validUeeItems = items.filter(i => i.totalUeePct !== null);
  const avgUee = validUeeItems.length > 0 
    ? validUeeItems.reduce((acc, curr) => acc + (curr.totalUeePct || 0), 0) / validUeeItems.length 
    : null;
  const netGap = totalActualOutput - totalTargetOutput;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col" id="machine-plan-table-wrapper">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[1550px]" id="machine-plan-primary-table">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 select-none">
              {/* 1. SL */}
              <th 
                onClick={() => onSort('sl')} 
                className="py-3 px-3 font-semibold text-center w-12 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>SL</span>
                  {renderSortIcon('sl')}
                </div>
              </th>

              {/* 2. Date */}
              <th 
                onClick={() => onSort('date')} 
                className="py-3 px-3 font-semibold w-24 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  {renderSortIcon('date')}
                </div>
              </th>

              {/* 3. Department */}
              <th 
                onClick={() => onSort('department')} 
                className="py-3 px-3 font-semibold w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Department</span>
                  {renderSortIcon('department')}
                </div>
              </th>

              {/* 4. UOM */}
              <th 
                onClick={() => onSort('uom')} 
                className="py-3 px-3 font-semibold w-20 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>UOM</span>
                  {renderSortIcon('uom')}
                </div>
              </th>

              {/* 5. Machine Model */}
              <th 
                onClick={() => onSort('machineModel')} 
                className="py-3 px-3 font-semibold min-w-[160px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Machine Model</span>
                  {renderSortIcon('machineModel')}
                </div>
              </th>

              {/* 6. Specification speed/H */}
              <th 
                onClick={() => onSort('specSpeedPerHour')} 
                className="py-3 px-3 font-semibold text-right w-36 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Specification speed/H</span>
                  {renderSortIcon('specSpeedPerHour')}
                </div>
              </th>

              {/* 7. Av. Working Hrs */}
              <th 
                onClick={() => onSort('avWorkingHours')} 
                className="py-3 px-3 font-semibold text-right w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Av. Working Hrs</span>
                  {renderSortIcon('avWorkingHours')}
                </div>
              </th>

              {/* 8. Total */}
              <th 
                onClick={() => onSort('totalCapacityBasis')} 
                className="py-3 px-3 font-semibold text-right w-20 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total</span>
                  {renderSortIcon('totalCapacityBasis')}
                </div>
              </th>

              {/* 9. Capacity Implement/Hrs */}
              <th 
                onClick={() => onSort('capacityImplementPerHour')} 
                className="py-3 px-3 font-semibold text-right w-36 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Capacity Implement/Hrs</span>
                  {renderSortIcon('capacityImplementPerHour')}
                </div>
              </th>

              {/* 10. Plan Hours */}
              <th 
                onClick={() => onSort('planHours')} 
                className="py-3 px-3 font-semibold text-right w-24 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Plan Hours</span>
                  {renderSortIcon('planHours')}
                </div>
              </th>

              {/* 11. Machine Status */}
              <th 
                onClick={() => onSort('machineStatus')} 
                className="py-3 px-3 font-semibold w-32 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Machine Status</span>
                  {renderSortIcon('machineStatus')}
                </div>
              </th>

              {/* 12. Target Output */}
              <th 
                onClick={() => onSort('targetOutput')} 
                className="py-3 px-3 font-semibold text-right w-32 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Target Output</span>
                  {renderSortIcon('targetOutput')}
                </div>
              </th>

              {/* 13. Actual Output */}
              <th 
                onClick={() => onSort('actualOutput')} 
                className="py-3 px-3 font-semibold text-right w-36 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Actual Output</span>
                  {renderSortIcon('actualOutput')}
                </div>
              </th>

              {/* 14. SKU */}
              <th 
                onClick={() => onSort('sku')} 
                className="py-3 px-3 font-semibold w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>SKU</span>
                  {renderSortIcon('sku')}
                </div>
              </th>

              {/* 15. MO */}
              <th 
                onClick={() => onSort('mo')} 
                className="py-3 px-3 font-semibold w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>MO</span>
                  {renderSortIcon('mo')}
                </div>
              </th>

              {/* 16. Total UEE% */}
              <th 
                onClick={() => onSort('totalUeePct')} 
                className="py-3 px-3 font-semibold text-center w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Total UEE%</span>
                  {renderSortIcon('totalUeePct')}
                </div>
              </th>

              {/* 17. Remarks */}
              <th className="py-3 px-3 font-semibold min-w-[200px]">
                Remarks
              </th>

              {/* Action Column */}
              <th className="py-3 px-3 font-semibold text-center w-20 sticky right-0 bg-slate-50 border-l border-slate-200">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={18} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-slate-300" />
                    <p className="text-sm font-medium">No machine plan records found matching your filters</p>
                    <p className="text-xs text-slate-400">Try adjusting your date range or reset search filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map(item => {
                const isCritical = item.achievementTier === 'Critical' || item.machineStatus === 'Breakdown';
                return (
                  <tr 
                    key={item.id}
                    id={`machine-row-${item.id}`}
                    className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                      isCritical ? 'bg-rose-50/20' : ''
                    }`}
                    onClick={() => onSelectRecord(item)}
                  >
                    {/* 1. SL */}
                    <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                      {item.sl}
                    </td>

                    {/* 2. Date */}
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {item.date}
                    </td>

                    {/* 3. Department */}
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
                        {item.department}
                      </span>
                    </td>

                    {/* 4. UOM */}
                    <td className="py-2.5 px-3 font-medium text-slate-600">
                      {item.uom}
                    </td>

                    {/* 5. Machine Model */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.machineModel}</span>
                        {item.machineNo && (
                          <span className="text-[10px] text-slate-400 font-normal">({item.machineNo})</span>
                        )}
                      </div>
                    </td>

                    {/* 6. Specification speed/H */}
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {formatNumeric(item.specSpeedPerHour)} {item.uom}/H
                    </td>

                    {/* 7. Av. Working Hrs */}
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {item.avWorkingHours.toFixed(1)}h
                    </td>

                    {/* 8. Total */}
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {item.totalCapacityBasis.toFixed(1)}
                    </td>

                    {/* 9. Capacity Implement/Hrs */}
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {formatNumeric(item.capacityImplementPerHour)} {item.uom}/H
                    </td>

                    {/* 10. Plan Hours */}
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-900">
                      {item.planHours.toFixed(1)}h
                    </td>

                    {/* 11. Machine Status */}
                    <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                      {canEdit && onQuickStatusChange ? (
                        <select
                          value={item.machineStatus}
                          onChange={e => onQuickStatusChange(item.id, e.target.value as MachineStatusType)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${getStatusBadge(item.machineStatus)}`}
                        >
                          <option value="Running">Running</option>
                          <option value="Planned">Planned</option>
                          <option value="Off">OFF</option>
                          <option value="Idle">Idle</option>
                          <option value="Breakdown">Breakdown</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Holiday">Holiday</option>
                          <option value="Completed">Completed</option>
                          <option value="Partially Completed">Partially Completed</option>
                          <option value="No Plan">No Plan</option>
                        </select>
                      ) : (
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getStatusBadge(item.machineStatus)}`}>
                          {item.machineStatus}
                        </span>
                      )}
                    </td>

                    {/* 12. Target Output */}
                    <td className="py-2.5 px-3 text-right font-semibold text-purple-900">
                      {formatNumeric(item.targetOutput)}
                    </td>

                    {/* 13. Actual Output + Gap/Achievement Indicator */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 text-[13px]">
                          {formatNumeric(item.actualOutput)}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {/* Achievement badge */}
                          {item.achievementPct !== null ? (
                            <span className={`text-[10px] px-1 py-0.2 rounded border ${getAchievementBadge(item.achievementPct)}`}>
                              {item.achievementPct}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">N/A</span>
                          )}

                          {/* Gap Indicator */}
                          {item.targetOutput > 0 && (
                            <span className={`text-[10px] font-medium ${item.outputGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {item.outputGap >= 0 ? `+${formatNumeric(item.outputGap)}` : formatNumeric(item.outputGap)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 14. SKU */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {item.sku || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 15. MO */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {item.mo || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 16. Total UEE% */}
                    <td className="py-2.5 px-3 text-center">
                      <span 
                        title={item.totalUeePct !== null 
                          ? `Machine: ${item.machineModel} | UEE: ${item.totalUeePct.toFixed(1)}% | Target: ≥${getMachineTargetUee(item.machineModel, settings)}% | Status: ${isUeeFailed(item.machineModel, item.totalUeePct, settings) ? 'Under Target (Red)' : 'Target Met (Green)'}` 
                          : 'UEE not entered'}
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-md border ${getUeeBadge(item.machineModel, item.totalUeePct)}`}
                      >
                        {item.totalUeePct !== null ? `${item.totalUeePct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </td>

                    {/* 17. Remarks */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-[280px] truncate" title={item.remarks}>
                      {item.remarks || <span className="text-slate-300">-</span>}
                    </td>

                    {/* Action Column */}
                    <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-blue-50/40 border-l border-slate-200" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectRecord(item)}
                          title="View Details"
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onEditRecord(item)}
                            title="Edit Plan / Actual Output"
                            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && onPutOffRecord && (
                          <button
                            onClick={() => onPutOffRecord(item)}
                            title="Put Machine OFF with Reason"
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Summary Footer Row */}
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                <td colSpan={5} className="py-3 px-3 text-right">
                  Summary Totals ({items.length} Machines):
                </td>
                <td className="py-3 px-3 text-right text-slate-500">-</td>
                <td className="py-3 px-3 text-right text-slate-700">
                  {(items.reduce((acc, curr) => acc + curr.avWorkingHours, 0) / items.length).toFixed(1)}h avg
                </td>
                <td className="py-3 px-3 text-right text-slate-700">
                  {items.reduce((acc, curr) => acc + curr.totalCapacityBasis, 0).toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right text-slate-500">-</td>
                {/* Total Plan Hours */}
                <td className="py-3 px-3 text-right text-indigo-900 text-sm">
                  {totalPlanHours.toFixed(1)}h
                </td>
                <td className="py-3 px-3 text-center text-slate-500">-</td>
                {/* Total Target Output */}
                <td className="py-3 px-3 text-right text-purple-900 text-sm">
                  {formatNumeric(totalTargetOutput)}
                </td>
                {/* Total Actual Output */}
                <td className="py-3 px-3 text-right text-teal-900 text-sm">
                  <div>{formatNumeric(totalActualOutput)}</div>
                  <div className="text-[10px] font-normal text-slate-600 mt-0.5">
                    Ach: {overallAchievement !== null ? `${overallAchievement.toFixed(1)}%` : 'N/A'}
                    <span className={`ml-1 font-bold ${netGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({netGap >= 0 ? `+${formatNumeric(netGap)}` : formatNumeric(netGap)})
                    </span>
                  </div>
                </td>
                <td colSpan={2} className="py-3 px-3 text-slate-400 text-center">-</td>
                {/* Avg UEE% */}
                <td className="py-3 px-3 text-center text-cyan-900 text-sm">
                  {avgUee !== null ? `${avgUee.toFixed(1)}%` : 'N/A'}
                </td>
                <td className="py-3 px-3 text-slate-500 text-xs font-normal">
                  Net Gap: {netGap >= 0 ? `+${formatNumeric(netGap)}` : formatNumeric(netGap)} units
                </td>
                <td className="py-3 px-3 sticky right-0 bg-slate-100 border-l border-slate-200"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
