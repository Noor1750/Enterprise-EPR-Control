import * as XLSX from 'xlsx';

export interface ScrapRecord {
  id: string;
  date: string;
  department: string;
  uom: string;
  required: number;
  used: number;
  scrapQty: number;
  scrapPct: number;
  remarks: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface DepartmentScrapSummary {
  department: string;
  totalRequired: number;
  totalUsed: number;
  totalScrapQty: number;
  scrapPct: number;
  entryCount: number;
  status: 'Normal' | 'Moderate' | 'Critical';
}

export interface DailyScrapKPIs {
  totalRequired: number;
  totalUsed: number;
  totalScrapQty: number;
  overallScrapPct: number;
  recordsCount: number;
  topScrapDepartment: string;
  topScrapDepartmentPct: number;
  departmentsCount: number;
}

export const STANDARD_SCRAP_DEPARTMENTS = [
  'Offset',
  'PFL',
  'Woven',
  'RFID',
  'Cutting',
  'Sewing',
  'Packaging',
  'Screen Printing',
  'Heat Transfer'
];

export const STANDARD_SCRAP_UOMS = [
  'Sheets',
  'Mtr',
  'Pcs',
  'Kg',
  'Boxes',
  'Rolls',
  'Yards',
  'Reams'
];

/**
 * Parses raw 2D array from Google Sheets / LocalStorage
 * Header format: ['Scrap_ID', 'Date', 'Department', 'UOM', 'Required', 'Used', 'Scrap_Qty', 'Scrap_Pct', 'Remarks', 'Created_By', 'Created_At', 'Updated_By', 'Updated_At']
 */
export function parseScrapRows(rows: string[][]): ScrapRecord[] {
  if (!rows || rows.length <= 1) return [];

  const header = rows[0].map(h => (h || '').trim());
  const idIdx = header.indexOf('Scrap_ID') !== -1 ? header.indexOf('Scrap_ID') : 0;
  const dateIdx = header.indexOf('Date') !== -1 ? header.indexOf('Date') : 1;
  const deptIdx = header.indexOf('Department') !== -1 ? header.indexOf('Department') : 2;
  const uomIdx = header.indexOf('UOM') !== -1 ? header.indexOf('UOM') : 3;
  const reqIdx = header.indexOf('Required') !== -1 ? header.indexOf('Required') : 4;
  const usedIdx = header.indexOf('Used') !== -1 ? header.indexOf('Used') : 5;
  const scrapQtyIdx = header.indexOf('Scrap_Qty') !== -1 ? header.indexOf('Scrap_Qty') : 6;
  const scrapPctIdx = header.indexOf('Scrap_Pct') !== -1 ? header.indexOf('Scrap_Pct') : 7;
  const remIdx = header.indexOf('Remarks') !== -1 ? header.indexOf('Remarks') : 8;
  const cByIdx = header.indexOf('Created_By') !== -1 ? header.indexOf('Created_By') : 9;
  const cAtIdx = header.indexOf('Created_At') !== -1 ? header.indexOf('Created_At') : 10;
  const uByIdx = header.indexOf('Updated_By') !== -1 ? header.indexOf('Updated_By') : 11;
  const uAtIdx = header.indexOf('Updated_At') !== -1 ? header.indexOf('Updated_At') : 12;

  const records: ScrapRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[deptIdx]) continue;

    const id = (row[idIdx] || `SCR-${Date.now()}-${i}`).trim();
    const date = (row[dateIdx] || new Date().toISOString().split('T')[0]).trim();
    const department = (row[deptIdx] || 'General').trim();
    const uom = (row[uomIdx] || 'Pcs').trim();
    const required = Math.max(0, parseFloat(row[reqIdx] || '0') || 0);
    const used = Math.max(0, parseFloat(row[usedIdx] || '0') || 0);

    // Compute scrap metrics reliably
    const scrapQty = used > required ? used - required : (parseFloat(row[scrapQtyIdx] || '0') || 0);
    const scrapPct = required > 0 ? (scrapQty / required) * 100 : (parseFloat(row[scrapPctIdx] || '0') || 0);
    const remarks = (row[remIdx] || '').trim();

    records.push({
      id,
      date,
      department,
      uom,
      required,
      used,
      scrapQty: Number(scrapQty.toFixed(2)),
      scrapPct: Number(scrapPct.toFixed(2)),
      remarks,
      createdBy: row[cByIdx] || '',
      createdAt: row[cAtIdx] || '',
      updatedBy: row[uByIdx] || '',
      updatedAt: row[uAtIdx] || ''
    });
  }

  // Sort descending by date, then department
  return records.sort((a, b) => b.date.localeCompare(a.date) || a.department.localeCompare(b.department));
}

/**
 * Converts ScrapRecord into string array for appending/updating Sheet
 */
export function serializeScrapRecord(r: ScrapRecord, userEmail: string = ''): string[] {
  const now = new Date().toISOString();
  return [
    r.id,
    r.date,
    r.department,
    r.uom,
    r.required.toString(),
    r.used.toString(),
    r.scrapQty.toString(),
    r.scrapPct.toString(),
    r.remarks,
    r.createdBy || userEmail,
    r.createdAt || now,
    userEmail,
    now
  ];
}

