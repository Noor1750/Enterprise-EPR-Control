import React, { useState, useMemo, useEffect } from 'react';
import { BreakdownRecord, BreakdownStatus } from '../../types/breakdown';
import { UserSecurityScope } from '../../lib/security';
import SearchableSelect from '../common/SearchableSelect';
import TimeSelectDropdown, { getCurrentTimeHHMM } from '../common/TimeSelectDropdown';
import { 
  calculateResponseTime, 
  calculateWorkingHourLost,
  getMachineCapacityMetrics,
  calculateLostProduction,
  BREAKDOWN_STATUSES
} from '../../lib/breakdownUtils';
import { 
  Wrench, CheckCircle2, Clock, AlertTriangle, UserCheck, 
  Settings, DollarSign, Layers, ShieldCheck, Sparkles, 
  Calendar, Check, ChevronRight, Activity, ArrowRight, 
  HardDrive, AlertCircle, RefreshCw, Lock, Zap, Info
} from 'lucide-react';
import { BreakdownCalculationModal } from './BreakdownCalculationModal';
import ActionModalNotification, { ActionModalProps } from '../common/ActionModalNotification';

interface MaintenanceWorkflowProps {
  records: BreakdownRecord[];
  machinesList: string[][];
  employeesList: string[][];
  holidaysList: string[][];
  overridesList?: string[][];
  shiftsList?: string[][];
  masterFailureModes: string[];
  masterCategories: string[];
  masterActivities: string[];
  masterSpareParts: { name: string; defaultCost: number; uom: string }[];
  masterUOMs: string[];
  userSecurityScope?: UserSecurityScope;
  onSaveRecord: (record: BreakdownRecord, auditNote?: string) => Promise<void>;
  onSwitchToLog?: () => void;
}

