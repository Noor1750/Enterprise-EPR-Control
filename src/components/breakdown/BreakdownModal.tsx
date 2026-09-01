import React, { useState, useEffect, useMemo } from 'react';
import { BreakdownRecord, BreakdownStatus, BreakdownAuditLogEntry } from '../../types/breakdown';
import { UserSecurityScope } from '../../lib/security';
import { 
  X, AlertTriangle, Clock, Wrench, Shield, CheckCircle, 
  DollarSign, Package, UserCheck, AlertCircle, FileText, 
  History, Calendar, CheckSquare, RefreshCw, Lock, HardDrive, Zap,
  Sparkles, Info
} from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import TimeSelectDropdown, { getCurrentTimeHHMM } from '../common/TimeSelectDropdown';
import { LABEL_PRINTING_BREAKDOWN_SUGGESTIONS } from './labelPrintingSuggestions';
import { BreakdownCalculationModal } from './BreakdownCalculationModal';
import { 
  calculateResponseTime, 
  calculateWorkingHourLost,
  getMachineCapacityMetrics,
  calculateLostProduction,
  DEFAULT_FAILURE_MODES, 
  DEFAULT_CATEGORIES, 
  DEFAULT_ACTIVITIES, 
  DEFAULT_SPARE_PARTS, 
  DEFAULT_UOMS, 
  BREAKDOWN_STATUSES,
  timeStringToMinutes
} from '../../lib/breakdownUtils';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BreakdownRecord, auditNote?: string) => Promise<void>;
  initialRecord?: BreakdownRecord | null;
  records?: BreakdownRecord[];
  machinesList: string[][]; // MachineCapacity rows
  employeesList: string[][]; // Employees rows
  departmentsList: string[];
  holidaysList?: string[][]; // Holidays rows
  overridesList?: string[][]; // HolidayOverrides rows
  shiftsList?: string[][]; // Shifts rows
  masterFailureModes?: string[];
  masterCategories?: string[];
  masterActivities?: string[];
  masterSpareParts?: { name: string; defaultCost: number; uom: string }[];
  masterUOMs?: string[];
  userSecurityScope?: UserSecurityScope;
  auditLogs?: BreakdownAuditLogEntry[];
  nextGeneratedId: string;
  initialMode?: 'report' | 'maintenance';
}

