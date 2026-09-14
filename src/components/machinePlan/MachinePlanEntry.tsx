import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Building2, 
  Calendar, 
  Target, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  Layers, 
  PowerOff, 
  Sparkles, 
  Clock, 
  Cpu,
  Package,
  Hash,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  MachinePlanRecord, 
  MachineStatusType, 
  MachinePlanSettings 
} from '../../types/machinePlan';
import { 
  calculateTargetOutput, 
  formatNumeric, 
  cleanParseNumber 
} from '../../lib/machinePlanEngine';
import KPIModalNotification, { NotificationModalProps } from '../kpi/KPIModalNotification';
import { COMMON_OFF_REASONS } from './MachineOffModal';

interface BatchMachineRowData {
  machineModel: string;
  department: string;
  uom: string;
  specSpeedPerHour: number;
  avWorkingHours: number;
  capacityImplementPerHour: number;
  planHours: string;
  targetOutput: number;
  actualOutput: string;
  sku: string;
  mo: string;
  machineStatus: MachineStatusType;
  offReason?: string;
  remarks: string;
  totalUeePct: string;
  selected: boolean;
  existingId?: string;
}

interface MachinePlanEntryProps {
  machineOptions: Array<{
    model: string;
    department: string;
    uom: string;
    speed: number;
    utilization: number;
  }>;
  existingRecords: MachinePlanRecord[];
  onSaveRecord: (record: MachinePlanRecord, isNew: boolean) => Promise<void>;
  onBatchSaveRecords: (records: Array<{ record: MachinePlanRecord; isNew: boolean }>) => Promise<void>;
  defaultDate?: string;
  defaultDepartment?: string;
  settings: MachinePlanSettings;
  departments: string[];
  userEmail?: string;
  initialMachineModel?: string;
  initialEntryMode?: 'single' | 'batch';
}

