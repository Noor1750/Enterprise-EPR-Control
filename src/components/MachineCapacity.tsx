import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Plus, Edit2, Calendar, LayoutDashboard, Search, X, 
  Loader2, Trash2, CheckCircle2, AlertTriangle, ArrowUpDown, Filter, Sliders
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getRange, appendRow, updateRange } from '../lib/sheets';
import MachineDashboard from './machine/MachineDashboard';
import ProductionPlanning from './machine/ProductionPlanning';
import SearchableSelect from './common/SearchableSelect';
import ActionModalNotification, { ActionModalProps } from './common/ActionModalNotification';
import MachineCatalogSettingsModal from './machine/MachineCatalogSettingsModal';
import { getMachineMasterSettings, MachineMasterSettings } from '../lib/machineSettings';
import { calculateMachineAge, getMachineStatus, calculateMachineCapacity } from '../lib/machineEngine';
import { resolvePaletteForModule } from '../lib/colorPalettes';

interface MachineCapacityProps {
  spreadsheetId: string;
  view?: string;
  user?: any;
  userSecurityScope?: any;
}

export default function MachineCapacity({ spreadsheetId, view, user, userSecurityScope }: MachineCapacityProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planning' | 'machines'>('dashboard');
  const [machines, setMachines] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [assignments, setAssignments] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCatalogSettingsOpen, setIsCatalogSettingsOpen] = useState(false);
  const [masterSettings, setMasterSettings] = useState<MachineMasterSettings>(getMachineMasterSettings());
  
  // Modal Notification state
  const [modalConfig, setModalConfig] = useState<ActionModalProps>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });

  // Machine Form State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachineIndex, setEditingMachineIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const [mForm, setMForm] = useState({
    brandName: '',
    department: '',
    processName: '',
    machineName: '',
    machineNo: '',
    standardUnit: 'PCS',
    specificationPerMin: '',
    standardSpeedPerMin: '',
    utilization: '88',
    conversionRatio: '1',
    aShiftManpowerRequired: '1',
    bShiftManpowerRequired: '1',
    generalShiftManpowerRequired: '0',
    manpowerAllocation: 'Both Shift',
    overtime: 'One Shift',
    capacityExistingManpowerPcs: '',
    capacityExistingManpowerMachineUnit: '',
    capacityCount: 'Yes',
    modelNumber: '',
    serialNumber: '',
    assetTag: '',
    onboardDate: '',
    obsoleteDate: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mRaw, empRaw, assignRaw, assignHistRaw] = await Promise.all([
        getRange(spreadsheetId, 'MachineCapacity!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
        getRange(spreadsheetId, 'ShiftAssignments!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Shift_Assignment_History!A:Z').catch(() => [])
      ]);

      setMachines(mRaw.length > 1 ? mRaw.slice(1) : []);
      setEmployees(empRaw.length > 1 ? empRaw.slice(1) : []);

      // Merge active assignments from ShiftAssignments or Shift_Assignment_History
      let combinedAssignments = assignRaw.length > 1 ? assignRaw.slice(1) : [];
      if (combinedAssignments.length === 0 && assignHistRaw.length > 1) {
        combinedAssignments = assignHistRaw.slice(1);
      }
      setAssignments(combinedAssignments);
    } catch (err) {
      console.error('Error loading Machine Capacity data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || ['MachineCapacity', 'ShiftAssignments', 'Employees', 'Shift_Assignment_History'].includes(sheet)) {
        loadData();
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    
    const handleSettingsUpdate = () => {
      setMasterSettings(getMachineMasterSettings());
    };
    window.addEventListener('erp-machine-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('erp-machine-settings-updated', handleSettingsUpdate);
    };
  }, [spreadsheetId, userSecurityScope]);

  // Unique list of options for smart dropdowns derived from Master Settings & Machine records
  const brandOptions = Array.from(new Set([
    ...masterSettings.brandNames,
    ...machines.map(m => m[0]).filter(Boolean)
  ]));

  const deptOptions = Array.from(new Set([
    ...masterSettings.departments,
    ...machines.map(m => m[1]).filter(Boolean)
  ]));

  const processOptions = Array.from(new Set([
    ...masterSettings.processNames,
    ...machines.map(m => m[3]).filter(Boolean)
  ]));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        
        if (data.length > 1) {
          const rowsToAppend = data.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));
          if (rowsToAppend.length > 0) {
            await appendRow(spreadsheetId, 'MachineCapacity!A:Z', rowsToAppend);
            setModalConfig({
              isOpen: true,
              type: 'success',
              title: 'Bulk Upload Successful',
              message: `Successfully imported ${rowsToAppend.length} machine capacity records into the database.`,
              onClose: () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                loadData();
              }
            });
          }
        }
      } catch (err: any) {
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Bulk Upload Failed',
          message: err?.message || 'Failed to parse and upload Excel file.',
          onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!mForm.machineName.trim()) {
        setModalConfig({
          isOpen: true,
          type: 'warning',
          title: 'Validation Error',
          message: 'Please enter a valid Machine Name.',
          onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      if (mForm.onboardDate) {
        const onboard = new Date(mForm.onboardDate);
        if (onboard > new Date()) {
          setModalConfig({
            isOpen: true,
            type: 'warning',
            title: 'Invalid Date',
            message: 'Machine Onboard Date cannot be later than today.',
            onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
          return;
        }
      }
      if (mForm.onboardDate && mForm.obsoleteDate) {
        if (new Date(mForm.obsoleteDate) < new Date(mForm.onboardDate)) {
          setModalConfig({
            isOpen: true,
            type: 'warning',
            title: 'Invalid Date',
            message: 'Machine Obsolete Date cannot be earlier than Onboard Date.',
            onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
          return;
        }
      }
      
      const isDuplicateSerial = machines.some((m, idx) => m[22] === mForm.serialNumber && mForm.serialNumber && idx !== editingMachineIndex);
      if (isDuplicateSerial) {
        setModalConfig({
          isOpen: true,
          type: 'warning',
          title: 'Duplicate Serial Number',
          message: `Serial Number "${mForm.serialNumber}" already exists in the machine registry.`,
          onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      const calc = calculateMachineCapacity(
        mForm.machineName,
        mForm.standardSpeedPerMin,
        mForm.specificationPerMin,
        mForm.utilization,
        mForm.conversionRatio,
        mForm.manpowerAllocation
      );

      const rowData = [
        mForm.brandName, mForm.department, '', mForm.processName, mForm.machineName,
        mForm.standardUnit, mForm.specificationPerMin, mForm.standardSpeedPerMin, `${calc.utilVal}%`, mForm.conversionRatio,
        calc.capacity16Pcs.toString(), calc.capacity16Unit.toString(),
        mForm.aShiftManpowerRequired, mForm.bShiftManpowerRequired, mForm.generalShiftManpowerRequired,
        mForm.manpowerAllocation, '',
        calc.existCapPcs.toString(), calc.existCapUnit.toString(),
        mForm.capacityCount,
        mForm.machineNo || (editingMachineIndex !== null ? (machines[editingMachineIndex][20] || '') : `MC-${Date.now().toString().slice(-6)}`),
        mForm.modelNumber, mForm.serialNumber, mForm.assetTag, mForm.onboardDate, mForm.obsoleteDate
      ];

      const isEdit = editingMachineIndex !== null;

      if (isEdit) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, `MachineCapacity!A${row}:Z${row}`, [rowData]);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:Z', [rowData]);
      }

      setIsMachineModalOpen(false);
      setEditingMachineIndex(null);

      setModalConfig({
        isOpen: true,
        type: 'success',
        title: isEdit ? 'Machine Record Updated' : 'New Machine Added',
        message: `Machine "${mForm.machineName}" (${mForm.department}) has been successfully saved to the database.`,
        details: [
          `Rated 16h Capacity: ${Math.round(calc.capacity16Pcs).toLocaleString()} Pcs (${Math.round(calc.capacity16Unit).toLocaleString()} ${mForm.standardUnit})`,
          `Shift Manpower Req: Day: ${mForm.aShiftManpowerRequired || 0}, Night: ${mForm.bShiftManpowerRequired || 0}, Gen: ${mForm.generalShiftManpowerRequired || 0}`,
          `Allocation Strategy: ${mForm.manpowerAllocation}`
        ],
        onClose: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          loadData();
        }
      });

      // Reset form
      setMForm({
        brandName: '', department: '', processName: '', machineName: '', machineNo: '',
        standardUnit: 'PCS', specificationPerMin: '', standardSpeedPerMin: '', utilization: '88',
        conversionRatio: '1', aShiftManpowerRequired: '1', bShiftManpowerRequired: '1', generalShiftManpowerRequired: '0',
        manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
        modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
      });
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Operation Failed',
        message: err?.message || 'Could not save machine specifications.',
        onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleEditMachine = (index: number, m: string[]) => {
    setEditingMachineIndex(index);
    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '',
      machineNo: m[20] || '',
      standardUnit: m[5] || 'PCS',
      specificationPerMin: m[6] || '',
      standardSpeedPerMin: m[7] || '',
      utilization: (m[8] || '88').replace('%', ''),
      conversionRatio: m[9] || '1',
      aShiftManpowerRequired: m[12] || '1',
      bShiftManpowerRequired: m[13] || '1',
      generalShiftManpowerRequired: m[14] || '0',
      manpowerAllocation: m[15] || 'Both Shift',
      overtime: 'One Shift',
      capacityExistingManpowerPcs: m[17] || '',
      capacityExistingManpowerMachineUnit: m[18] || '',
      capacityCount: m[19] || 'Yes',
      modelNumber: m[21] || '',
      serialNumber: m[22] || '',
      assetTag: m[23] || '',
      onboardDate: m[24] || '',
      obsoleteDate: m[25] || ''
    });
    setIsMachineModalOpen(true);
  };

  const liveCalc = calculateMachineCapacity(
    mForm.machineName,
    mForm.standardSpeedPerMin,
    mForm.specificationPerMin,
    mForm.utilization,
    mForm.conversionRatio,
    mForm.manpowerAllocation
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold text-slate-500">Loading Machine Specifications & Shift Manpower...</span>
      </div>
    );
  }

  const palette = resolvePaletteForModule('machine');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 sm:p-6 rounded-2xl shadow-2xs border border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Machine Capacity & Planning</h2>
            <span 
              className="px-2.5 py-0.5 font-mono text-xs font-bold rounded-full border"
              style={{
                backgroundColor: palette.pillBg,
                color: palette.pillText,
                borderColor: `${palette.primaryHex}20`
              }}
            >
              {machines.length} Units
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time machine capacity synchronized with shift manpower assignments and operator allocation
          </p>
        </div>

        {/* Primary Sub-Tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer group ${
              activeTab === 'dashboard' ? 'bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            style={activeTab === 'dashboard' ? { color: palette.primaryHex } : undefined}
          >
            <LayoutDashboard className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeTab === 'dashboard' ? palette.primaryHex : '#64748B' }} />
            Capacity & Manpower Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('planning')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer group ${
              activeTab === 'planning' ? 'bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            style={activeTab === 'planning' ? { color: palette.primaryHex } : undefined}
          >
            <Calendar className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeTab === 'planning' ? palette.primaryHex : '#64748B' }} />
            Production Planning
          </button>
          <button 
            onClick={() => setActiveTab('machines')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer group ${
              activeTab === 'machines' ? 'bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            style={activeTab === 'machines' ? { color: palette.primaryHex } : undefined}
          >
            <Edit2 className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeTab === 'machines' ? palette.primaryHex : '#64748B' }} />
            Manage Machine Specs
          </button>
          <button 
            onClick={() => setIsCatalogSettingsOpen(true)} 
            className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600 hover:bg-white/80 border border-slate-200/80 shadow-2xs group"
            title="Configure Brand Name, Department, and Process Name dropdown options"
          >
            <Sliders className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MACHINE & MANPOWER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <MachineDashboard 
          machines={machines} 
          employees={employees} 
          assignments={assignments} 
        />
      )}
      
      {/* VIEW 2: PRODUCTION PLANNING */}
      {activeTab === 'planning' && (
        <ProductionPlanning machines={machines} spreadsheetId={spreadsheetId} />
      )}

      {/* VIEW 3: MANAGE MACHINE SPECS & CRUD */}
      {activeTab === 'machines' && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Machine Registry & Technical Specifications</h3>
              <p className="text-xs text-slate-500">Configure rated speed, target utilization, conversion ratios, and shift manpower standards</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search machine, model, serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none w-56 font-medium"
                />
              </div>

              <button 
                onClick={() => setIsCatalogSettingsOpen(true)}
                className="bg-slate-100 text-slate-700 px-3.5 py-2 text-xs rounded-xl hover:bg-slate-200 flex items-center font-bold transition-colors border border-slate-200 cursor-pointer"
                title="Configure Brand Names, Departments, and Process Names for dropdowns"
              >
                <Sliders className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Settings
              </button>

              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-slate-100 text-slate-700 px-3.5 py-2 text-xs rounded-xl hover:bg-slate-200 flex items-center font-bold transition-colors border border-slate-200 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {isUploading ? 'Uploading...' : 'Bulk Excel'}
              </button>

              <button 
                onClick={() => {
                  setEditingMachineIndex(null);
                  setMForm({
                    machineNo: '',
                    brandName: '', department: '', processName: '', machineName: '',
                    standardUnit: 'PCS', specificationPerMin: '', standardSpeedPerMin: '', utilization: '88',
                    conversionRatio: '1', aShiftManpowerRequired: '1', bShiftManpowerRequired: '1', generalShiftManpowerRequired: '0',
                    manpowerAllocation: 'Both Shift', overtime: 'One Shift',
                    capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
                    modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
                  });
                  setIsMachineModalOpen(true);
                }}
                className="px-4 py-2 text-xs rounded-xl flex items-center font-bold shadow-xs transition-all active:scale-95 cursor-pointer group"
                style={{
                  backgroundColor: palette.primaryHex,
                  color: palette.secondaryHex
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 transition-transform duration-300 group-hover:rotate-90 group-hover-icon-anim" />
                Add Machine
              </button>
            </div>
          </div>

          {/* Machine Modal Form (Add / Edit) */}
          {isMachineModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/70">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {editingMachineIndex !== null ? 'Edit Machine Specifications' : 'Register New Machine'}
                    </h3>
                    <p className="text-xs text-slate-500">Specify speed parameters and shift manpower requirements</p>
                  </div>
                  <button 
                    onClick={() => setIsMachineModalOpen(false)} 
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="p-6">
                  <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    
                    {/* Brand */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name</label>
                      <SearchableSelect
                        options={brandOptions.length > 0 ? brandOptions : ['Gallus', 'Nilpeter', 'Omet', 'Konica Minolta', 'Mark Andy', 'HP Indigo', 'Orthotec', 'Weigang']}
                        value={mForm.brandName}
                        onChange={val => setMForm({...mForm, brandName: val})}
                        placeholder="Select or enter brand..."
                        allowCustom={true}
                        required
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                      <SearchableSelect
                        options={deptOptions.length > 0 ? deptOptions : ['Flexo Printing', 'Digital Printing', 'Offset Printing', 'Rotary Screen', 'Slitting & Inspection', 'Finishing & Die-cut']}
                        value={mForm.department}
                        onChange={val => setMForm({...mForm, department: val})}
                        placeholder="Select or enter dept..."
                        allowCustom={true}
                        required
                      />
                    </div>

                    {/* Process */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Process Name</label>
                      <SearchableSelect
                        options={processOptions.length > 0 ? processOptions : ['Printing', 'Slitting', 'Die-cutting', 'Inspection', 'Lamination', 'Foil Stamping']}
                        value={mForm.processName}
                        onChange={val => setMForm({...mForm, processName: val})}
                        placeholder="Select or enter process..."
                        allowCustom={true}
                        required
                      />
                    </div>

                    {/* Machine Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Machine Name</label>
                      <input 
                        required 
                        placeholder="e.g. Gallus EM 280-01" 
                        value={mForm.machineName} 
                        onChange={e => setMForm({...mForm, machineName: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold outline-none" 
                      />
                    </div>

                    {/* Machine Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Machine No / Code</label>
                      <input 
                        placeholder="e.g. MC-PRT-001" 
                        value={mForm.machineNo} 
                        onChange={e => setMForm({...mForm, machineNo: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none font-bold" 
                      />
                    </div>

                    {/* Standard Unit */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Standard Unit</label>
                      <SearchableSelect
                        options={['PCS', 'Meter', 'Sheet', 'Yard', 'Roll', 'Pick']}
                        value={mForm.standardUnit}
                        onChange={val => setMForm({...mForm, standardUnit: val})}
                        placeholder="Select unit..."
                        allowCustom={true}
                        required
                      />
                    </div>

                    {/* Spec / Min */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Spec Per Min (RPM/Speed)</label>
                      <input 
                        required 
                        placeholder="e.g. 150" 
                        type="number" 
                        value={mForm.specificationPerMin} 
                        onChange={e => setMForm({...mForm, specificationPerMin: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Std Speed / Min */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Std Speed Per Min</label>
                      <input 
                        required 
                        placeholder="e.g. 120" 
                        type="number" 
                        value={mForm.standardSpeedPerMin} 
                        onChange={e => setMForm({...mForm, standardSpeedPerMin: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Utilization % */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Utilization %</label>
                      <div className="relative">
                        <input 
                          required 
                          placeholder="88" 
                          type="number" 
                          value={mForm.utilization} 
                          onChange={e => setMForm({...mForm, utilization: e.target.value})} 
                          className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                      </div>
                    </div>

                    {/* Conversion Ratio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Conversion Ratio / UPS</label>
                      <input 
                        required 
                        placeholder="1" 
                        type="number" 
                        step="any"
                        value={mForm.conversionRatio} 
                        onChange={e => setMForm({...mForm, conversionRatio: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Day Shift Manpower */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Shift A (Day) Manpower Req</label>
                      <input 
                        placeholder="1" 
                        type="number" 
                        value={mForm.aShiftManpowerRequired} 
                        onChange={e => setMForm({...mForm, aShiftManpowerRequired: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Night Shift Manpower */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Shift B (Night) Manpower Req</label>
                      <input 
                        placeholder="1" 
                        type="number" 
                        value={mForm.bShiftManpowerRequired} 
                        onChange={e => setMForm({...mForm, bShiftManpowerRequired: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Gen Shift Manpower */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">General Shift Manpower Req</label>
                      <input 
                        placeholder="0" 
                        type="number" 
                        value={mForm.generalShiftManpowerRequired} 
                        onChange={e => setMForm({...mForm, generalShiftManpowerRequired: e.target.value})} 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono outline-none" 
                      />
                    </div>

                    {/* Manpower Allocation Strategy */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Manpower Allocation</label>
                      <SearchableSelect
                        options={['Both Shift', 'One Shift', 'Vacancy']}
                        value={mForm.manpowerAllocation}
                        onChange={val => setMForm({...mForm, manpowerAllocation: val})}
                      />
                    </div>

                    {/* Capacity Count */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Count in Overall Capacity?</label>
                      <SearchableSelect
                        options={['Yes', 'No']}
                        value={mForm.capacityCount}
                        onChange={val => setMForm({...mForm, capacityCount: val})}
                      />
                    </div>

                    {/* Live Calculated Stats */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Rated 16h Cap (Pcs)</label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-800 font-mono font-bold">
                        {Math.round(liveCalc.capacity16Pcs).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Rated 16h Cap ({mForm.standardUnit})</label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-800 font-mono font-bold">
                        {Math.round(liveCalc.capacity16Unit).toLocaleString()}
                      </div>
                    </div>

                    {/* Machine Lifecycle Section */}
                    <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Asset Lifecycle & Tracking Details</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Model Number</label>
                          <input 
                            placeholder="e.g. EM 280" 
                            value={mForm.modelNumber} 
                            onChange={e => setMForm({...mForm, modelNumber: e.target.value})} 
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Serial Number</label>
                          <input 
                            placeholder="e.g. SN-98741" 
                            value={mForm.serialNumber} 
                            onChange={e => setMForm({...mForm, serialNumber: e.target.value})} 
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Asset Tag</label>
                          <input 
                            placeholder="e.g. AST-0045" 
                            value={mForm.assetTag} 
                            onChange={e => setMForm({...mForm, assetTag: e.target.value})} 
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Onboard Date</label>
                          <input 
                            type="date" 
                            value={mForm.onboardDate} 
                            onChange={e => setMForm({...mForm, onboardDate: e.target.value})} 
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Obsolete Date</label>
                          <input 
                            type="date" 
                            value={mForm.obsoleteDate} 
                            onChange={e => setMForm({...mForm, obsoleteDate: e.target.value})} 
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="col-span-1 md:col-span-3 lg:col-span-4 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                      <button 
                        type="button" 
                        onClick={() => setIsMachineModalOpen(false)} 
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs active:scale-95"
                      >
                        {editingMachineIndex !== null ? 'Save Changes' : 'Register Machine'}
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            </div>
          )}

          {/* Machine Registry Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">Brand & Machine</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Process</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Std Speed/Min</th>
                    <th className="p-3 text-center">Util %</th>
                    <th className="p-3 text-center">Conv. Ratio</th>
                    <th className="p-3 text-center">Day Req</th>
                    <th className="p-3 text-center">Night Req</th>
                    <th className="p-3 text-center">Gen Req</th>
                    <th className="p-3 text-right">16h Cap (Pcs)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {machines.filter(m => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (m[4] || '').toLowerCase().includes(q) ||
                           (m[0] || '').toLowerCase().includes(q) ||
                           (m[1] || '').toLowerCase().includes(q) ||
                           (m[21] || '').toLowerCase().includes(q) ||
                           (m[22] || '').toLowerCase().includes(q);
                  }).map((m, originalIndex) => {
                    const i = machines.indexOf(m);
                    const machineStatus = getMachineStatus(m[24], m[25], new Date().toISOString());

                    return (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{m[4] || `Machine #${i + 1}`}</div>
                          <div className="text-[10px] text-slate-500">{m[0]} {m[21] ? `• ${m[21]}` : ''}</div>
                        </td>
                        <td className="p-3 text-slate-700 font-semibold">{m[1]}</td>
                        <td className="p-3 text-slate-600">{m[3]}</td>
                        <td className="p-3 text-center text-slate-700 font-mono">{m[5] || 'PCS'}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">{m[7] || m[6] || 0}</td>
                        <td className="p-3 text-center font-mono text-slate-700">{m[8] || '88%'}</td>
                        <td className="p-3 text-center font-mono text-slate-700">{m[9] || 1}</td>
                        
                        <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/20">{m[12] || 0}</td>
                        <td className="p-3 text-center font-mono font-bold text-purple-700 bg-purple-50/20">{m[13] || 0}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{m[14] || 0}</td>

                        <td className="p-3 text-right font-mono font-black text-indigo-700">
                          {m[10] ? Number(m[10]).toLocaleString() : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            machineStatus === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {machineStatus}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleEditMachine(i, m)}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
                            title="Edit machine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {machines.length === 0 && (
                    <tr>
                      <td colSpan={13} className="p-12 text-center text-slate-400 font-medium">
                        No machine records found. Click "Add Machine" or "Bulk Excel" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Machine Catalog Settings Modal for Brand, Dept, Process */}
      <MachineCatalogSettingsModal
        isOpen={isCatalogSettingsOpen}
        onClose={() => setIsCatalogSettingsOpen(false)}
        onSaved={() => setMasterSettings(getMachineMasterSettings())}
      />

      {/* Reusable Modal Notification for CRUD operations */}
      <ActionModalNotification {...modalConfig} />

    </div>
  );
}
