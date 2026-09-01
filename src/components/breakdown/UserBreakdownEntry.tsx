import React, { useState, useMemo, useEffect } from 'react';
import { BreakdownRecord } from '../../types/breakdown';
import { UserSecurityScope } from '../../lib/security';
import SearchableSelect from '../common/SearchableSelect';
import TimeSelectDropdown, { getCurrentTimeHHMM } from '../common/TimeSelectDropdown';
import ActionModalNotification, { ActionModalProps } from '../common/ActionModalNotification';
import { LABEL_PRINTING_BREAKDOWN_SUGGESTIONS } from './labelPrintingSuggestions';
import { 
  AlertTriangle, Send, CheckCircle2, Clock, Sparkles, 
  Building2, HardDrive, User, FileText, CheckCircle, Info, RefreshCw
} from 'lucide-react';

interface UserBreakdownEntryProps {
  records: BreakdownRecord[];
  machinesList: string[][];
  employeesList: string[][];
  departmentsList: string[];
  userSecurityScope?: UserSecurityScope;
  nextGeneratedId: string;
  onSaveRecord: (record: BreakdownRecord, auditNote?: string) => Promise<void>;
  onSwitchToMaintenance?: () => void;
}

export default function UserBreakdownEntry({
  records,
  machinesList,
  employeesList,
  departmentsList,
  userSecurityScope,
  nextGeneratedId,
  onSaveRecord,
  onSwitchToMaintenance
}: UserBreakdownEntryProps) {
  // Form state - 8 Essential Operator Fields
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [department, setDepartment] = useState<string>('');
  const NON_MACHINE_DEPTS = ['HR', 'IT', 'Maintenance'];
  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);
  const [machineName, setMachineName] = useState<string>('');
  const [machineNo, setMachineNo] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [productionStop, setProductionStop] = useState<'Yes' | 'No'>('Yes');
  const [reportAt, setReportAt] = useState<string>(getCurrentTimeHHMM());
  const [reporterId, setReporterId] = useState<string>(userSecurityScope?.employeeId || '');
  const [reporterName, setReporterName] = useState<string>(userSecurityScope?.employeeName || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Modal Notification state
  const [modalConfig, setModalConfig] = useState<ActionModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Auto-set reporter from logged in user
  useEffect(() => {
    if (userSecurityScope?.employeeId && !reporterId) {
      setReporterId(userSecurityScope.employeeId);
      setReporterName(userSecurityScope.employeeName || userSecurityScope.username || '');
    }
  }, [userSecurityScope]);

  // Active Unsolved Breakdowns lookup
  const activeUnsolvedBreakdowns = useMemo(() => {
    const map = new Map<string, BreakdownRecord>();
    records.forEach(r => {
      if (r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Cancelled') {
        if (r.machineName) map.set(r.machineName.trim().toLowerCase(), r);
        if (r.machineNo) map.set(r.machineNo.trim().toLowerCase(), r);
      }
    });
    return map;
  }, [records]);

  // Check if currently selected machine has an active unsolved breakdown
  const selectedMachineActiveBreakdown = useMemo(() => {
    if (isNonMachineDept) return null;
    if (!machineName && !machineNo) return null;
    return (
      (machineName ? activeUnsolvedBreakdowns.get(machineName.trim().toLowerCase()) : null) ||
      (machineNo ? activeUnsolvedBreakdowns.get(machineNo.trim().toLowerCase()) : null) ||
      null
    );
  }, [machineName, machineNo, activeUnsolvedBreakdowns, isNonMachineDept]);

  // Format Machine options for SearchableSelect

  const machineOptions = useMemo(() => {
    const unique = new Map<string, { label: string; sublabel: string; badge: string; badgeColor?: string; disabled?: boolean; no: string; dept: string }>();
    machinesList.forEach(m => {
      const dept = m[1] || '';
      if (department && department !== 'All' && !isNonMachineDept && dept !== department) return;

      const name = m[4] || m[0];
      if (name && !unique.has(name)) {

        const no = m[20] || `MC-${dept.substring(0, 3).toUpperCase() || 'GEN'}-${name.replace(/\s+/g, '')}`;
        const cap = m[10] ? `${m[10]} Pcs/16h` : '';

        // Check if machine already has an unsolved breakdown
        const active = activeUnsolvedBreakdowns.get(name.trim().toLowerCase()) || 
          (no ? activeUnsolvedBreakdowns.get(no.trim().toLowerCase()) : undefined);

        if (active) {
          unique.set(name, {
            label: `${name} (⛔ Unsolved #${active.id})`,
            sublabel: `${dept} | ${no} • Already in Breakdown (${active.status})`,
            badge: `⛔ ${active.status}`,
            badgeColor: 'bg-rose-100 text-rose-800 border border-rose-300',
            disabled: true,
            no,
            dept
          });
        } else {
          unique.set(name, {
            label: name,
            sublabel: `${dept} | ${no}`,
            badge: cap,
            disabled: false,
            no,
            dept
          });
        }
      }
    });

    return Array.from(unique.entries()).map(([name, data]) => ({
      value: name,
      label: data.label,
      sublabel: data.sublabel,
      badge: data.badge,
      badgeColor: data.badgeColor,
      disabled: data.disabled
    }));
  }, [machinesList, activeUnsolvedBreakdowns, department, isNonMachineDept]);

  // Handle machine selection -> auto populate machineNo & department if empty
  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    if (NON_MACHINE_DEPTS.includes(dept)) {
      setMachineName('');
      setMachineNo('');
      setValidationError(null);
    } else {
      const matched = machinesList.find(m => (m[4] || m[0]) === machineName);
      if (matched && matched[1] !== dept) {
        setMachineName('');
        setMachineNo('');
        setValidationError(null);
      }
    }
  };

  const handleMachineChange = (selectedName: string) => {
    const active = activeUnsolvedBreakdowns.get(selectedName.trim().toLowerCase());
    if (active) {
      setValidationError(`Machine "${selectedName}" is already in the unsolved breakdown list with ticket #${active.id} (${active.status}). You cannot add it again until the current ticket is completed.`);
      return;
    }
    setValidationError(null);
    setMachineName(selectedName);
    const matched = machinesList.find(m => (m[4] || m[0]) === selectedName);
    if (matched) {
      const dept = matched[1] || '';
      const autoNo = matched[20] || `MC-${dept.substring(0, 3).toUpperCase() || 'GEN'}-${selectedName.replace(/\s+/g, '')}`;
      setMachineNo(autoNo);
      if (!department && dept) {
        setDepartment(dept);
      }
    }
  };

  // Format Reporter Employee options
  const reporterOptions = useMemo(() => {
    return employeesList.map(emp => {
      const id = emp[0] || '';
      const name = emp[1] || '';
      const dept = emp[3] || emp[2] || '';
      return {
        value: id,
        label: `${name} (${id})`,
        sublabel: dept,
        badge: emp[4] || ''
      };
    });
  }, [employeesList]);

  const handleReporterChange = (empId: string) => {
    setReporterId(empId);
    const emp = employeesList.find(e => e[0] === empId);
    if (emp) {
      setReporterName(emp[1] || '');
      if (!department && emp[3]) {
        setDepartment(emp[3]);
      }
    }
  };

  // Common quick problem symptom chips for quick input
  const quickProblemSuggestions = [
    'Registration drift / out of register',
    'Web tension loss / paper break',
    'Ink drying / UV lamp failure',
    'Die cutter alignment issue / blunt',
    'Anilox roller clogged / dirty',
    'Matrix waste stripping failure',
    'Plate lifting / unsticking',
    'Print head streak / missing dots',
    'Splicing failure',
    'Sensor failure / continuous alarm',
    'Motor overheating / loud noise',
    'Power trip / electrical fault'
  ];

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!department) {
      setValidationError('Please select the responsible Department.');
      return;
    }
    if (!isNonMachineDept && !machineName) {
      setValidationError('Please select the Machine.');
      return;
    }
    if (!isNonMachineDept && !machineNo) {
      setValidationError('Please specify the Machine Number.');
      return;
    }
    if (!problemDescription.trim()) {
      setValidationError('Please enter a description of the problem.');
      return;
    }
    if (!reportAt.trim()) {
      setValidationError('Please enter the breakdown Report Time.');
      return;
    }
    if (!reporterId) {
      setValidationError('Please select the Reporter.');
      return;
    }

    // Strict validation: cannot put machine in breakdown list if already in unsolved breakdown
    const activeExisting = isNonMachineDept ? null : ((machineName ? activeUnsolvedBreakdowns.get(machineName.trim().toLowerCase()) : null) ||
      (machineNo ? activeUnsolvedBreakdowns.get(machineNo.trim().toLowerCase()) : null));

    if (activeExisting) {
      setValidationError(
        `Machine "${machineName}" (${machineNo}) is already registered in an unsolved breakdown ticket (#${activeExisting.id} with status "${activeExisting.status}"). A new breakdown ticket cannot be created until the current ticket is Completed or Closed.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const newRecord: BreakdownRecord = {
        id: nextGeneratedId,
        date: date || now.substring(0, 10),
        department,
        machineName,
        machineNo,
        problemDescription: problemDescription.trim(),
        productionStop,
        reportAt: reportAt.trim(),
        reporterId,
        reporterName: reporterName || userSecurityScope?.employeeName || 'Operator',
        attendAt: '',
        responseTimeMin: 0,
        machineStartAt: '',
        hourLostHours: 0,
        hourLostFormatted: '0 Hours',
        attendById: '',
        attendByName: '',
        attendByAll: [],
        failureMode: '',
        category: 'Breakdown',
        activity: '',
        sparePartsService: 'None',
        quantity: 0,
        uom: 'PCS',
        unitCost: 0,
        totalCost: 0,
        status: 'Open',
        remarks: 'Reported by operator via User Entry.',
        createdBy: userSecurityScope?.employeeId || userSecurityScope?.username || 'user',
        createdAt: now,
        updatedBy: userSecurityScope?.employeeId || userSecurityScope?.username || 'user',
        updatedAt: now
      };

      await onSaveRecord(
        newRecord, 
        `Breakdown reported for machine ${machineName} (${machineNo}) by ${reporterName} at ${reportAt}. Production Stop: ${productionStop}.`
      );

      setSubmitSuccess(`Breakdown ticket #${newRecord.id} successfully created and sent to Maintenance Queue.`);
      
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: `Breakdown Ticket #${newRecord.id} Created`,
        message: `Breakdown ticket for machine "${machineName}" (${machineNo}) has been successfully submitted to Maintenance.`,
        details: [
          `Department: ${department}`,
          `Problem: ${problemDescription}`,
          `Reported At: ${reportAt} by ${reporterName}`,
          `Production Stop: ${productionStop}`
        ],
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });

      // Reset form
      setProblemDescription('');
      setReportAt(getCurrentTimeHHMM());
      setProductionStop('Yes');

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);

    } catch (err) {
      console.error('Failed to submit user breakdown entry:', err);
      setValidationError('Failed to save breakdown log. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent breakdown reports submitted
  const recentReports = useMemo(() => {
    return records.slice(0, 5);
  }, [records]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Machine Breakdown Incident Report
              </h2>
              <p className="text-xs text-slate-500">
                User Entry Portal — Report machine faults or stoppages in 8 essential steps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Next Ticket ID</div>
            <div className="text-xs font-mono font-black text-indigo-700">{nextGeneratedId}</div>
          </div>
          {onSwitchToMaintenance && (
            <button
              type="button"
              onClick={onSwitchToMaintenance}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <HardDrive className="w-4 h-4 text-slate-600" />
              <span>Go to Maintenance Workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{submitSuccess}</span>
          </div>
          {onSwitchToMaintenance && (
            <button
              type="button"
              onClick={onSwitchToMaintenance}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
            >
              View in Maintenance
            </button>
          )}
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-2.5 text-rose-900 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs font-bold">{validationError}</span>
        </div>
      )}

      {/* Warning Alert if Selected Machine already has an Unsolved Breakdown */}
      {selectedMachineActiveBreakdown && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-950 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-xs text-rose-900 uppercase tracking-wide flex items-center gap-2">
                <span>Machine Already In Breakdown List (Unsolved)</span>
                <span className="bg-rose-600 text-white font-mono px-2 py-0.5 rounded-full text-[10px]">
                  Ticket #{selectedMachineActiveBreakdown.id}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                <strong>{machineName}</strong> ({machineNo}) is currently logged with status{' '}
                <span className="font-bold text-rose-900 bg-rose-200/80 px-1.5 py-0.5 rounded">
                  {selectedMachineActiveBreakdown.status}
                </span>{' '}
                reported on {selectedMachineActiveBreakdown.date} at {selectedMachineActiveBreakdown.reportAt}.
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                <strong>Active Problem:</strong> "{selectedMachineActiveBreakdown.problemDescription}"
              </p>
              <p className="text-[11px] text-rose-600 mt-1 italic">
                You cannot log another breakdown for this machine until ticket #{selectedMachineActiveBreakdown.id} is marked as Completed or Closed.
              </p>
            </div>
          </div>

          {onSwitchToMaintenance && (
            <button
              type="button"
              onClick={onSwitchToMaintenance}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap self-start md:self-center"
            >
              <HardDrive className="w-4 h-4" />
              <span>Go to Maintenance Workflow</span>
            </button>
          )}
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              8
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Essential Operator Breakdown Fields
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">All fields marked * are required</span>
        </div>

        {/* Row 1: Date, Department, Machine, Machine No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* 2. Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Department <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={departmentsList}
              value={department}
              onChange={handleDepartmentChange}
              placeholder="-- Select Department --"
              searchPlaceholder="Search departments..."
              required
            />
          </div>

          {/* 3. Machine */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              3. Machine (Name) {!isNonMachineDept && <span className="text-rose-500">*</span>}
            </label>
            <SearchableSelect
              options={machineOptions}
              value={machineName}
              onChange={handleMachineChange}
              placeholder={isNonMachineDept ? "N/A" : "-- Search Machine --"}
              disabled={isNonMachineDept}
              searchPlaceholder="Search machine name or process..."
              required={!isNonMachineDept}
            />
          </div>

          {/* 4. Machine No */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              4. Machine No {!isNonMachineDept && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={machineNo}
              onChange={(e) => setMachineNo(e.target.value)}
              placeholder={isNonMachineDept ? "N/A" : "e.g. MC-RFI-01"}
              disabled={isNonMachineDept}
              required={!isNonMachineDept}
              className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isNonMachineDept ? 'opacity-50 bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>
        </div>

        {/* 5. Problem Description & Quick Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              5. Problem (Description of Problem) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Click a chip below to auto-fill or enter custom description</span>
          </div>

          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            required
            rows={2}
            placeholder="Describe the exact fault symptom (e.g. UV lamp curing failure, web tension loss, rotary die cutter blunt, servo drive alarm)..."
            className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-medium"
          />

          {/* Quick Problem Chips by Label Printing Industry Category */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Label Printing Industry Quick Breakdown Suggestions:
              </span>
              <span className="text-slate-400 text-[10px]">Click any chip to add</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {LABEL_PRINTING_BREAKDOWN_SUGGESTIONS.map((cat, cIdx) => (
                <div key={cIdx} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cat.category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.symptoms.map((symptom, sIdx) => (
                      <button
                        type="button"
                        key={sIdx}
                        onClick={() => {
                          if (!problemDescription.trim()) {
                            setProblemDescription(symptom);
                          } else if (!problemDescription.includes(symptom)) {
                            setProblemDescription(prev => `${prev}; ${symptom}`);
                          }
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left font-medium ${
                          problemDescription.includes(symptom)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50/60 hover:border-indigo-200 hover:text-indigo-900'
                        }`}
                      >
                        + {symptom}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Stop, Report At, Reporter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          
          {/* 6. Stop (Production Stop?) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              6. Stop (Production Stop?) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                productionStop === 'Yes' 
                  ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm ring-1 ring-rose-400' 
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="userProductionStop"
                  value="Yes"
                  checked={productionStop === 'Yes'}
                  onChange={() => setProductionStop('Yes')}
                  className="hidden"
                />
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Yes (Down)
              </label>

              <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                productionStop === 'No' 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm ring-1 ring-emerald-400' 
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="userProductionStop"
                  value="No"
                  checked={productionStop === 'No'}
                  onChange={() => setProductionStop('No')}
                  className="hidden"
                />
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                No (Running)
              </label>
            </div>
          </div>

          {/* 7. Report At */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              7. Report At (Time) <span className="text-rose-500">*</span>
            </label>
            <TimeSelectDropdown
              value={reportAt}
              onChange={setReportAt}
              defaultToNowOnMount={true}
              required
            />
          </div>

          {/* 8. Reporter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              8. Reporter (Name / ID) <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={reporterOptions}
              value={reporterId}
              onChange={handleReporterChange}
              placeholder="-- Select Reporter --"
              searchPlaceholder="Search employee by name or ID..."
              required
            />
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Automated Maintenance Workflow Handoff:</span>
            <p className="text-blue-800">
              Upon submission, this breakdown will immediately appear on the Maintenance Team's Action Queue.
              The technician will record response time, perform repair, replace parts, record downtime, and complete the resolution.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting || Boolean(selectedMachineActiveBreakdown)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Logging Incident...</span>
              </>
            ) : selectedMachineActiveBreakdown ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span>Machine Already in Breakdown</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Breakdown Incident</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Recent Incident Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Recent Logged Breakdown Incidents
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Live sync with Google Sheets</span>
        </div>

        {recentReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No breakdown incidents logged yet. Submit the form above to log the first ticket.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Machine</th>
                  <th className="py-2.5 px-3">Machine No</th>
                  <th className="py-2.5 px-3">Problem Description</th>
                  <th className="py-2.5 px-3 text-center">Stop</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{r.id}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="font-semibold text-slate-900">{r.date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.reportAt}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{r.department}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.machineName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.machineNo}</td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={r.problemDescription}>
                      {r.problemDescription}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.productionStop === 'Yes' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {r.productionStop}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full border ${
                        r.status === 'Completed' || r.status === 'Closed'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : r.status === 'Maintenance in Progress'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Status Popup Notification Modal */}
      <ActionModalNotification {...modalConfig} />

    </div>
  );
}