export default function MachinePlanEntry({
  machineOptions,
  existingRecords,
  onSaveRecord,
  onBatchSaveRecords,
  defaultDate,
  defaultDepartment,
  settings,
  departments,
  userEmail,
  initialMachineModel,
  initialEntryMode = 'batch'
}: MachinePlanEntryProps) {
  const [entryMode, setEntryMode] = useState<'single' | 'batch'>(initialEntryMode);

  // Single Form State
  const [singleModel, setSingleModel] = useState<string>('');
  const [singleDept, setSingleDept] = useState<string>('General');
  const [singleUom, setSingleUom] = useState<string>('PCS');
  const [singleDate, setSingleDate] = useState<string>(defaultDate || new Date().toISOString().substring(0, 10));
  const [singleShift, setSingleShift] = useState<string>('Day Shift');
  const [singleSpeed, setSingleSpeed] = useState<number>(2000);
  const [singleWorkingHours, setSingleWorkingHours] = useState<number>(8);
  const [singleCapacityImplement, setSingleCapacityImplement] = useState<number>(1800);
  const [singlePlanHours, setSinglePlanHours] = useState<string>('8');
  const [singleTargetOutput, setSingleTargetOutput] = useState<number>(14400);
  const [singleActualOutput, setSingleActualOutput] = useState<string>('');
  const [singleSku, setSingleSku] = useState<string>('');
  const [singleMo, setSingleMo] = useState<string>('');
  const [singleStatus, setSingleStatus] = useState<MachineStatusType>('Running');
  const [singleOffReason, setSingleOffReason] = useState<string>('');
  const [singleUee, setSingleUee] = useState<string>('');
  const [singleRemarks, setSingleRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Batch Form State
  const [batchDept, setBatchDept] = useState<string>(defaultDepartment || 'All');
  const [batchDate, setBatchDate] = useState<string>(defaultDate || new Date().toISOString().substring(0, 10));
  const [batchShift, setBatchShift] = useState<string>('Day Shift');
  const [batchData, setBatchData] = useState<Record<string, BatchMachineRowData>>({});
  const [massPlanHours, setMassPlanHours] = useState<string>('8');
  const [massSku, setMassSku] = useState<string>('');
  const [massMo, setMassMo] = useState<string>('');

  // Notification Modal State
  const [modalConfig, setModalConfig] = useState<NotificationModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Set of machine models that already have an entry for singleDate
  const enteredModelsOnSingleDate = useMemo(() => {
    const set = new Set<string>();
    existingRecords.forEach(r => {
      if (r.date && r.date.trim() === singleDate.trim()) {
        set.add(r.machineModel.toLowerCase().trim());
      }
    });
    return set;
  }, [existingRecords, singleDate]);

  // Available machines for single entry (excludes already entered machines on singleDate)
  const availableMachinesForSingle = useMemo(() => {
    return machineOptions.filter(m => !enteredModelsOnSingleDate.has(m.model.toLowerCase().trim()));
  }, [machineOptions, enteredModelsOnSingleDate]);

  // Check if an existing record exists for selected machine + singleDate (e.g. if loaded initially)
  const existingSingleRecord = useMemo(() => {
    if (!singleModel || !singleDate) return null;
    return existingRecords.find(r => 
      r.machineModel.toLowerCase().trim() === singleModel.toLowerCase().trim() &&
      r.date.trim() === singleDate.trim()
    ) || null;
  }, [existingRecords, singleModel, singleDate]);

  // If date changes and current machine is already planned for that new date, clear it
  useEffect(() => {
    if (singleModel && enteredModelsOnSingleDate.has(singleModel.toLowerCase().trim())) {
      setSingleModel('');
      setSearchQuery('');
      setSingleActualOutput('');
      setSingleSku('');
      setSingleMo('');
      setSingleRemarks('');
      setSingleUee('');
    }
  }, [singleDate, enteredModelsOnSingleDate, singleModel]);

  // When machine model changes, auto-populate details
  const handleSelectMachineModel = (model: string) => {
    setSingleModel(model);
    setIsDropdownOpen(false);
    setSearchQuery(model);

    const found = machineOptions.find(m => m.model.toLowerCase() === model.toLowerCase());
    if (found) {
      setSingleDept(found.department || 'General');
      setSingleUom(found.uom || 'PCS');
      const sp = found.speed || 2000;
      setSingleSpeed(sp);
      const capImp = Math.round(sp * ((found.utilization || 90) / 100));
      setSingleCapacityImplement(capImp);
      const pHours = cleanParseNumber(singlePlanHours) || 8;
      setSingleTargetOutput(calculateTargetOutput(pHours, capImp));
    }
  };

  // Preselect machine model if initialMachineModel prop is passed
  useEffect(() => {
    if (initialMachineModel) {
      setEntryMode('single');
      handleSelectMachineModel(initialMachineModel);
    }
  }, [initialMachineModel]);

  // When existing single record changes, auto-populate inputs
  useEffect(() => {
    if (existingSingleRecord) {
      setSingleDept(existingSingleRecord.department);
      setSingleUom(existingSingleRecord.uom);
      setSingleSpeed(existingSingleRecord.specSpeedPerHour);
      setSingleWorkingHours(existingSingleRecord.avWorkingHours);
      setSingleCapacityImplement(existingSingleRecord.capacityImplementPerHour);
      setSinglePlanHours(String(existingSingleRecord.planHours));
      setSingleTargetOutput(existingSingleRecord.targetOutput);
      setSingleActualOutput(existingSingleRecord.actualOutput ? String(existingSingleRecord.actualOutput) : '');
      setSingleSku(existingSingleRecord.sku || '');
      setSingleMo(existingSingleRecord.mo || '');
      setSingleStatus(existingSingleRecord.machineStatus || 'Running');
      setSingleOffReason(existingSingleRecord.offReason || '');
      setSingleUee(existingSingleRecord.totalUeePct !== null ? String(existingSingleRecord.totalUeePct) : '');
      setSingleRemarks(existingSingleRecord.remarks || '');
      if (existingSingleRecord.shift) setSingleShift(existingSingleRecord.shift);
    }
  }, [existingSingleRecord]);

  // Recalculate single target output on plan hours or capacity implement change
  useEffect(() => {
    const hours = cleanParseNumber(singlePlanHours);
    setSingleTargetOutput(calculateTargetOutput(hours, singleCapacityImplement));
  }, [singlePlanHours, singleCapacityImplement]);

  // Filter machine options for search (only among unentered machines on singleDate)
  const filteredMachineOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableMachinesForSingle.slice(0, 35);
    return availableMachinesForSingle.filter(m => 
      m.model.toLowerCase().includes(q) || 
      m.department.toLowerCase().includes(q)
    ).slice(0, 35);
  }, [availableMachinesForSingle, searchQuery]);

  // Set of machine models that already have an entry for batchDate
  const enteredModelsOnBatchDate = useMemo(() => {
    const set = new Set<string>();
    existingRecords.forEach(r => {
      if (r.date && r.date.trim() === batchDate.trim()) {
        set.add(r.machineModel.toLowerCase().trim());
      }
    });
    return set;
  }, [existingRecords, batchDate]);

  // Total machines count in selected department
  const totalDeptMachinesCount = useMemo(() => {
    return machineOptions.filter(m => {
      if (batchDept !== 'All' && m.department.toLowerCase() !== batchDept.toLowerCase()) {
        return false;
      }
      return true;
    }).length;
  }, [machineOptions, batchDept]);

  // Initialize batch data when department, date, or master machines change
  // Excludes machines that already have an entry for batchDate!
  useEffect(() => {
    const unenteredMachines = machineOptions.filter(m => {
      if (batchDept !== 'All' && m.department.toLowerCase() !== batchDept.toLowerCase()) {
        return false;
      }
      // Exclude machines already planned on this batch date
      if (enteredModelsOnBatchDate.has(m.model.toLowerCase().trim())) {
        return false;
      }
      return true;
    });

    const initialMap: Record<string, BatchMachineRowData> = {};

    unenteredMachines.forEach(m => {
      const sp = m.speed || 2000;
      const capImp = Math.round(sp * ((m.utilization || 90) / 100));
      const pHours = '8';
      const parsedHours = 8;

      initialMap[m.model] = {
        machineModel: m.model,
        department: m.department || 'General',
        uom: m.uom || 'PCS',
        specSpeedPerHour: sp,
        avWorkingHours: 8,
        capacityImplementPerHour: capImp,
        planHours: pHours,
        targetOutput: calculateTargetOutput(parsedHours, capImp),
        actualOutput: '',
        sku: '',
        mo: '',
        machineStatus: 'Running',
        offReason: undefined,
        remarks: '',
        totalUeePct: '',
        selected: true,
        existingId: undefined
      };
    });

    setBatchData(initialMap);
  }, [machineOptions, enteredModelsOnBatchDate, batchDept, batchDate]);

  // Handle single submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleModel.trim()) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Machine Model Required',
        message: 'Please select a machine model from the master database.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!singleDate.trim()) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Date Required',
        message: 'Please select a valid date for this machine plan.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const pHours = cleanParseNumber(singlePlanHours);
    const aOutput = cleanParseNumber(singleActualOutput);
    const ueeVal = singleUee.trim() ? cleanParseNumber(singleUee) : null;

    let finalRemarks = singleRemarks.trim();
    if (singleStatus === 'Off' && singleOffReason) {
      if (!finalRemarks.includes(`[OFF: ${singleOffReason}]`)) {
        finalRemarks = `[OFF: ${singleOffReason}] ${finalRemarks}`.trim();
      }
    }

    const recordId = existingSingleRecord 
      ? existingSingleRecord.id 
      : `MPA-${singleDate.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const recordToSave: MachinePlanRecord = {
      id: recordId,
      date: singleDate.trim(),
      department: singleDept,
      uom: singleUom,
      machineModel: singleModel.trim(),
      specSpeedPerHour: singleSpeed,
      specSpeedDisplay: `${formatNumeric(singleSpeed)} ${singleUom}/H`,
      avWorkingHours: singleWorkingHours,
      totalCapacityBasis: singleWorkingHours * 1,
      capacityImplementPerHour: singleCapacityImplement,
      planHours: pHours,
      machineStatus: singleStatus,
      offReason: singleStatus === 'Off' ? singleOffReason : undefined,
      targetOutput: singleTargetOutput,
      actualOutput: aOutput,
      sku: singleSku.trim(),
      mo: singleMo.trim(),
      totalUeePct: ueeVal,
      remarks: finalRemarks,
      shift: singleShift,
      updatedBy: userEmail,
      updatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onSaveRecord(recordToSave, !existingSingleRecord);
      // Clear current machine selection so it is not shown again for entry on this date
      setSingleModel('');
      setSearchQuery('');
      setSingleActualOutput('');
      setSingleSku('');
      setSingleMo('');
      setSingleRemarks('');
      setSingleUee('');

      setModalConfig({
        isOpen: true,
        type: 'success',
        title: existingSingleRecord ? 'Machine Plan Updated Successfully' : 'Machine Plan Saved Successfully',
        message: `Machine: ${recordToSave.machineModel} (${recordToSave.department})\nDate: ${recordToSave.date}\nPlan: ${recordToSave.planHours} Hrs | Target: ${formatNumeric(recordToSave.targetOutput)} ${recordToSave.uom} | Status: ${recordToSave.machineStatus}`,
        details: [
          `Department: ${recordToSave.department}`,
          `Target Output: ${formatNumeric(recordToSave.targetOutput)} ${recordToSave.uom}`,
          `Status: ${recordToSave.machineStatus}`,
          'Status: Machine recorded and excluded from pending entries for this date'
        ],
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save Machine Plan',
        message: err?.message || 'Database error occurred. Please check network connection.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mass action: apply plan hours across selected
  const handleApplyMassPlanHours = () => {
    const hours = cleanParseNumber(massPlanHours);
    setBatchData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[k].selected) {
          updated[k].planHours = String(hours);
          updated[k].targetOutput = calculateTargetOutput(hours, updated[k].capacityImplementPerHour);
        }
      });
      return updated;
    });
  };

  // Mass action: apply SKU and MO
  const handleApplyMassSkuMo = () => {
    if (!massSku && !massMo) return;
    setBatchData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[k].selected) {
          if (massSku) updated[k].sku = massSku;
          if (massMo) updated[k].mo = massMo;
        }
      });
      return updated;
    });
  };

  // Mass action: Mark all selected as OFF
  const handleMarkSelectedAsOff = (reason: string) => {
    setBatchData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[k].selected) {
          updated[k].machineStatus = 'Off';
          updated[k].offReason = reason;
          updated[k].planHours = '0';
          updated[k].targetOutput = 0;
          if (!updated[k].remarks.includes(`[OFF: ${reason}]`)) {
            updated[k].remarks = `[OFF: ${reason}] ${updated[k].remarks}`.trim();
          }
        }
      });
      return updated;
    });
  };

  // Handle batch submit
  const handleBatchSubmit = async () => {
    const selectedEntries = Object.entries(batchData).filter(([_, data]) => data.selected);
    if (selectedEntries.length === 0) {
      setModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'No Machines Selected',
        message: 'Please select at least one machine checkbox to save batch plans.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const recordsToSave: Array<{ record: MachinePlanRecord; isNew: boolean }> = [];

    for (const [model, data] of selectedEntries) {
      const pHours = cleanParseNumber(data.planHours);
      const aOutput = cleanParseNumber(data.actualOutput);
      const ueeVal = data.totalUeePct ? cleanParseNumber(data.totalUeePct) : null;

      let finalRemarks = data.remarks.trim();
      if (data.machineStatus === 'Off' && data.offReason) {
        if (!finalRemarks.includes(`[OFF: ${data.offReason}]`)) {
          finalRemarks = `[OFF: ${data.offReason}] ${finalRemarks}`.trim();
        }
      }

      const isNew = !data.existingId;
      const recId = data.existingId || `MPA-${batchDate.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      recordsToSave.push({
        isNew,
        record: {
          id: recId,
          date: batchDate,
          department: data.department,
          uom: data.uom,
          machineModel: data.machineModel,
          specSpeedPerHour: data.specSpeedPerHour,
          specSpeedDisplay: `${formatNumeric(data.specSpeedPerHour)} ${data.uom}/H`,
          avWorkingHours: data.avWorkingHours,
          totalCapacityBasis: data.avWorkingHours * 1,
          capacityImplementPerHour: data.capacityImplementPerHour,
          planHours: pHours,
          machineStatus: data.machineStatus,
          offReason: data.machineStatus === 'Off' ? data.offReason : undefined,
          targetOutput: data.targetOutput,
          actualOutput: aOutput,
          sku: data.sku.trim(),
          mo: data.mo.trim(),
          totalUeePct: ueeVal,
          remarks: finalRemarks,
          shift: batchShift,
          updatedBy: userEmail,
          updatedAt: new Date().toISOString()
        }
      });
    }

    setIsSubmitting(true);
    try {
      await onBatchSaveRecords(recordsToSave);
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Batch Machine Plans Saved Successfully',
        message: `Successfully processed ${recordsToSave.length} machine plans for ${batchDate}.`,
        details: [
          `Department: ${batchDept}`,
          `Date: ${batchDate}`,
          `Total Machines Saved: ${recordsToSave.length}`
        ],
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save Batch Plans',
        message: err?.message || 'Error occurred during batch save.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch calculated summaries
  const batchSummary = useMemo(() => {
    const list = Object.values(batchData).filter(d => d.selected);
    const totalCount = list.length;
    const totalPlanHours = list.reduce((acc, curr) => acc + cleanParseNumber(curr.planHours), 0);
    const totalTarget = list.reduce((acc, curr) => acc + curr.targetOutput, 0);
    const totalActual = list.reduce((acc, curr) => acc + cleanParseNumber(curr.actualOutput), 0);
    const offCount = list.filter(d => d.machineStatus === 'Off').length;

    return { totalCount, totalPlanHours, totalTarget, totalActual, offCount };
  }, [batchData]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="machine-plan-entry-root">
      {/* Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Daily Machine Production Planning
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Schedule daily targets, plan hours, SKU & MO, or mark machines OFF with factory reason codes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/70">
          <button
            onClick={() => setEntryMode('single')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              entryMode === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            Single Machine Entry
          </button>
          <button
            onClick={() => setEntryMode('batch')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              entryMode === 'batch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            Batch Department Entry
          </button>
        </div>
      </div>

      {/* ================= SINGLE ENTRY MODE ================= */}
      {entryMode === 'single' && (
        <form onSubmit={handleSingleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs text-blue-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Individual Machine Production Plan</h4>
                <p className="text-xs text-slate-400">Specifications and capacity are auto-retrieved from MachineCapacity master</p>
              </div>
            </div>

            {existingSingleRecord && (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Existing Plan Found (Will Update)
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Machine Selection & Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-100">
              {/* Machine Search & Select */}
              <div className="relative md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>1. Select Machine Model <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] font-semibold text-slate-500 normal-case">
                    ({availableMachinesForSingle.length} available, {enteredModelsOnSingleDate.size} planned)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={availableMachinesForSingle.length === 0 ? "All machines already planned for this date" : "Search Machine Model or Name..."}
                    value={searchQuery}
                    disabled={availableMachinesForSingle.length === 0}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs font-bold font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-40 text-xs">
                    {availableMachinesForSingle.length === 0 ? (
                      <div className="p-4 text-center">
                        <div className="inline-flex p-2 bg-emerald-50 rounded-full text-emerald-600 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <p className="font-bold text-slate-800 text-xs">All machines planned for {singleDate}!</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Every machine has already been entered for this date. No pending machines.
                        </p>
                      </div>
                    ) : filteredMachineOptions.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">No machine matching search</div>
                    ) : (
                      filteredMachineOptions.map((m, idx) => (
                        <div
                          key={`${m.model}-${idx}`}
                          onClick={() => handleSelectMachineModel(m.model)}
                          className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <span className="font-bold text-slate-900 font-mono">{m.model}</span>
                            <span className="ml-2 text-[11px] text-slate-500">Dept: {m.department}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {formatNumeric(m.speed)} {m.uom}/H
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  2. Planning Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Step 2: Auto-Retrieved Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</span>
                <p className="font-bold text-slate-900 mt-0.5">{singleDept}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Standard Unit (UOM)</span>
                <p className="font-bold text-slate-900 mt-0.5">{singleUom}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Speed / Hour</span>
                <p className="font-bold text-blue-700 mt-0.5 font-mono">{formatNumeric(singleSpeed)} {singleUom}/H</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Capacity Imp / H</span>
                <p className="font-bold text-emerald-700 mt-0.5 font-mono">{formatNumeric(singleCapacityImplement)} {singleUom}/H</p>
              </div>
            </div>

            {/* Step 3: Production Plan & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Plan Hours */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center justify-between">
                  <span>Plan Hours (Hrs) <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-blue-600 font-mono">0 – 24 Hrs</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={singlePlanHours}
                  onChange={e => setSinglePlanHours(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-black text-blue-900 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-[11px] text-blue-600/80 mt-1">Shift runtime scheduled for this machine.</p>
              </div>

              {/* Target Output (Auto-Calculated) */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center justify-between">
                  <span>Target Output (Calculated)</span>
                  <span className="text-[11px] text-emerald-600 font-mono">{singleUom}</span>
                </label>
                <div className="px-3 py-2 text-sm font-black text-emerald-900 bg-white border border-emerald-200 rounded-xl font-mono">
                  {formatNumeric(singleTargetOutput)}
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-1">= Plan Hours × Capacity Implement/H</p>
              </div>

              {/* Actual Output */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Actual Output Achieved</span>
                  <span className="text-[11px] text-slate-500 font-mono">{singleUom}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 14200"
                  value={singleActualOutput}
                  onChange={e => setSingleActualOutput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Floor production counter achievement.</p>
              </div>
            </div>

            {/* Step 4: SKU, MO, Shift & Machine Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  SKU / Style Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SKU-COTTON-50"
                  value={singleSku}
                  onChange={e => setSingleSku(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  MO (Manufacturing Order)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MO-88291"
                  value={singleMo}
                  onChange={e => setSingleMo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Shift
                </label>
                <select
                  value={singleShift}
                  onChange={e => setSingleShift(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Day Shift">Day Shift (8:00 - 17:00)</option>
                  <option value="Night Shift">Night Shift (20:00 - 5:00)</option>
                  <option value="General">General Shift</option>
                  <option value="Both Shift">Both Shifts (16 Hrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Machine Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={singleStatus}
                  onChange={e => {
                    const st = e.target.value as MachineStatusType;
                    setSingleStatus(st);
                    if (st === 'Off') {
                      setSinglePlanHours('0');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Running">Running (Active Production)</option>
                  <option value="Planned">Planned (Scheduled)</option>
                  <option value="Off">OFF (Stopped / Offline)</option>
                  <option value="Idle">Idle (No Job Assigned)</option>
                  <option value="Breakdown">Breakdown (Maintenance)</option>
                  <option value="Maintenance">Maintenance (PM)</option>
                  <option value="Holiday">Holiday (Plant Closed)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* OFF Reason Section (if status is Off) */}
            {singleStatus === 'Off' && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <PowerOff className="w-4 h-4 text-rose-600" />
                  <span>Machine is Marked OFF — Select Downtime Reason:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMON_OFF_REASONS.map(r => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSingleOffReason(r.label)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        singleOffReason === r.label
                          ? 'bg-rose-100 border-rose-300 font-bold text-rose-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50/50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Operational Remarks / Floor Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Mold change completed at 10 AM, line running at nominal speed..."
                value={singleRemarks}
                onChange={e => setSingleRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSingleModel('');
                setSearchQuery('');
                setSinglePlanHours('8');
                setSingleActualOutput('');
                setSingleSku('');
                setSingleMo('');
                setSingleRemarks('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !singleModel}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : existingSingleRecord ? 'Update Machine Plan' : 'Save Machine Plan'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= BATCH DEPARTMENT ENTRY MODE ================= */}
      {entryMode === 'batch' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Batch Department Machine Plan Entry</h4>
                <p className="text-xs text-slate-400">
                  {Object.keys(batchData).length} pending machine(s) in {batchDept} for {batchDate} ({enteredModelsOnBatchDate.size} already planned)
                </p>
              </div>
            </div>

            <button
              onClick={handleBatchSubmit}
              disabled={isSubmitting || batchSummary.totalCount === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving All...' : `Save All Selected (${batchSummary.totalCount} Machines)`}</span>
            </button>
          </div>

          {/* Filter / Controls Bar */}
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
            {/* Department Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Department
              </label>
              <select
                value={batchDept}
                onChange={e => setBatchDept(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="All">All Factory Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Planning Date
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Shift Assignment
              </label>
              <select
                value={batchShift}
                onChange={e => setBatchShift(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Day Shift">Day Shift (8:00 - 17:00)</option>
                <option value="Night Shift">Night Shift (20:00 - 5:00)</option>
                <option value="General">General Shift</option>
                <option value="Both Shift">Both Shifts (16 Hrs)</option>
              </select>
            </div>
          </div>

          {/* Quick Batch Tools Toolbar */}
          <div className="px-5 py-3 bg-blue-50/40 border-y border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Quick Mass Fill:
              </span>

              {/* Mass Plan Hours */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={massPlanHours}
                  onChange={e => setMassPlanHours(e.target.value)}
                  className="w-14 px-1.5 py-0.5 text-xs font-bold text-center border-0 outline-none"
                  placeholder="Hours"
                />
                <button
                  type="button"
                  onClick={handleApplyMassPlanHours}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] cursor-pointer"
                >
                  Set Plan Hrs
                </button>
              </div>

              {/* Mass SKU / MO */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <input
                  type="text"
                  placeholder="SKU"
                  value={massSku}
                  onChange={e => setMassSku(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-xs font-semibold border-0 outline-none"
                />
                <input
                  type="text"
                  placeholder="MO"
                  value={massMo}
                  onChange={e => setMassMo(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-xs font-semibold border-0 outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyMassSkuMo}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-[11px] cursor-pointer"
                >
                  Apply SKU/MO
                </button>
              </div>
            </div>

            {/* Quick Mass Turn OFF */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-rose-700">Turn Selected OFF:</span>
              <button
                type="button"
                onClick={() => handleMarkSelectedAsOff('No Production Order / Work Order (NPO)')}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md font-semibold text-[11px] border border-rose-200 cursor-pointer"
              >
                No Order
              </button>
              <button
                type="button"
                onClick={() => handleMarkSelectedAsOff('Operator / Skilled Manpower Shortage')}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md font-semibold text-[11px] border border-rose-200 cursor-pointer"
              >
                No Operator
              </button>
              <button
                type="button"
                onClick={() => handleMarkSelectedAsOff('Scheduled Preventive Maintenance (PM)')}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md font-semibold text-[11px] border border-rose-200 cursor-pointer"
              >
                PM
              </button>
            </div>
          </div>

          {/* Batch Table */}
          <div className="p-4 sm:p-5 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={Object.values(batchData).length > 0 && Object.values(batchData).every(v => v.selected)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setBatchData(prev => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach(k => updated[k].selected = checked);
                          return updated;
                        });
                      }}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Machine Model</th>
                  <th className="py-2.5 px-3">Dept & Unit</th>
                  <th className="py-2.5 px-3 w-24 text-right">Cap Imp/H</th>
                  <th className="py-2.5 px-3 w-24">Plan Hrs</th>
                  <th className="py-2.5 px-3 w-28 text-right">Target Output</th>
                  <th className="py-2.5 px-3 w-28">SKU</th>
                  <th className="py-2.5 px-3 w-24">MO</th>
                  <th className="py-2.5 px-3 w-28">Actual Output</th>
                  <th className="py-2.5 px-3 w-32">Status</th>
                  <th className="py-2.5 px-3 w-40">Remarks / Reason</th>
                  <th className="py-2.5 px-3 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(batchData).length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          All machines for this department and date have already been planned!
                        </p>
                        <p className="text-xs text-slate-500">
                          Completed machine plans do not show for new entry on {batchDate}. There are no pending machines in {batchDept === 'All' ? 'the factory' : `department "${batchDept}"`}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  Object.entries(batchData).map(([model, data]) => {
                    const isOff = data.machineStatus === 'Off';
                    return (
                      <tr 
                        key={model}
                        className={`transition-colors ${
                          data.selected 
                            ? (isOff ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'bg-white hover:bg-slate-50/80') 
                            : 'bg-slate-50/40 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={data.selected}
                            onChange={e => {
                              const checked = e.target.checked;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: { ...prev[model], selected: checked }
                              }));
                            }}
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Machine Model */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                            <span>{data.machineModel}</span>
                            {data.existingId && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Existing
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dept & UOM */}
                        <td className="py-2.5 px-3">
                          <span className="text-slate-600 font-medium">{data.department}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">UOM: {data.uom}</span>
                        </td>

                        {/* Capacity Implement/Hour */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                          {formatNumeric(data.capacityImplementPerHour)}
                        </td>

                        {/* Plan Hours */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={data.planHours}
                            onChange={e => {
                              const val = e.target.value;
                              const hours = cleanParseNumber(val);
                              setBatchData(prev => ({
                                ...prev,
                                [model]: {
                                  ...prev[model],
                                  planHours: val,
                                  targetOutput: calculateTargetOutput(hours, data.capacityImplementPerHour)
                                }
                              }));
                            }}
                            className="w-full px-2 py-1 font-bold text-center bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        </td>

                        {/* Target Output */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          {formatNumeric(data.targetOutput)}
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="SKU"
                            value={data.sku}
                            onChange={e => {
                              const val = e.target.value;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: { ...prev[model], sku: val }
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                          />
                        </td>

                        {/* MO */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="MO"
                            value={data.mo}
                            onChange={e => {
                              const val = e.target.value;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: { ...prev[model], mo: val }
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                          />
                        </td>

                        {/* Actual Output */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="Actual"
                            value={data.actualOutput}
                            onChange={e => {
                              const val = e.target.value;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: { ...prev[model], actualOutput: val }
                              }));
                            }}
                            className="w-full px-2 py-1 font-bold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        </td>

                        {/* Machine Status */}
                        <td className="py-2.5 px-3">
                          <select
                            value={data.machineStatus}
                            onChange={e => {
                              const st = e.target.value as MachineStatusType;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: {
                                  ...prev[model],
                                  machineStatus: st,
                                  planHours: st === 'Off' ? '0' : prev[model].planHours,
                                  targetOutput: st === 'Off' ? 0 : calculateTargetOutput(cleanParseNumber(prev[model].planHours), prev[model].capacityImplementPerHour)
                                }
                              }));
                            }}
                            className="w-full px-2 py-1 font-bold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                          >
                            <option value="Running">Running</option>
                            <option value="Planned">Planned</option>
                            <option value="Off">OFF</option>
                            <option value="Idle">Idle</option>
                            <option value="Breakdown">Breakdown</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Holiday">Holiday</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>

                        {/* Remarks / Reason */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder={isOff ? 'OFF reason...' : 'Remarks...'}
                            value={data.remarks}
                            onChange={e => {
                              const val = e.target.value;
                              setBatchData(prev => ({
                                ...prev,
                                [model]: { ...prev[model], remarks: val }
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                          />
                        </td>

                        {/* Quick Turn OFF Button */}
                        <td className="py-2.5 px-3 text-center">
                          {isOff ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBatchData(prev => ({
                                  ...prev,
                                  [model]: {
                                    ...prev[model],
                                    machineStatus: 'Running',
                                    planHours: '8',
                                    targetOutput: calculateTargetOutput(8, data.capacityImplementPerHour)
                                  }
                                }));
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                              title="Turn Back ON"
                            >
                              Turn ON
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setBatchData(prev => ({
                                  ...prev,
                                  [model]: {
                                    ...prev[model],
                                    machineStatus: 'Off',
                                    offReason: 'No Production Order / Work Order (NPO)',
                                    planHours: '0',
                                    targetOutput: 0,
                                    remarks: `[OFF: No Order] ${prev[model].remarks}`.trim()
                                  }
                                }));
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              title="Quick Turn OFF"
                            >
                              <PowerOff className="w-3 h-3" />
                              <span>OFF</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Batch Summary Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              <span>Selected: <strong className="text-slate-900 font-bold">{batchSummary.totalCount}</strong> Machines</span>
              <span className="text-slate-300">·</span>
              <span>Total Plan Hours: <strong className="text-blue-700 font-bold">{batchSummary.totalPlanHours}</strong> Hrs</span>
              <span className="text-slate-300">·</span>
              <span>Total Target: <strong className="text-emerald-700 font-bold">{formatNumeric(batchSummary.totalTarget)}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Total Actual: <strong className="text-slate-900 font-bold">{formatNumeric(batchSummary.totalActual)}</strong></span>
              {batchSummary.offCount > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-rose-600 font-bold">({batchSummary.offCount} Marked OFF)</span>
                </>
              )}
            </div>

            <button
              onClick={handleBatchSubmit}
              disabled={isSubmitting || batchSummary.totalCount === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving All...' : `Save All Selected (${batchSummary.totalCount} Machines)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Notification / Alert Modal */}
      <KPIModalNotification
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        details={modalConfig.details}
        onClose={modalConfig.onClose}
      />
    </div>
  );
}
