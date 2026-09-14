import * as XLSX from 'xlsx';
import { CalculatedMachinePlanItem, MachinePlanSummaryKPIs } from '../types/machinePlan';
import { formatNumeric } from './machinePlanEngine';

export function exportMachinePlanToExcel(
  items: CalculatedMachinePlanItem[], 
  kpis: MachinePlanSummaryKPIs,
  dateLabel: string
): void {
  // Format rows with the EXACT required 17 table columns
  const rows = items.map(item => ({
    'SL': item.sl,
    'Date': item.date,
    'Department': item.department,
    'UOM': item.uom,
    'Machine Model': item.machineModel,
    'Specification speed/H': `${formatNumeric(item.specSpeedPerHour)} ${item.uom}/H`,
    'Av. Working Hrs': Number(item.avWorkingHours.toFixed(1)),
    'Total': Number(item.totalCapacityBasis.toFixed(1)),
    'Capacity Implement/Hrs': `${formatNumeric(item.capacityImplementPerHour)} ${item.uom}/H`,
    'Plan Hours': Number(item.planHours.toFixed(1)),
    'Machine Status': item.machineStatus,
    'Target Output': item.targetOutput,
    'Actual Output': item.actualOutput,
    'SKU': item.sku || '-',
    'MO': item.mo || '-',
    'Total UEE%': item.totalUeePct !== null ? `${item.totalUeePct.toFixed(1)}%` : 'N/A',
    'Remarks': item.remarks || '-'
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = [
    { wch: 6 },  // SL
    { wch: 12 }, // Date
    { wch: 14 }, // Department
    { wch: 8 },  // UOM
    { wch: 22 }, // Machine Model
    { wch: 22 }, // Specification speed/H
    { wch: 16 }, // Av. Working Hrs
    { wch: 10 }, // Total
    { wch: 24 }, // Capacity Implement/Hrs
    { wch: 12 }, // Plan Hours
    { wch: 16 }, // Machine Status
    { wch: 15 }, // Target Output
    { wch: 15 }, // Actual Output
    { wch: 18 }, // SKU
    { wch: 16 }, // MO
    { wch: 13 }, // Total UEE%
    { wch: 30 }, // Remarks
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Machine_Plan_Achievement');

  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Report Period', dateLabel],
    ['Total Machines', kpis.totalMachines],
    ['Planned Machines', kpis.plannedMachines],
    ['Running Machines', kpis.runningMachines],
    ['Idle Machines', kpis.idleMachines],
    ['Breakdown Machines', kpis.breakdownMachines],
    ['Total Plan Hours', kpis.totalPlanHours],
    ['Total Target Output', kpis.totalTargetOutput],
    ['Total Actual Output', kpis.totalActualOutput],
    ['Overall Achievement %', kpis.overallAchievementPct !== null ? `${kpis.overallAchievementPct}%` : 'N/A'],
    ['Average UEE %', kpis.averageUeePct !== null ? `${kpis.averageUeePct}%` : 'N/A'],
    ['Production Gap', kpis.productionGap],
    ['Gap %', kpis.gapPct !== null ? `${kpis.gapPct}%` : 'N/A'],
    ['Exported At (BST)', new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })]
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary_KPIs');

  const cleanDate = dateLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Machine_Plan_vs_Achievement_${cleanDate}.xlsx`);
}

export function exportMachinePlanToCSV(
  items: CalculatedMachinePlanItem[], 
  dateLabel: string
): void {
  const headers = [
    'SL',
    'Date',
    'Department',
    'UOM',
    'Machine Model',
    'Specification speed/H',
    'Av. Working Hrs',
    'Total',
    'Capacity Implement/Hrs',
    'Plan Hours',
    'Machine Status',
    'Target Output',
    'Actual Output',
    'SKU',
    'MO',
    'Total UEE%',
    'Remarks'
  ];

  const escapeCSV = (field: any) => {
    const str = field === null || field === undefined ? '' : String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCSV).join(','),
    ...items.map(item => [
      item.sl,
      item.date,
      item.department,
      item.uom,
      item.machineModel,
      `${formatNumeric(item.specSpeedPerHour)} ${item.uom}/H`,
      item.avWorkingHours,
      item.totalCapacityBasis,
      `${formatNumeric(item.capacityImplementPerHour)} ${item.uom}/H`,
      item.planHours,
      item.machineStatus,
      item.targetOutput,
      item.actualOutput,
      item.sku,
      item.mo,
      item.totalUeePct !== null ? `${item.totalUeePct}%` : 'N/A',
      item.remarks
    ].map(escapeCSV).join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDate = dateLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `Machine_Plan_vs_Achievement_${cleanDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