export default function BreakdownModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  records = [],
  machinesList,
  employeesList,
  departmentsList,
  holidaysList = [],
  overridesList = [],
  shiftsList = [],
  masterFailureModes = DEFAULT_FAILURE_MODES,
  masterCategories = DEFAULT_CATEGORIES,
  masterActivities = DEFAULT_ACTIVITIES,
  masterSpareParts = DEFAULT_SPARE_PARTS,
  masterUOMs = DEFAULT_UOMS,
  userSecurityScope,
  auditLogs = [],
  nextGeneratedId,
  initialMode = 'report'
}: BreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
  const [showMaintenanceSection, setShowMaintenanceSection] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCalcDetailModalOpen, setIsCalcDetailModalOpen] = useState(false);

  // Is this an edit or new creation?
  const isEditing = Boolean(initialRecord && initialRecord.id);
  const isClosed = initialRecord?.status === 'Closed';
  const canModifyClosed = Boolean(userSecurityScope?.isAdmin || userSecurityScope?.isSuperuser);
  const isReadOnly = isClosed && !canModifyClosed;

  // Form State - 8 User Breakdown Log Fields
  const [id, setId] = useState(initialRecord?.id || nextGeneratedId);
  const [date, setDate] = useState(initialRecord?.date || new Date().toISOString().substring(0, 10));
  const [department, setDepartment] = useState(initialRecord?.department || '');
  const NON_MACHINE_DEPTS = ['HR', 'IT', 'Maintenance'];
  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);
  const [machineName, setMachineName] = useState(initialRecord?.machineName || '');
  const [machineNo, setMachineNo] = useState(initialRecord?.machineNo || '');
  const [problemDescription, setProblemDescription] = useState(initialRecord?.problemDescription || '');
  const [productionStop, setProductionStop] = useState<'Yes' | 'No'>(initialRecord?.productionStop || 'Yes');
  
  const [reportAt, setReportAt] = useState(initialRecord?.reportAt || getCurrentTimeHHMM());
  const [reporterId, setReporterId] = useState(initialRecord?.reporterId || userSecurityScope?.employeeId || '');
  const [reporterName, setReporterName] = useState(initialRecord?.reporterName || userSecurityScope?.employeeName || '');
  
  // Maintenance Team Fields
  const [attendAt, setAttendAt] = useState(initialRecord?.attendAt || '');
  const [attendById, setAttendById] = useState(initialRecord?.attendById || '');
  const [attendByName, setAttendByName] = useState(initialRecord?.attendByName || '');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>(initialRecord?.attendByAll || []);
  
  // Machine Start At defaults to current time
  const [machineStartDate, setMachineStartDate] = useState(initialRecord?.date || new Date().toISOString().substring(0, 10));
  const [machineStartAt, setMachineStartAt] = useState(initialRecord?.machineStartAt || getCurrentTimeHHMM());
  const [failureMode, setFailureMode] = useState(initialRecord?.failureMode || masterFailureModes[0] || 'Mechanical');
  const [category, setCategory] = useState(initialRecord?.category || 'Breakdown');
  const [activity, setActivity] = useState(initialRecord?.activity || masterActivities[0] || '');
  const [customActivity, setCustomActivity] = useState('');
  
  const [sparePartsService, setSparePartsService] = useState(initialRecord?.sparePartsService || 'None');
  const [quantity, setQuantity] = useState<number>(initialRecord?.quantity || 0);
  const [uom, setUom] = useState(initialRecord?.uom || 'PCS');
  const [unitCost, setUnitCost] = useState<number>(initialRecord?.unitCost || 0);
  
  const [status, setStatus] = useState<BreakdownStatus>(initialRecord?.status || 'Open');
  const [remarks, setRemarks] = useState(initialRecord?.remarks || '');

  // Reset or initialize on record change
  useEffect(() => {
    if (initialRecord) {
      setId(initialRecord.id);
      setDate(initialRecord.date || new Date().toISOString().substring(0, 10));
      setDepartment(initialRecord.department || '');
      setMachineName(initialRecord.machineName || '');
      setMachineNo(initialRecord.machineNo || '');
      setProblemDescription(initialRecord.problemDescription || '');
      setProductionStop(initialRecord.productionStop || 'Yes');
      setReportAt(initialRecord.reportAt || '');
      setReporterId(initialRecord.reporterId || '');
      setReporterName(initialRecord.reporterName || '');
      setAttendAt(initialRecord.attendAt || '');
      setAttendById(initialRecord.attendById || '');
      setAttendByName(initialRecord.attendByName || '');
      setSelectedTechnicians(initialRecord.attendByAll || []);
      setMachineStartDate(initialRecord.date || new Date().toISOString().substring(0, 10));
      setMachineStartAt(initialRecord.machineStartAt || getCurrentTimeHHMM());
      setFailureMode(initialRecord.failureMode || masterFailureModes[0] || 'Mechanical');
      setCategory(initialRecord.category || 'Breakdown');
      setActivity(initialRecord.activity || masterActivities[0] || '');
      setSparePartsService(initialRecord.sparePartsService || 'None');
      setQuantity(initialRecord.quantity || 0);
      setUom(initialRecord.uom || 'PCS');
      setUnitCost(initialRecord.unitCost || 0);
      setStatus(initialRecord.status || 'Open');
      setRemarks(initialRecord.remarks || '');
      setShowMaintenanceSection(true);
    } else {
      setId(nextGeneratedId);
      setDate(new Date().toISOString().substring(0, 10));
      setDepartment('');
      setMachineName('');
      setMachineNo('');
      setProblemDescription('');
      setProductionStop('Yes');
      setReportAt(getCurrentTimeHHMM());
      setReporterId(userSecurityScope?.employeeId || '');
      setReporterName(userSecurityScope?.employeeName || '');
      setAttendAt('');
      setAttendById('');
      setAttendByName('');
      setSelectedTechnicians([]);
      setMachineStartDate(new Date().toISOString().substring(0, 10));
      setMachineStartAt(getCurrentTimeHHMM());
      setFailureMode(masterFailureModes[0] || 'Mechanical');
      setCategory('Breakdown');
      setActivity(masterActivities[0] || '');
      setSparePartsService('None');
      setQuantity(0);
      setUom('PCS');
      setUnitCost(0);
      setStatus('Open');
      setRemarks('');
      setShowMaintenanceSection(initialMode === 'maintenance');
    }
    setValidationError(null);
    setActiveTab('details');
  }, [initialRecord, nextGeneratedId, isOpen, initialMode, userSecurityScope]);

  // Active unsolved breakdowns lookup
  const activeUnsolvedBreakdowns = useMemo(() => {
    const map = new Map<string, BreakdownRecord>();
    records.forEach(r => {
      // Exclude current editing record
      if (isEditing && r.id === initialRecord?.id) return;
      if (r.status !== 'Completed' && r.status !== 'Closed' && r.status !== 'Cancelled') {
        if (r.machineName) map.set(r.machineName.trim().toLowerCase(), r);
        if (r.machineNo) map.set(r.machineNo.trim().toLowerCase(), r);
      }
    });
    return map;
  }, [records, isEditing, initialRecord]);

  // Check if currently selected machine has an active unsolved breakdown
  const selectedMachineActiveBreakdown = useMemo(() => {
    if (isEditing) return null;
    if (isNonMachineDept) return null;
    if (!machineName && !machineNo) return null;
    return (
      (machineName ? activeUnsolvedBreakdowns.get(machineName.trim().toLowerCase()) : null) ||
      (machineNo ? activeUnsolvedBreakdowns.get(machineNo.trim().toLowerCase()) : null) ||
      null
    );
  }, [isEditing, machineName, machineNo, activeUnsolvedBreakdowns, isNonMachineDept]);

  // Unique machines extracted from MachineCapacity
  const availableMachines = useMemo(() => {
    return machinesList.map(m => {
      const brand = m[0] || '';
      const dept = m[1] || '';
      const name = m[4] || brand;
      const no = m[20] || `MC-${dept.substring(0, 3).toUpperCase()}-${name.replace(/\s+/g, '')}`;
      return {
        id: no,
        name: name,
        brand: brand,
        department: dept,
        machineNo: no,
        label: `${name} (${dept} - ${no})`
      };
    });
  }, [machinesList]);


  const machineOptions = useMemo(() => {
    return availableMachines
      .filter(m => !(department && department !== 'All' && !isNonMachineDept && m.department !== department))
      .map(m => {
      const active = !isEditing ? (
        activeUnsolvedBreakdowns.get(m.name.trim().toLowerCase()) ||
        (m.machineNo ? activeUnsolvedBreakdowns.get(m.machineNo.trim().toLowerCase()) : undefined)
      ) : undefined;

      if (active) {
        return {
          value: m.name,
          label: `${m.name} (⛔ Unsolved #${active.id})`,
          sublabel: `${m.department} • ${m.machineNo} • Already In Breakdown (${active.status})`,
          badge: `⛔ ${active.status}`,
          badgeColor: 'bg-rose-100 text-rose-800 border border-rose-300',
          disabled: true
        };
      }

      return {
        value: m.name,
        label: m.name,
        sublabel: `${m.department} • ${m.machineNo}`,
        badge: m.department,
        disabled: false
      };
    });
  }, [availableMachines, activeUnsolvedBreakdowns, isEditing, department, isNonMachineDept]);

  // Handle machine selection -> Auto-populate Machine No and Department
  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    if (NON_MACHINE_DEPTS.includes(dept)) {
      setMachineName('');
      setMachineNo('');
      setValidationError(null);
    } else {
      const matched = availableMachines.find(m => m.name === machineName);
      if (matched && matched.department !== dept) {
        setMachineName('');
        setMachineNo('');
        setValidationError(null);
      }
    }
  };

  const handleMachineChange = (selectedName: string) => {
    if (!isEditing) {
      const active = activeUnsolvedBreakdowns.get(selectedName.trim().toLowerCase());
      if (active) {
        setValidationError(`Machine "${selectedName}" already has an unsolved breakdown ticket (#${active.id} - ${active.status}). You cannot create another ticket.`);
        return;
      }
    }
    setValidationError(null);
    setMachineName(selectedName);
    const found = availableMachines.find(m => m.name === selectedName);
    if (found) {
      setMachineNo(found.machineNo);
      setDepartment(found.department);
    }
  };

  // Reporter Options
  const employeeOptions = useMemo(() => {
    return employeesList.map(emp => ({
      value: emp[0],
      label: `${emp[1]} (${emp[0]})`,
      sublabel: `${emp[3] || emp[2] || 'Staff'} • ${emp[4] || 'Dept'}`,
      badge: emp[3] || ''
    }));
  }, [employeesList]);

  // Handle reporter selection
  const handleReporterChange = (empId: string) => {
    setReporterId(empId);
    const emp = employeesList.find(e => e[0] === empId);
    if (emp) {
      setReporterName(emp[1] || '');
    }
  };

  // Handle technician selection (Primary)
  const handlePrimaryTechnicianChange = (empId: string) => {
    setAttendById(empId);
    const emp = employeesList.find(e => e[0] === empId);
    if (emp) {
      const name = emp[1] || '';
      setAttendByName(name);
      const entry = `${empId} (${name})`;
      if (!selectedTechnicians.includes(entry)) {
        setSelectedTechnicians(prev => [entry, ...prev.filter(t => !t.startsWith(empId))]);
      }
    }
  };

  // Toggle multi-technician
  const toggleAdditionalTechnician = (empId: string) => {
    const emp = employeesList.find(e => e[0] === empId);
    if (!emp) return;
    const entry = `${empId} (${emp[1] || ''})`;
    if (selectedTechnicians.includes(entry)) {
      setSelectedTechnicians(prev => prev.filter(t => t !== entry));
      if (attendById === empId) {
        const remaining = selectedTechnicians.filter(t => t !== entry);
        if (remaining.length > 0) {
          const firstId = remaining[0].split(' ')[0];
          const foundFirst = employeesList.find(e => e[0] === firstId);
          setAttendById(firstId);
          setAttendByName(foundFirst ? foundFirst[1] || '' : '');
        } else {
          setAttendById('');
          setAttendByName('');
        }
      }
    } else {
      setSelectedTechnicians(prev => [...prev, entry]);
      if (!attendById) {
        setAttendById(empId);
        setAttendByName(emp[1] || '');
      }
    }
  };

  // Spare Parts Options
  const sparePartOptions = useMemo(() => {
    return [
      { value: 'None', label: 'None (No Parts Used)', sublabel: '$0.00' },
      ...masterSpareParts.map(sp => ({
        value: sp.name,
        label: sp.name,
        sublabel: `$${sp.defaultCost.toFixed(2)} / ${sp.uom}`,
        badge: `$${sp.defaultCost}`
      }))
    ];
  }, [masterSpareParts]);

  // Handle spare parts selection -> Auto-fill default unit cost & UOM
  const handleSparePartChange = (partName: string) => {
    setSparePartsService(partName);
    const found = masterSpareParts.find(p => p.name.toLowerCase() === partName.toLowerCase());
    if (found) {
      if (found.defaultCost > 0) {
        setUnitCost(found.defaultCost);
      }
      if (found.uom) {
        setUom(found.uom);
      }
      if (quantity === 0) {
        setQuantity(1);
      }
    } else if (partName === 'None') {
      setQuantity(0);
      setUnitCost(0);
    }
  };

  // Auto Calculations (Excludes Weekends & Holidays, 16 working hours per day)
  const responseTimeResult = useMemo(() => {
    return calculateResponseTime(reportAt, attendAt);
  }, [reportAt, attendAt]);

  const hourLostResult = useMemo(() => {
    return calculateWorkingHourLost(
      date,
      reportAt,
      machineStartDate || date,
      machineStartAt,
      productionStop,
      holidaysList,
      overridesList,
      machineName,
      machinesList,
      department,
      shiftsList
    );
  }, [date, reportAt, machineStartDate, machineStartAt, productionStop, holidaysList, overridesList, machineName, machinesList, department, shiftsList]);

  // Capacity metrics & Lost production
  const machineCap = useMemo(() => {
    return getMachineCapacityMetrics(machineName, machinesList);
  }, [machineName, machinesList]);

  const lostProduction = useMemo(() => {
    return calculateLostProduction(hourLostResult.decimalHours, machineName, machinesList);
  }, [hourLostResult.decimalHours, machineName, machinesList]);

  const calculatedTotalCost = useMemo(() => {
    const q = Math.max(0, Number(quantity) || 0);
    const c = Math.max(0, Number(unitCost) || 0);
    return Math.round(q * c * 100) / 100;
  }, [quantity, unitCost]);

  // Quick Action to attend now
  const handleQuickAttendNow = () => {
    const curTime = getCurrentTimeHHMM();
    setAttendAt(curTime);
    if (!attendById && userSecurityScope?.employeeId) {
      handlePrimaryTechnicianChange(userSecurityScope.employeeId);
    }
    if (status === 'Open') {
      setStatus('Maintenance in Progress');
    }
  };

  // Quick Action to start machine now
  const handleQuickStartMachineNow = () => {
    const curTime = getCurrentTimeHHMM();
    setMachineStartAt(curTime);
    if (status === 'Maintenance in Progress' || status === 'Under Investigation') {
      setStatus('Completed');
    }
  };

  // Validation before submit
  const validateForm = (): string | null => {
    if (!date) return 'Breakdown Date is required.';
    if (!isNonMachineDept && !machineName) return 'Please select a Machine.';
    if (!problemDescription.trim()) return 'Please enter Description of Problem.';
    if (!reportAt) return 'Report At time is required.';
    if (!reporterName && !reporterId) return 'Name of Reporter is required.';

    // Strict duplicate check for new or switched tickets
    if (!isEditing && selectedMachineActiveBreakdown) {
      return `Machine "${machineName}" (${machineNo}) already has an unsolved breakdown ticket (#${selectedMachineActiveBreakdown.id} - ${selectedMachineActiveBreakdown.status}). You cannot create another ticket for this machine until the existing one is completed or closed.`;
    }

    // Time logic validations
    if (attendAt && !responseTimeResult.isValid) {
      return responseTimeResult.error || 'Attend At time cannot be earlier than Report At.';
    }

    if (quantity < 0) return 'Quantity cannot be negative.';
    if (unitCost < 0) return 'Unit Cost cannot be negative.';

    // Status closing requirements
    if (status === 'Closed' || status === 'Completed') {
      if (!attendAt) return 'Attend At time is required before completing or closing.';
      if (!attendById && !attendByName) return 'Attend By technician is required before completing or closing.';
      if (productionStop === 'Yes' && !machineStartAt) {
        return 'Machine Start At time is required before completing/closing a production-stopping breakdown.';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalActivity = activity === 'Other' && customActivity ? customActivity : activity;
      
      const recordToSave: BreakdownRecord = {
        id,
        date,
        department,
        machineName,
        machineNo,
        problemDescription: problemDescription.trim(),
        productionStop,
        reportAt,
        reporterId,
        reporterName,
        attendAt,
        responseTimeMin: responseTimeResult.minutes,
        machineStartAt,
        machineStartDate,
        hourLostHours: hourLostResult.decimalHours,
        hourLostFormatted: hourLostResult.formatted,
        lostPcs: hourLostResult.lostPcs,
        capacityPerHour: hourLostResult.hourlyCapacityPcs,
        capacityPerDay: hourLostResult.hourlyCapacityPcs * 16,
        unitStandard: hourLostResult.standardUnit,
        calculationDetails: hourLostResult.calculationDetails,
        attendById,
        attendByName,
        attendByAll: selectedTechnicians,
        failureMode,
        category,
        activity: finalActivity,
        sparePartsService,
        quantity,
        uom,
        unitCost,
        totalCost: calculatedTotalCost,
        status,
        remarks: remarks.trim(),
        createdBy: initialRecord?.createdBy || userSecurityScope?.employeeId || userSecurityScope?.username || 'User',
        createdAt: initialRecord?.createdAt || new Date().toISOString(),
        updatedBy: userSecurityScope?.employeeId || userSecurityScope?.username || 'User',
        updatedAt: new Date().toISOString()
      };

      const auditNote = isEditing
        ? `Updated breakdown ticket ${id} (Status: ${status}, Hours Lost: ${hourLostResult.formatted}, Lost PCS: ${lostProduction.lostPcs})`
        : `Created new breakdown log ticket ${id} for machine ${machineName} (${machineNo})`;

      await onSave(recordToSave, auditNote);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save breakdown record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 font-black text-indigo-200">
                  {id}
                </span>
                <h3 className="text-base font-black tracking-tight">
                  {isEditing ? 'Edit Machine Breakdown Record' : 'Log New Machine Breakdown'}
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                8 Operator Report Fields + Maintenance Resolution & 16-Hour Downtime Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isClosed && (
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-bold border border-slate-700">
                <Lock className="w-3 h-3 text-amber-400" /> Closed
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Form Details vs Audit Logs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 font-black'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> Breakdown Details
          </button>
          
          {isEditing && (
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" /> Audit History ({auditLogs.filter(a => a.breakdownId === id).length})
            </button>
          )}
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Warning if selected machine is already in an unsolved breakdown */}
        {!isEditing && selectedMachineActiveBreakdown && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-rose-900 uppercase">Machine Already In Unsolved Breakdown</span>
              <p className="text-rose-800 mt-0.5">
                Machine <strong>{machineName}</strong> ({machineNo}) already has an open ticket{' '}
                <strong className="font-mono font-bold">#{selectedMachineActiveBreakdown.id}</strong> (Status: <strong>{selectedMachineActiveBreakdown.status}</strong>).
                Duplicate entries are not permitted until the active ticket is Completed or Closed.
              </p>
            </div>
          </div>
        )}

        {/* Body Content */}
        {activeTab === 'audit' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Security & Maintenance Action Audit Trail
            </h4>
            {auditLogs.filter(a => a.breakdownId === id).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No audit entries recorded yet for this breakdown ticket.
              </div>
            ) : (
              <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                {auditLogs
                  .filter(a => a.breakdownId === id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log, idx) => (
                    <div key={`${log.logId || 'log'}-${idx}`} className="relative group">
                      <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 group-hover:scale-110 transition-transform" />
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {log.action}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {log.date} {log.time}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium my-1">{log.details}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                          <span>User: <strong>{log.userName || log.userId}</strong></span>
                          <span>•</span>
                          <span>Role: <strong>{log.userRole || 'User'}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* PART 1: USER / OPERATOR BREAKDOWN LOG (8 ESSENTIAL FIELDS) */}
            <div className="bg-slate-50/90 rounded-2xl p-5 border border-indigo-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                      User Breakdown Log (Operator Incident Report)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Standard operator entry — Date, Department, Machine, Machine No, Problem, Stop, Report At & Reporter
                    </p>
                  </div>
                </div>
                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-indigo-200">
                  User Entry
                </span>
              </div>

              {/* 8 Requested User Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* 1. Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly || isNonMachineDept}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
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
                    disabled={isReadOnly || isNonMachineDept}
                    placeholder="-- Select Department --"
                    searchPlaceholder="Search department..."
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
                    disabled={isReadOnly || isNonMachineDept}
                    placeholder={isNonMachineDept ? "N/A" : "-- Select Machine --"}
                    searchPlaceholder="Search machine by name/no..."
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
                    disabled={isReadOnly || isNonMachineDept}
                    value={machineNo}
                    onChange={(e) => setMachineNo(e.target.value)}
                    required={!isNonMachineDept}
                    placeholder={isNonMachineDept ? "N/A" : "e.g. MC-RFI-01"}
                    className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isReadOnly || isNonMachineDept ? 'opacity-70 bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
              </div>

              {/* 5. Problem Description with Label Printing Quick Suggestions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    5. Problem (Description of Problem) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Select quick suggestion or type custom</span>
                </div>

                <textarea
                  disabled={isReadOnly || isNonMachineDept}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  required
                  rows={2}
                  placeholder="Describe the exact breakdown symptom (e.g. UV lamp failure, web tension loss, rotary die cutter blunt)..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 resize-none font-medium"
                />

                {/* Quick Suggestion Chips for Label Printing Industry */}
                {!isReadOnly && !isNonMachineDept && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Label Industry Quick Suggestions:
                      </span>
                      <span className="text-slate-400 text-[10px]">Click any item to insert</span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {LABEL_PRINTING_BREAKDOWN_SUGGESTIONS.map((cat, catIdx) => (
                        <div key={catIdx} className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {cat.category}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.symptoms.map((symptom, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
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
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-900'
                                }`}
                              >
                                {symptom}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Stop, 7. Report At, 8. Reporter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                
                {/* 6. Stop (Production Stop) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    6. Stop (Production Stop?) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      productionStop === 'Yes' 
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs' 
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="productionStopModal"
                        disabled={isReadOnly || isNonMachineDept}
                        checked={productionStop === 'Yes'}
                        onChange={() => setProductionStop('Yes')}
                        className="hidden"
                      />
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      Yes (Down)
                    </label>

                    <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      productionStop === 'No' 
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs' 
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="productionStopModal"
                        disabled={isReadOnly || isNonMachineDept}
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
                    disabled={isReadOnly || isNonMachineDept}
                    placeholder="Select report time..."
                    required
                  />
                </div>

                {/* 8. Reporter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    8. Reporter (Name / ID) <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={employeeOptions}
                    value={reporterId}
                    onChange={handleReporterChange}
                    disabled={isReadOnly || isNonMachineDept}
                    placeholder="-- Select Reporter --"
                    searchPlaceholder="Search employee..."
                    required
                  />
                </div>
              </div>

              {/* Informational Workflow Callout */}
              {!showMaintenanceSection && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Workflow Notice:</strong> Submitting this form logs the breakdown incident. The maintenance workflow (attendance, machine restart, failure analysis, spare parts, and downtime resolution) will be completed by the Maintenance Team.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMaintenanceSection(true)}
                    className="shrink-0 px-3 py-1.5 bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1"
                  >
                    <Wrench className="w-3.5 h-3.5 text-blue-600" /> Maintenance Actions
                  </button>
                </div>
              )}
            </div>

            {/* PART 2: MAINTENANCE TEAM COMPLETION & RESOLUTION SECTION */}
            {showMaintenanceSection && (
              <div className="bg-amber-50/40 rounded-2xl p-5 border-2 border-amber-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#F87C6C] text-white flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-wider text-slate-900 uppercase flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#F87C6C]" /> Maintenance Team Resolution & Completion
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        16 Working Hours/Day Standard (Excluding Weekends & Holidays) • Capacity-based Lost Production
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2.5 py-1 rounded-full border border-amber-300">
                      Maintenance Workflow
                    </span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setShowMaintenanceSection(false)}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>

                {/* Capacity Summary Badge */}
                {machineCap.capacity16Pcs > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">16h Capacity</span>
                      <strong className="text-slate-800">{machineCap.capacity16Pcs.toLocaleString()} {machineCap.standardUnit}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Hourly PCS</span>
                      <strong className="text-indigo-700">{Math.round(machineCap.hourlyCapacityPcs).toLocaleString()} / hr</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Lost Production</span>
                      <strong className="text-rose-700">{lostProduction.lostPcs.toLocaleString()} PCS</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Lost Units</span>
                      <strong className="text-rose-700">{lostProduction.lostMachineUnits} Units</strong>
                    </div>
                  </div>
                )}

                {/* Response & Attendance Timing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Attend At */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Attend At (Time)
                    </label>
                    <TimeSelectDropdown
                      value={attendAt}
                      onChange={setAttendAt}
                      disabled={isReadOnly || isNonMachineDept}
                      placeholder="Select attend time..."
                    />
                  </div>

                  {/* Response Time (Auto-calculated) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Response Time (Auto)
                    </label>
                    <div className={`px-3 py-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-between ${
                      responseTimeResult.minutes > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}>
                      <span>{responseTimeResult.minutes > 0 ? `${responseTimeResult.minutes} Minutes` : '—'}</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Machine Start At - Always defaults to current time, user can change */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Machine Start At (Time)
                    </label>
                    <TimeSelectDropdown
                      value={machineStartAt}
                      onChange={setMachineStartAt}
                      disabled={isReadOnly || isNonMachineDept}
                      defaultToNowOnMount={true}
                      placeholder="Select start time..."
                    />
                  </div>

                  {/* Hour Lost (16h Standard, Weekends/Holidays excluded) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Working Hours Lost
                      </label>
                      {hourLostResult.decimalHours > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCalcDetailModalOpen(true)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> Details
                        </button>
                      )}
                    </div>
                    <div className={`px-3 py-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-between ${
                      hourLostResult.decimalHours > 0
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}>
                      <span>{hourLostResult.formatted}</span>
                      <button
                        type="button"
                        onClick={() => setIsCalcDetailModalOpen(true)}
                        className="hover:text-indigo-600"
                        title="View Working Hours Lost Breakdown Details"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technicians (Primary Lead & Team) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Primary Lead Technician (Attend By)
                    </label>
                    <SearchableSelect
                      options={employeeOptions}
                      value={attendById}
                      onChange={handlePrimaryTechnicianChange}
                      disabled={isReadOnly || isNonMachineDept}
                      placeholder="-- Select Lead Technician --"
                      searchPlaceholder="Search technician..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Attending Technicians Team:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-lg">
                      {selectedTechnicians.length === 0 ? (
                        <span className="text-xs text-slate-400 italic py-0.5">No technicians assigned yet</span>
                      ) : (
                        selectedTechnicians.map((t, idx) => (
                          <span 
                            key={`${t}-${idx}`}
                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3 text-indigo-500" />
                            {t}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const empId = t.split(' ')[0];
                                  toggleAdditionalTechnician(empId);
                                }}
                                className="text-indigo-400 hover:text-rose-600 ml-0.5"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
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
                      disabled={isReadOnly || isNonMachineDept}
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
                      disabled={isReadOnly || isNonMachineDept}
                      placeholder="-- Select Category --"
                      searchPlaceholder="Search category..."
                      allowCustom
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Activity
                    </label>
                    <SearchableSelect
                      options={masterActivities}
                      value={activity}
                      onChange={setActivity}
                      disabled={isReadOnly || isNonMachineDept}
                      placeholder="-- Select Activity --"
                      searchPlaceholder="Search activity..."
                      allowCustom
                    />
                  </div>
                </div>

                {/* Spare Parts & Inventory Costing */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                    <span>Spare Parts / Services Used</span>
                    <span className="text-emerald-700 font-mono">
                      Total Cost: ${calculatedTotalCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Spare Part Item
                      </label>
                      <SearchableSelect
                        options={sparePartOptions}
                        value={sparePartsService}
                        onChange={handleSparePartChange}
                        disabled={isReadOnly || isNonMachineDept}
                        placeholder="-- Select Spare Part --"
                        searchPlaceholder="Search spare part..."
                        allowCustom
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly || isNonMachineDept}
                        min="0"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        UOM
                      </label>
                      <SearchableSelect
                        options={masterUOMs}
                        value={uom}
                        onChange={setUom}
                        disabled={isReadOnly || isNonMachineDept}
                        placeholder="UOM"
                        allowCustom
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly || isNonMachineDept}
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Breakdown Status <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={BREAKDOWN_STATUSES}
                      value={status}
                      onChange={(val) => setStatus(val as BreakdownStatus)}
                      disabled={isReadOnly || isNonMachineDept}
                      placeholder="Select status..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maintenance Remarks & Root Cause Notes
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly || isNonMachineDept}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Root cause identified, repair completed, test run passed..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {isEditing && (
                  <span>Created: {initialRecord?.createdAt ? new Date(initialRecord.createdAt).toLocaleString() : '—'}</span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                {!isReadOnly && (
                  <button
                    type="submit"
                    disabled={isSubmitting || (!isEditing && Boolean(selectedMachineActiveBreakdown))}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving Breakdown...
                      </>
                    ) : (!isEditing && selectedMachineActiveBreakdown) ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-300" /> Machine in Breakdown
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> {
                          isEditing 
                            ? 'Update Breakdown Record' 
                            : showMaintenanceSection 
                              ? 'Save & Complete Breakdown' 
                              : 'Submit Breakdown Log (Open)'
                        }
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </form>
        )}

      </div>

      {/* Calculation Transparency Details Modal */}
      {isCalcDetailModalOpen && (
        <BreakdownCalculationModal
          isOpen={isCalcDetailModalOpen}
          onClose={() => setIsCalcDetailModalOpen(false)}
          record={{
            id,
            date,
            department,
            machineName,
            machineNo,
            problemDescription,
            productionStop,
            reportAt,
            reporterId,
            reporterName,
            attendAt,
            responseTimeMin: responseTimeResult.minutes,
            machineStartAt,
            machineStartDate,
            status,
            hourLostHours: hourLostResult.decimalHours,
            hourLostFormatted: hourLostResult.formatted,
            lostPcs: hourLostResult.lostPcs,
            capacityPerHour: hourLostResult.hourlyCapacityPcs,
            capacityPerDay: hourLostResult.hourlyCapacityPcs * 16,
            unitStandard: hourLostResult.standardUnit,
            calculationDetails: hourLostResult.calculationDetails,
            attendById,
            attendByName,
            attendByAll: selectedTechnicians,
            failureMode,
            category,
            activity,
            sparePartsService,
            quantity,
            uom,
            unitCost,
            totalCost: calculatedTotalCost,
            remarks,
            createdBy: initialRecord?.createdBy || '',
            createdAt: initialRecord?.createdAt || '',
            updatedBy: '',
            updatedAt: ''
          }}
          calculationDetails={hourLostResult.calculationDetails}
        />
      )}

    </div>
  );
}