export default function MaintenanceWorkflow({
  records,
  machinesList,
  employeesList,
  holidaysList,
  overridesList = [],
  shiftsList = [],
  masterFailureModes,
  masterCategories,
  masterActivities,
  masterSpareParts,
  masterUOMs,
  userSecurityScope,
  onSaveRecord,
  onSwitchToLog
}: MaintenanceWorkflowProps) {
  
  // Active / Unsolved Records Queue
  const unsolvedRecords = useMemo(() => {
    return records.filter(r => 
      r.status !== 'Completed' && 
      r.status !== 'Closed' && 
      r.status !== 'Cancelled'
    );
  }, [records]);

  // Search & Filter in Queue
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'All' | 'Down' | 'Unattended' | 'InProgress' | 'WaitingParts'>('All');
  
  // Selected Breakdown Record for Action
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

  // Auto select first unsolved breakdown on load
  useEffect(() => {
    if (unsolvedRecords.length > 0) {
      if (!selectedId || !unsolvedRecords.some(r => r.id === selectedId)) {
        setSelectedId(unsolvedRecords[0].id);
      }
    } else {
      setSelectedId('');
    }
  }, [unsolvedRecords, selectedId]);

  const selectedRecord = useMemo(() => {
    return records.find(r => r.id === selectedId) || null;
  }, [records, selectedId]);

  // Form State for Taking Maintenance Action
  const [attendAt, setAttendAt] = useState<string>('');
  const [attendById, setAttendById] = useState<string>('');
  const [attendByName, setAttendByName] = useState<string>('');
  const [attendByAll, setAttendByAll] = useState<string[]>([]);
  
  const [machineStartDate, setMachineStartDate] = useState<string>('');
  const [machineStartAt, setMachineStartAt] = useState<string>(getCurrentTimeHHMM());
  
  const [failureMode, setFailureMode] = useState<string>('');
  const [category, setCategory] = useState<string>('Breakdown');
  const [activity, setActivity] = useState<string>('');
  
  const [sparePartsService, setSparePartsService] = useState<string>('None');
  const [quantity, setQuantity] = useState<number>(0);
  const [uom, setUom] = useState<string>('PCS');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  const [status, setStatus] = useState<BreakdownStatus>('Maintenance in Progress');
  const [remarks, setRemarks] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Unified Notification Modal State
  const [modalConfig, setModalConfig] = useState<ActionModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Sync state when selectedRecord changes
  useEffect(() => {
    if (selectedRecord) {
      setAttendAt(selectedRecord.attendAt || '');
      setAttendById(selectedRecord.attendById || userSecurityScope?.employeeId || '');
      setAttendByName(selectedRecord.attendByName || userSecurityScope?.employeeName || '');
      setAttendByAll(selectedRecord.attendByAll || []);
      
      setMachineStartDate(selectedRecord.date || new Date().toISOString().substring(0, 10));
      // Machine Start At defaults to current time if not already set
      setMachineStartAt(selectedRecord.machineStartAt || getCurrentTimeHHMM());
      
      setFailureMode(selectedRecord.failureMode || masterFailureModes[0] || 'Mechanical');
      setCategory(selectedRecord.category || 'Breakdown');
      setActivity(selectedRecord.activity || masterActivities[0] || '');
      
      setSparePartsService(selectedRecord.sparePartsService || 'None');
      setQuantity(selectedRecord.quantity || 0);
      setUom(selectedRecord.uom || 'PCS');
      setUnitCost(selectedRecord.unitCost || 0);
      setTotalCost(selectedRecord.totalCost || 0);
      
      setStatus(selectedRecord.status === 'Open' ? 'Maintenance in Progress' : selectedRecord.status);
      setRemarks(selectedRecord.remarks || '');
      setSaveSuccessMsg(null);
    }
  }, [selectedRecord, userSecurityScope]);

  // Recalculate response time dynamically
  const responseTimeCalculated = useMemo(() => {
    if (!selectedRecord) return { minutes: 0, isValid: true };
    return calculateResponseTime(selectedRecord.reportAt, attendAt);
  }, [selectedRecord, attendAt]);

  // Recalculate working downtime (16 hours per day, skipping holidays and weekends)
  const downtimeCalculated = useMemo(() => {
    if (!selectedRecord) return { minutes: 0, decimalHours: 0, formatted: '0 Hours', isValid: true, lostPcs: 0, hourlyCapacityPcs: 0, standardUnit: 'PCS', calculationDetails: null };
    return calculateWorkingHourLost(
      selectedRecord.date,
      selectedRecord.reportAt,
      machineStartDate || selectedRecord.date,
      machineStartAt,
      selectedRecord.productionStop,
      holidaysList,
      overridesList,
      selectedRecord.machineName,
      machinesList,
      selectedRecord.department,
      shiftsList
    );
  }, [selectedRecord, machineStartDate, machineStartAt, holidaysList, overridesList, machinesList, shiftsList]);

  // Machine Capacity Metrics for the selected machine
  const machineCapMetrics = useMemo(() => {
    if (!selectedRecord) return getMachineCapacityMetrics('', machinesList);
    return getMachineCapacityMetrics(selectedRecord.machineName, machinesList);
  }, [selectedRecord, machinesList]);

  // Lost PCS and Lost Machine Units calculated live
  const productionLossCalculated = useMemo(() => {
    const hours = downtimeCalculated.decimalHours || 0;
    return calculateLostProduction(hours, selectedRecord?.machineName, machinesList);
  }, [downtimeCalculated.decimalHours, selectedRecord, machinesList]);

  // Technician / Employee Options
  const employeeOptions = useMemo(() => {
    return employeesList.map(emp => ({
      value: emp[0],
      label: `${emp[1]} (${emp[0]})`,
      sublabel: `${emp[3] || emp[2] || 'Staff'} - ${emp[4] || 'Tech'}`,
      badge: emp[3] || ''
    }));
  }, [employeesList]);

  const handleLeadTechChange = (empId: string) => {
    setAttendById(empId);
    const emp = employeesList.find(e => e[0] === empId);
    if (emp) {
      setAttendByName(emp[1] || '');
      if (!attendByAll.includes(emp[1])) {
        setAttendByAll(prev => [...prev, emp[1]]);
      }
    }
  };

  // Spare Parts Options
  const sparePartOptions = useMemo(() => {
    const list = [
      { value: 'None', label: 'None (No Spare Parts Used)', sublabel: 'Cost: $0.00', badge: '$0' },
      ...masterSpareParts.map(sp => ({
        value: sp.name,
        label: sp.name,
        sublabel: `Default Cost: $${sp.defaultCost.toFixed(2)} / ${sp.uom}`,
        badge: `$${sp.defaultCost}`
      }))
    ];
    return list;
  }, [masterSpareParts]);

  const handleSparePartChange = (partName: string) => {
    setSparePartsService(partName);
    const matched = masterSpareParts.find(p => p.name === partName);
    if (matched) {
      setUnitCost(matched.defaultCost);
      setUom(matched.uom);
      if (quantity === 0) setQuantity(1);
      setTotalCost(matched.defaultCost * (quantity === 0 ? 1 : quantity));
    } else if (partName === 'None') {
      setUnitCost(0);
      setQuantity(0);
      setTotalCost(0);
    }
  };

  const handleQtyChange = (qtyVal: number) => {
    const q = Math.max(0, qtyVal);
    setQuantity(q);
    setTotalCost(Math.round(q * unitCost * 100) / 100);
  };

  const handleUnitCostChange = (costVal: number) => {
    const c = Math.max(0, costVal);
    setUnitCost(c);
    setTotalCost(Math.round(quantity * c * 100) / 100);
  };

  // Filtered Queue of Unsolved Machines
  const filteredQueue = useMemo(() => {
    return unsolvedRecords.filter(r => {
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        const match = 
          r.id.toLowerCase().includes(q) ||
          r.machineName.toLowerCase().includes(q) ||
          r.machineNo.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.problemDescription.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (queueFilter === 'Down' && r.productionStop !== 'Yes') return false;
      if (queueFilter === 'Unattended' && r.attendAt) return false;
      if (queueFilter === 'InProgress' && r.status !== 'Maintenance in Progress') return false;
      if (queueFilter === 'WaitingParts' && r.status !== 'Waiting for Spare Parts') return false;

      return true;
    });
  }, [unsolvedRecords, queueSearch, queueFilter]);

  // Save Maintenance Action Handler
  const handleSaveAction = async (forcedStatus?: BreakdownStatus) => {
    if (!selectedRecord) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    const targetStatus = forcedStatus || status;

    try {
      const now = new Date().toISOString();
      const updated: BreakdownRecord = {
        ...selectedRecord,
        attendAt: attendAt.trim(),
        responseTimeMin: responseTimeCalculated.minutes,
        machineStartDate,
        machineStartAt: machineStartAt.trim(),
        hourLostHours: downtimeCalculated.decimalHours,
        hourLostFormatted: downtimeCalculated.formatted,
        lostPcs: downtimeCalculated.lostPcs,
        capacityPerHour: downtimeCalculated.hourlyCapacityPcs,
        capacityPerDay: downtimeCalculated.hourlyCapacityPcs * 16,
        unitStandard: downtimeCalculated.standardUnit,
        calculationDetails: downtimeCalculated.calculationDetails,
        attendById,
        attendByName,
        attendByAll,
        failureMode,
        category,
        activity,
        sparePartsService,
        quantity,
        uom,
        unitCost,
        totalCost,
        status: targetStatus,
        remarks: remarks.trim(),
        updatedBy: userSecurityScope?.employeeId || userSecurityScope?.username || 'Maintenance',
        updatedAt: now
      };

      await onSaveRecord(
        updated,
        `Maintenance Action taken on ${updated.machineName} (${updated.machineNo}). Status updated to ${targetStatus}. Working downtime: ${downtimeCalculated.formatted}.`
      );

      setSaveSuccessMsg(`Action saved successfully! Machine status: ${targetStatus}.`);
      
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: `Maintenance Updated: ${updated.machineName}`,
        message: `Breakdown ticket #${updated.id} was successfully updated to status "${targetStatus}".`,
        details: [
          `Attended By: ${attendByName || 'N/A'}`,
          `Downtime: ${downtimeCalculated.formatted}`,
          `Estimated Lost Production: ${downtimeCalculated.lostPcs.toLocaleString()} ${downtimeCalculated.standardUnit || 'PCS'}`,
          `Total Cost: $${totalCost.toFixed(2)}`
        ],
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });

      // Auto dismiss success message after 4s
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);

    } catch (err) {
      console.error('Failed to save maintenance action:', err);
      alert('Failed to save maintenance action. Please check your network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Wrench className="w-5 h-5 text-indigo-400" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Maintenance Action Center
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-mono font-bold">
                  {unsolvedRecords.length} Active Breakdowns
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Select any breakdown machine from the active queue to diagnose, attend, record downtime, replace parts, and complete repair.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onSwitchToLog && (
            <button
              type="button"
              onClick={onSwitchToLog}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <HardDrive className="w-4 h-4" />
              <span>View Unsolved Logs Table</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid: Left = Machine Queue | Right = Action Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Active Breakdown Machine Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                Select Breakdown Machine
              </h3>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {filteredQueue.length} Pending
              </span>
            </div>

            {/* Queue Search */}
            <input
              type="text"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search machine, ticket, or problem..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />

            {/* Queue Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'All', label: 'All Unsolved' },
                { id: 'Down', label: '🔴 Down Only' },
                { id: 'Unattended', label: '⚠️ Unattended' },
                { id: 'InProgress', label: '🛠️ In Progress' },
                { id: 'WaitingParts', label: '📦 Parts' }
              ].map(f => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setQueueFilter(f.id as any)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    queueFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Machine Queue List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto custom-scrollbar pt-1">
              {filteredQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No active breakdown machines</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All machines are running or issues are resolved.</p>
                </div>
              ) : (
                filteredQueue.map((item, idx) => {
                  const isSelected = item.id === selectedId;
                  const isDown = item.productionStop === 'Yes';
                  return (
                    <button
                      type="button"
                      key={`${item.id}-${idx}`}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all relative ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Ticket ID & Stop Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-black text-indigo-700">
                          {item.id}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isDown ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isDown ? 'STOP: Down' : 'Running'}
                        </span>
                      </div>

                      {/* Machine Name & Number */}
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.machineName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {item.machineNo}
                        </span>
                      </div>

                      {/* Department & Problem Snippet */}
                      <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                        <span className="font-bold text-slate-700">{item.department}</span>: {item.problemDescription}
                      </div>

                      {/* Bottom Info: Reported time & Attend Status */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Report: {item.date} {item.reportAt}
                        </span>
                        <span className={`font-bold px-1.5 py-0.5 rounded-full ${
                          item.attendAt ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.attendAt ? `Attended ${item.attendAt}` : 'Not Attended'}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Action Console (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {selectedRecord ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              
              {/* Success Notification Alert */}
              {saveSuccessMsg && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-2.5 text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">{saveSuccessMsg}</span>
                </div>
              )}

              {/* 1. Ticket & Machine Capacity Summary Card */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        {selectedRecord.id}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        {selectedRecord.machineName}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        ({selectedRecord.machineNo})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-bold text-slate-700">Problem:</span> {selectedRecord.problemDescription}
                    </p>
                  </div>

                  <div className="text-right sm:shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                      selectedRecord.productionStop === 'Yes'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedRecord.productionStop === 'Yes' ? '🛑 Production Stopped' : '⚡ Running'}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Reported by {selectedRecord.reporterName} ({selectedRecord.reporterId}) at {selectedRecord.reportAt}
                    </div>
                  </div>
                </div>

                {/* Machine Capacity Benchmark Data */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">16-Hour Capacity</div>
                    <div className="text-xs font-black text-slate-800 font-mono">
                      {machineCapMetrics.capacity16Pcs > 0 ? `${machineCapMetrics.capacity16Pcs.toLocaleString()} ${machineCapMetrics.standardUnit}` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Hourly PCS Rate</div>
                    <div className="text-xs font-black text-indigo-700 font-mono">
                      {machineCapMetrics.hourlyCapacityPcs > 0 ? `${Math.round(machineCapMetrics.hourlyCapacityPcs).toLocaleString()} / hr` : '—'}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Machine Units Cap</div>
                    <div className="text-xs font-black text-slate-800 font-mono">
                      {machineCapMetrics.capacity16MachineUnit > 0 ? `${machineCapMetrics.capacity16MachineUnit} Units/16h` : '—'}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Machine Speed / Util</div>
                    <div className="text-xs font-black text-slate-800 font-mono">
                      {machineCapMetrics.speedPerMin} /min ({machineCapMetrics.utilization})
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Step 1: Technician Attendance & Response Time */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Technician Attendance & Response
                    </h4>
                  </div>
                  {responseTimeCalculated.minutes > 0 && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Response Time: {responseTimeCalculated.minutes} Min
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Attend At (Time) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Attend At (Time)
                    </label>
                    <TimeSelectDropdown
                      value={attendAt}
                      onChange={setAttendAt}
                      placeholder="Select attend time..."
                    />
                  </div>

                  {/* Primary Lead Technician */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Primary Attending Lead <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={employeeOptions}
                      value={attendById}
                      onChange={handleLeadTechChange}
                      placeholder="-- Select Lead Tech --"
                      searchPlaceholder="Search technician..."
                      required
                    />
                  </div>

                  {/* Attending Team Members */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assisting Tech Team
                    </label>
                    <input
                      type="text"
                      value={attendByAll.join(', ')}
                      onChange={(e) => setAttendByAll(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. Technician A, Technician B"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Step 2: Machine Restart & Downtime (16h Standard, No Weekend/Holiday) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Machine Start Time & Working Downtime
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Standard: 16 working hours / day (Weekends/Holidays excluded)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Machine Start Date
                    </label>
                    <input
                      type="date"
                      value={machineStartDate}
                      onChange={(e) => setMachineStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Machine Start At (Time) - Searchable dropdown, defaults to current time, user can change */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Machine Start At (Time) <span className="text-rose-500">*</span>
                    </label>
                    <TimeSelectDropdown
                      value={machineStartAt}
                      onChange={setMachineStartAt}
                      defaultToNowOnMount={true}
                      placeholder="Select start time..."
                      required
                    />
                  </div>

                  {/* Calculated Hours Lost */}
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">Working Hours Lost</div>
                      {downtimeCalculated.decimalHours > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCalcModalOpen(true)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> Details
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-black text-amber-900 font-mono mt-0.5 flex items-center justify-between">
                      <span>{downtimeCalculated.formatted}</span>
                      <button
                        type="button"
                        onClick={() => setIsCalcModalOpen(true)}
                        className="text-slate-400 hover:text-indigo-600"
                        title="View Working Hours Calculation Breakdown"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Live Lost PCS & Machine Units */}
                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
                    <div className="text-[10px] text-rose-700 font-bold uppercase">Production Loss (Lost PCS)</div>
                    <div className="text-sm font-black text-rose-900 font-mono mt-0.5">
                      {productionLossCalculated.lostPcs.toLocaleString()} PCS
                    </div>
                    <div className="text-[10px] text-rose-600 font-mono">
                      {productionLossCalculated.lostMachineUnits} Machine Units
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. Step 3: Failure Analysis & Spare Parts Allocation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Failure Mode, Maintenance Activity & Spare Parts
                    </h4>
                  </div>
                  {totalCost > 0 && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      Total Cost: ${totalCost.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Failure Mode, Category, Activity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Failure Mode
                    </label>
                    <SearchableSelect
                      options={masterFailureModes}
                      value={failureMode}
                      onChange={setFailureMode}
                      placeholder="-- Select Failure Mode --"
                      searchPlaceholder="Search failure mode..."
                      allowCustom
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <SearchableSelect
                      options={masterCategories}
                      value={category}
                      onChange={setCategory}
                      placeholder="-- Select Category --"
                      searchPlaceholder="Search category..."
                      allowCustom
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Activity Done
                    </label>
                    <SearchableSelect
                      options={masterActivities}
                      value={activity}
                      onChange={setActivity}
                      placeholder="-- Select Activity --"
                      searchPlaceholder="Search maintenance activity..."
                      allowCustom
                    />
                  </div>
                </div>

                {/* Spare Parts Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Spare Parts / Service Used
                    </label>
                    <SearchableSelect
                      options={sparePartOptions}
                      value={sparePartsService}
                      onChange={handleSparePartChange}
                      placeholder="-- Select Spare Part --"
                      searchPlaceholder="Search spare part..."
                      allowCustom
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Qty & UOM
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantity}
                        onChange={(e) => handleQtyChange(parseFloat(e.target.value) || 0)}
                        className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-mono font-bold text-slate-800"
                      />
                      <SearchableSelect
                        options={masterUOMs}
                        value={uom}
                        onChange={setUom}
                        placeholder="UOM"
                        className="w-1/2"
                        allowCustom
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Remarks / Root Cause */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corrective Action, Root Cause & Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter root cause analysis, action taken by maintenance team, preventive steps..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* 5. Status & Action Execution Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 shrink-0">
                    Ticket Status:
                  </label>
                  <div className="w-56">
                    <SearchableSelect
                      options={BREAKDOWN_STATUSES}
                      value={status}
                      onChange={(val) => setStatus(val as BreakdownStatus)}
                      placeholder="Select status..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveAction()}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Maintenance Action</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveAction('Completed')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Close Breakdown</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
              <HardDrive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Breakdown Machine Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a machine from the active queue on the left to start taking maintenance action.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Calculation Transparency Details Modal */}
      {isCalcModalOpen && selectedRecord && (
        <BreakdownCalculationModal
          isOpen={isCalcModalOpen}
          onClose={() => setIsCalcModalOpen(false)}
          record={{
            ...selectedRecord,
            machineStartDate,
            machineStartAt,
            hourLostHours: downtimeCalculated.decimalHours,
            hourLostFormatted: downtimeCalculated.formatted,
            lostPcs: downtimeCalculated.lostPcs,
            capacityPerHour: downtimeCalculated.hourlyCapacityPcs,
            capacityPerDay: downtimeCalculated.hourlyCapacityPcs * 16,
            unitStandard: downtimeCalculated.standardUnit,
            calculationDetails: downtimeCalculated.calculationDetails
          }}
          calculationDetails={downtimeCalculated.calculationDetails}
        />
      )}

      {/* Action Feedback Popup Modal */}
      <ActionModalNotification {...modalConfig} />

    </div>
  );
}
