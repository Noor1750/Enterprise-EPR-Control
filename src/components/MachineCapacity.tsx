import { useState, useEffect, useRef } from 'react';
import { getRange, appendRow, updateRange } from '../lib/sheets';
import { Loader2, Edit2, X, Plus, Upload, LayoutDashboard, Calendar, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserSecurityScope } from '../lib/security';
import MachineDashboard from './machine/MachineDashboard';
import ProductionPlanning from './machine/ProductionPlanning';
import { calculateMachineAge, getMachineStatus, calculateMachineCapacity, parseCleanNumber } from '../lib/machineEngine';
import SearchableSelect from './common/SearchableSelect';

const getXlsx = () => XLSX;

interface MachineCapacityProps {
  spreadsheetId: string;
  view?: 'machine' | 'skill' | 'both';
  userSecurityScope?: UserSecurityScope;
}

export default function MachineCapacity({ spreadsheetId, userSecurityScope }: MachineCapacityProps) {
  const [machines, setMachines] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [assignments, setAssignments] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planning' | 'machines'>('dashboard');

  // Form states
  const [mForm, setMForm] = useState({
    brandName: '', department: '', processName: '', machineName: '',
    standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
    conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
    manpowerAllocation: 'Both Shift', overtime: 'One Shift',
    capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
    modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
  });
  
  const [editingMachineIndex, setEditingMachineIndex] = useState<number | null>(null);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = getXlsx();
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        
        const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
        const paddedRows = rows.map(row => {
          const padded = [...row];
          while (padded.length < 20) padded.push('');
          return padded.map(val => val ? String(val) : '');
        });

        if (paddedRows.length > 0) {
          await appendRow(spreadsheetId, 'MachineCapacity!A:Z', paddedRows);
          alert(`Successfully uploaded ${paddedRows.length} machines.`);
          loadData();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to process Excel file.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mRaw, empRaw, assignRaw] = await Promise.all([
        getRange(spreadsheetId, 'MachineCapacity!A:Z'),
        getRange(spreadsheetId, 'Employees!A:Z'),
        getRange(spreadsheetId, 'Shift_Assignment_History!A:Z'),
      ]);
      setMachines(mRaw.length > 1 ? mRaw.slice(1) : []);
      setEmployees(empRaw.length > 1 ? empRaw.slice(1) : []);
      setAssignments(assignRaw.length > 1 ? assignRaw.slice(1) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 

    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sheet = customEvent.detail?.sheetName || '';
      if (!sheet || sheet === 'MachineCapacity') {
        loadData();
      }
    };

    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, [spreadsheetId, userSecurityScope]);

  const handleAddMachine = async (e: any) => {
    e.preventDefault();
    try {
      if (mForm.onboardDate) {
        const onboard = new Date(mForm.onboardDate);
        if (onboard > new Date()) {
          alert("Machine Onboard Date cannot be later than today.");
          return;
        }
      }
      if (mForm.onboardDate && mForm.obsoleteDate) {
        if (new Date(mForm.obsoleteDate) < new Date(mForm.onboardDate)) {
           alert("Machine Obsolete Date cannot be earlier than Machine Onboard Date.");
           return;
        }
      }
      
      const isDuplicateSerial = machines.some((m, idx) => m[22] === mForm.serialNumber && mForm.serialNumber && idx !== editingMachineIndex);
      if (isDuplicateSerial) {
         alert("Serial Number already exists. Please check the machine record.");
         return;
      }
      
      const isDuplicateAsset = machines.some((m, idx) => m[23] === mForm.assetTag && mForm.assetTag && idx !== editingMachineIndex);
      if (isDuplicateAsset) {
         alert("Asset Tag already exists. Please check the machine record.");
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
        editingMachineIndex !== null ? (machines[editingMachineIndex][20] || '') : `MC-${Date.now().toString().slice(-6)}`,
        mForm.modelNumber, mForm.serialNumber, mForm.assetTag, mForm.onboardDate, mForm.obsoleteDate
      ];

      if (editingMachineIndex !== null) {
        const row = editingMachineIndex + 2;
        await updateRange(spreadsheetId, `MachineCapacity!A${row}:Z${row}`, [rowData]);
        setEditingMachineIndex(null);
      } else {
        await appendRow(spreadsheetId, 'MachineCapacity!A:Z', [rowData]);
      }
      setMForm({
        brandName: '', department: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
        manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
        modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
      });
      setIsMachineModalOpen(false);
      loadData();
    } catch (err) { alert('Failed'); }
  };

  const handleEditMachine = (index: number, m: string[]) => {
    setIsMachineModalOpen(true);
    setEditingMachineIndex(index);
    setMForm({
      brandName: m[0] || '',
      department: m[1] || '',
      processName: m[3] || '',
      machineName: m[4] || '',
      standardUnit: m[5] || '',
      specificationPerMin: m[6] || '',
      standardSpeedPerMin: m[7] || '',
      utilization: (m[8] || '').replace('%', ''),
      conversionRatio: m[9] || '',
      aShiftManpowerRequired: m[12] || '',
      bShiftManpowerRequired: m[13] || '',
      generalShiftManpowerRequired: m[14] || '',
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
  };

  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setIsMachineModalOpen(false);
    setMForm({
      brandName: '', department: '', processName: '', machineName: '',
      standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
      conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
      manpowerAllocation: 'Both Shift', overtime: 'One Shift',
      capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
      modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-[#1ECA98]" /></div>;
  }

  const liveCalc = calculateMachineCapacity(
    mForm.machineName,
    mForm.standardSpeedPerMin,
    mForm.specificationPerMin,
    mForm.utilization,
    mForm.conversionRatio,
    mForm.manpowerAllocation
  );
  const autoCap16Unit = liveCalc.capacity16Unit;
  const autoCap16Pcs = liveCalc.capacity16Pcs;
  const autoExistUnit = liveCalc.existCapUnit;
  const autoExistPcs = liveCalc.existCapPcs;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#33495F]">Machine Capacity & Planning</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor capacity, utilization, and production shortages</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('planning')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'planning' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Planning
          </button>
          <button 
            onClick={() => setActiveTab('machines')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'machines' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Manage Data
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && <MachineDashboard machines={machines} employees={employees} assignments={assignments} />}
      
      {activeTab === 'planning' && <ProductionPlanning machines={machines} spreadsheetId={spreadsheetId} />}

      {activeTab === 'machines' && (
      <div>
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Machine List</h3>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, model, serial, asset tag, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-200 flex items-center font-medium transition-colors border border-gray-200"
            >
              <Upload className="w-4 h-4 mr-2" /> Bulk Upload {isUploading && '...'}
            </button>
            <button 
              onClick={() => {
                setEditingMachineIndex(null);
                setMForm({
                  brandName: '', department: '', processName: '', machineName: '',
                  standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
                  conversionRatio: '', aShiftManpowerRequired: '', bShiftManpowerRequired: '', generalShiftManpowerRequired: '',
                  manpowerAllocation: 'Both Shift', overtime: 'One Shift',
                  capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: '', capacityCount: 'Yes',
                  modelNumber: '', serialNumber: '', assetTag: '', onboardDate: '', obsoleteDate: ''
                });
                setIsMachineModalOpen(true);
              }}
              className="bg-[#1ECA98] text-white px-4 py-2 text-sm rounded-lg hover:bg-[#15b083] flex items-center font-medium shadow-sm shadow-[#1ECA98]/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Machine
            </button>
          </div>
        </div>

        {/* Modal content unchanged ... */}
        {isMachineModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">{editingMachineIndex !== null ? 'Edit Machine' : 'Add Machine'}</h3>
              <button onClick={() => setIsMachineModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand Name</label>
              <input required placeholder="Brand" value={mForm.brandName} onChange={e => setMForm({...mForm, brandName: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <input required placeholder="Department" value={mForm.department} onChange={e => setMForm({...mForm, department: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Process Name</label>
              <input required placeholder="Process Name" value={mForm.processName} onChange={e => setMForm({...mForm, processName: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Machine Name</label>
              <input required placeholder="Machine Name" value={mForm.machineName} onChange={e => setMForm({...mForm, machineName: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Unit</label>
              <SearchableSelect
                options={['PCS', 'Meter', 'Sheet', 'Yard', 'Pick']}
                value={mForm.standardUnit}
                onChange={val => setMForm({...mForm, standardUnit: val})}
                placeholder="Select or type..."
                searchPlaceholder="Search or enter unit..."
                allowCustom={true}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Per Min</label>
              <input required placeholder="Spec Per Min" type="number" value={mForm.specificationPerMin} onChange={e => setMForm({...mForm, specificationPerMin: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Std Speed Per Min</label>
              <input required placeholder="Speed Per Min" type="number" value={mForm.standardSpeedPerMin} onChange={e => setMForm({...mForm, standardSpeedPerMin: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Utilization %</label>
              <div className="relative">
                <input required placeholder="88" type="number" value={mForm.utilization} onChange={e => setMForm({...mForm, utilization: e.target.value})} className="w-full pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Conversion Ratio/UPS</label>
              <input required placeholder="Ratio" type="number" value={mForm.conversionRatio} onChange={e => setMForm({...mForm, conversionRatio: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Day Shift Manpower</label>
              <input placeholder="0" type="number" value={mForm.aShiftManpowerRequired} onChange={e => setMForm({...mForm, aShiftManpowerRequired: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Night Shift Manpower</label>
              <input placeholder="0" type="number" value={mForm.bShiftManpowerRequired} onChange={e => setMForm({...mForm, bShiftManpowerRequired: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gen Shift Manpower</label>
              <input placeholder="0" type="number" value={mForm.generalShiftManpowerRequired} onChange={e => setMForm({...mForm, generalShiftManpowerRequired: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Manpower Allocation</label>
              <select required value={mForm.manpowerAllocation} onChange={e => setMForm({...mForm, manpowerAllocation: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none">
                <option value="Both Shift">Both Shift</option>
                <option value="One Shift">One Shift</option>
                <option value="Vacancy">Vacancy</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity Count</label>
              <select required value={mForm.capacityCount} onChange={e => setMForm({...mForm, capacityCount: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cap 16 Hrs Pcs</label>
              <div className="w-full px-3 py-2 text-sm border border-transparent rounded-lg bg-gray-100 text-gray-600 font-bold">{Math.round(autoCap16Pcs).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cap 16 Hrs Unit</label>
              <div className="w-full px-3 py-2 text-sm border border-transparent rounded-lg bg-gray-100 text-gray-600 font-bold">{Math.round(autoCap16Unit).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Exist Cap Pcs</label>
              <div className="w-full px-3 py-2 text-sm border border-transparent rounded-lg bg-emerald-50 text-emerald-600 font-bold">{Math.round(autoExistPcs).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Exist Cap Unit</label>
              <div className="w-full px-3 py-2 text-sm border border-transparent rounded-lg bg-blue-50 text-blue-600 font-bold">{Math.round(autoExistUnit).toLocaleString()}</div>
            </div>

            <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-6">
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h4 className="text-sm font-bold text-gray-800">Machine Lifecycle & Identification</h4>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Optional</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Model Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input placeholder="Model" value={mForm.modelNumber} onChange={e => setMForm({...mForm, modelNumber: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Serial Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input placeholder="Serial No." value={mForm.serialNumber} onChange={e => setMForm({...mForm, serialNumber: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Tag <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input placeholder="Asset Tag" value={mForm.assetTag} onChange={e => setMForm({...mForm, assetTag: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Onboard Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="date" value={mForm.onboardDate} onChange={e => setMForm({...mForm, onboardDate: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Obsolete Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="date" value={mForm.obsoleteDate} onChange={e => setMForm({...mForm, obsoleteDate: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div className="md:col-span-3 lg:col-span-5 flex gap-4 mt-2">
                  <div className="flex-1 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800">Machine Age</span>
                    <span className="text-sm font-black text-blue-900">{calculateMachineAge(mForm.onboardDate, new Date().toISOString())?.formatted || 'Not Available'}</span>
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Status</span>
                    <span className={`text-sm font-black ${getMachineStatus(mForm.onboardDate, mForm.obsoleteDate, new Date().toISOString()) === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {getMachineStatus(mForm.onboardDate, mForm.obsoleteDate, new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-3 lg:col-span-4 flex gap-3 justify-end mt-6 pt-6 border-t border-gray-100">
              <button type="button" onClick={handleCancelMachineEdit} className="bg-white border border-gray-200 text-gray-600 font-bold px-6 py-2.5 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-[#1ECA98] shadow-md shadow-[#1ECA98]/20 text-white font-bold px-6 py-2.5 text-sm rounded-lg hover:bg-[#15b083] transition-all active:scale-95">
                {editingMachineIndex !== null ? 'Update Machine' : 'Save Machine'}
              </button>
            </div>
          </form>
          </div>
        </div>
        </div>
        )}

        <div className="bg-white border border-gray-100 p-1 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full whitespace-nowrap divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Brand Name</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Process Name</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Machine Name</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Std Unit</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Spec/Min</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Std Speed/Min</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Util %</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Conv. Ratio</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Manpower Alloc.</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Cap Pcs</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Model No.</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Serial No.</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Asset Tag</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Onboard</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Obsolete</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {machines.filter(m => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  const name = (m[4] || '').toLowerCase();
                  const model = (m[21] || '').toLowerCase();
                  const serial = (m[22] || '').toLowerCase();
                  const asset = (m[23] || '').toLowerCase();
                  const status = getMachineStatus(m[24], m[25], new Date().toISOString()).toLowerCase();
                  return name.includes(q) || model.includes(q) || serial.includes(q) || asset.includes(q) || status.includes(q);
                }).map((m, originalIndex) => {
                  // Keep original index for editing
                  const i = machines.indexOf(m);
                  return (
                  <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${editingMachineIndex === i ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{m[0]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[3]}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{m[4]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[5]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[6]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[7]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[8]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[9]}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${m[15] === 'Both Shift' ? 'bg-blue-50 text-blue-700' : m[15] === 'Vacancy' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {m[15]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#1ECA98]">{m[17] ? Number(m[17]).toLocaleString() : ""}</td>
                                        <td className="px-4 py-3 text-gray-600">{m[21]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[22]}</td>
                    <td className="px-4 py-3 text-gray-600">{m[23]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[24]}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m[25]}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-medium whitespace-nowrap">{calculateMachineAge(m[24], new Date().toISOString())?.formatted || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${getMachineStatus(m[24], m[25], new Date().toISOString()) === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {getMachineStatus(m[24], m[25], new Date().toISOString())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleEditMachine(i, m)}
                        className="text-gray-400 hover:text-[#1ECA98] transition-colors p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})}
                {machines.length === 0 && (
                  <tr>
                    <td colSpan={19} className="px-4 py-12 text-center text-gray-400 font-medium">
                      No machines found. Please upload or add a machine to begin capacity planning.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