/**
 * Calculates Department Summaries
 */
export function calculateDepartmentSummaries(records: ScrapRecord[]): DepartmentScrapSummary[] {
  const map = new Map<string, { required: number; used: number; scrapQty: number; count: number }>();

  for (const r of records) {
    const existing = map.get(r.department) || { required: 0, used: 0, scrapQty: 0, count: 0 };
    existing.required += r.required;
    existing.used += r.used;
    existing.scrapQty += r.scrapQty;
    existing.count += 1;
    map.set(r.department, existing);
  }

  const summaries: DepartmentScrapSummary[] = [];

  for (const [dept, data] of map.entries()) {
    const pct = data.required > 0 ? (data.scrapQty / data.required) * 100 : 0;
    let status: 'Normal' | 'Moderate' | 'Critical' = 'Normal';
    if (pct > 5.0) {
      status = 'Critical';
    } else if (pct > 2.5) {
      status = 'Moderate';
    }

    summaries.push({
      department: dept,
      totalRequired: Number(data.required.toFixed(2)),
      totalUsed: Number(data.used.toFixed(2)),
      totalScrapQty: Number(data.scrapQty.toFixed(2)),
      scrapPct: Number(pct.toFixed(2)),
      entryCount: data.count,
      status
    });
  }

  return summaries.sort((a, b) => b.scrapPct - a.scrapPct);
}

/**
 * Calculates Global Daily Scrap KPIs
 */
export function calculateScrapKPIs(records: ScrapRecord[]): DailyScrapKPIs {
  if (records.length === 0) {
    return {
      totalRequired: 0,
      totalUsed: 0,
      totalScrapQty: 0,
      overallScrapPct: 0,
      recordsCount: 0,
      topScrapDepartment: 'N/A',
      topScrapDepartmentPct: 0,
      departmentsCount: 0
    };
  }

  let totalRequired = 0;
  let totalUsed = 0;
  let totalScrapQty = 0;

  const deptSummaries = calculateDepartmentSummaries(records);

  for (const r of records) {
    totalRequired += r.required;
    totalUsed += r.used;
    totalScrapQty += r.scrapQty;
  }

  const overallScrapPct = totalRequired > 0 ? (totalScrapQty / totalRequired) * 100 : 0;
  const topDept = deptSummaries[0] || null;

  return {
    totalRequired: Number(totalRequired.toFixed(2)),
    totalUsed: Number(totalUsed.toFixed(2)),
    totalScrapQty: Number(totalScrapQty.toFixed(2)),
    overallScrapPct: Number(overallScrapPct.toFixed(2)),
    recordsCount: records.length,
    topScrapDepartment: topDept ? topDept.department : 'N/A',
    topScrapDepartmentPct: topDept ? topDept.scrapPct : 0,
    departmentsCount: deptSummaries.length
  };
}

/**
 * Exports Daily Scrap Report to formatted Excel file
 */
export function exportScrapReportToExcel(
  records: ScrapRecord[],
  deptSummaries: DepartmentScrapSummary[],
  dateLabel: string
): void {
  // Detail sheet rows
  const detailRows = records.map((r, idx) => ({
    'SL': idx + 1,
    'Scrap ID': r.id,
    'Date': r.date,
    'Department': r.department,
    'UOM': r.uom,
    'Required': r.required,
    'Used': r.used,
    'Scrap Qty': r.scrapQty,
    'Scrap %': `${r.scrapPct.toFixed(2)}%`,
    'Remarks': r.remarks || '-',
    'Created By': r.createdBy || '-',
    'Updated At': r.updatedAt ? r.updatedAt.slice(0, 16).replace('T', ' ') : '-'
  }));

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 35 },
    { wch: 22 },
    { wch: 18 }
  ];

  // Summary sheet rows
  const summaryRows = deptSummaries.map((s, idx) => ({
    'SL': idx + 1,
    'Department': s.department,
    'Total Required': s.totalRequired,
    'Total Used': s.totalUsed,
    'Total Scrap Qty': s.totalScrapQty,
    'Scrap %': `${s.scrapPct.toFixed(2)}%`,
    'Status': s.status,
    'Entries': s.entryCount
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Daily_Scrap_Report');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Department_Summary');

  const fileName = `Daily_Scrap_Report_${dateLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports Daily Scrap Report to CSV
 */
export function exportScrapReportToCSV(records: ScrapRecord[]): void {
  const headers = ['Date', 'Department', 'UOM', 'Required', 'Used', 'Scrap_Qty', 'Scrap_Pct', 'Remark'];
  const rows = records.map(r => [
    `"${r.date}"`,
    `"${r.department}"`,
    `"${r.uom}"`,
    r.required,
    r.used,
    r.scrapQty,
    `"${r.scrapPct}%"`,
    `"${(r.remarks || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Daily_Scrap_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
