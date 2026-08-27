export interface SkillRecord {
  rowIndex?: number; // 0-based index in the raw data (row in sheet = rowIndex + 2)
  empId: string;
  empName?: string;
  empDepartment?: string;
  empDesignation?: string;
  machineName: string;
  processName: string;
  department: string;
  level: number; // 1 to 5
  remarks?: string;
  evaluatedBy?: string;
  updatedAt?: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  designation: string;
  department: string;
  supervisorName?: string;
  status: string;
  shift?: string;
}

export interface MachineInfo {
  brand: string;
  department: string;
  processName: string;
  machineName: string;
  machineNo: string;
  standardUnit: string;
  dayShiftReq: number;
  nightShiftReq: number;
  generalShiftReq: number;
  reqOperators: number;
}

export const SKILL_LEVELS = [
  { level: 1, label: 'Level 1: Beginner / Supervised', shortLabel: 'L1 - Beginner', desc: 'Can operate machine/process under direct supervision; basic safety awareness', color: 'bg-slate-100 text-slate-700 border-slate-300', badgeColor: 'bg-slate-100 text-slate-700' },
  { level: 2, label: 'Level 2: Basic / Independent', shortLabel: 'L2 - Basic', desc: 'Can operate independently for standard production; minor troubleshooting', color: 'bg-sky-100 text-sky-800 border-sky-300', badgeColor: 'bg-sky-100 text-sky-800' },
  { level: 3, label: 'Level 3: Competent / Standard', shortLabel: 'L3 - Competent', desc: 'Fully competent at target speed & quality; standard setups & PM', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { level: 4, label: 'Level 4: Advanced / Multi-Skill', shortLabel: 'L4 - Advanced', desc: 'High efficiency, complex setups, can handle multiple processes', color: 'bg-purple-100 text-purple-800 border-purple-300', badgeColor: 'bg-purple-100 text-purple-800' },
  { level: 5, label: 'Level 5: Expert / Master Trainer', shortLabel: 'L5 - Expert', desc: 'Master technician, trains operators, solves complex breakdowns & optimization', color: 'bg-amber-100 text-amber-900 border-amber-300', badgeColor: 'bg-amber-100 text-amber-900' },
];

export const STANDARD_PROCESSES = [
  'Encoding & Verification',
  'High-Speed Weaving',
  'Multi-Color Offset Printing',
  'Lockstitch / Single Needle',
  'Overlock Sewing',
  'Flatlock Sewing',
  'Auto Cutter / Spreading',
  'Manual Cutting & Die Press',
  'Label Flexo Printing (PFL)',
  'Rotary Printing',
  'Thermal Transfer Printing',
  'Screen Printing',
  'Auto Sealing & Carton Packing',
  'Finishing & Thread Trimming',
  'Button Attaching / Hole',
  'Ironing & Steam Press',
  'Quality Inspection & Audit',
  'Maintenance & Diagnostics',
  'Pattern Making & Grading',
  'Packaging & Box Packing',
  'Material Handling & Dispatch'
];
