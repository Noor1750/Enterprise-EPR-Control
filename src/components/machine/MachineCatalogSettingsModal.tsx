import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Sliders, CheckCircle2, RotateCcw, 
  Building2, Cpu, Tag, Layers, Check
} from 'lucide-react';
import { 
  MachineMasterSettings, 
  getMachineMasterSettings, 
  saveMachineMasterSettings, 
  DEFAULT_MACHINE_MASTER_SETTINGS 
} from '../../lib/machineSettings';

interface MachineCatalogSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type TabType = 'brands' | 'departments' | 'processes';

export default function MachineCatalogSettingsModal({
  isOpen,
  onClose,
  onSaved
}: MachineCatalogSettingsModalProps) {
  const [settings, setSettings] = useState<MachineMasterSettings>(getMachineMasterSettings());
  const [activeTab, setActiveTab] = useState<TabType>('brands');
  
  const [newBrand, setNewBrand] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newProcess, setNewProcess] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  if (!isOpen) return null;

  const handleAddBrand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newBrand.trim();
    if (!clean) return;
    if (settings.brandNames.some(b => b.toLowerCase() === clean.toLowerCase())) {
      alert('This brand name already exists.');
      return;
    }
    const updated = {
      ...settings,
      brandNames: [...settings.brandNames, clean].sort((a, b) => a.localeCompare(b))
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    setNewBrand('');
    triggerToast();
  };

  const handleRemoveBrand = (brand: string) => {
    const updated = {
      ...settings,
      brandNames: settings.brandNames.filter(b => b !== brand)
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    triggerToast();
  };

  const handleAddDepartment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newDepartment.trim();
    if (!clean) return;
    if (settings.departments.some(d => d.toLowerCase() === clean.toLowerCase())) {
      alert('This department already exists.');
      return;
    }
    const updated = {
      ...settings,
      departments: [...settings.departments, clean].sort((a, b) => a.localeCompare(b))
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    setNewDepartment('');
    triggerToast();
  };

  const handleRemoveDepartment = (dept: string) => {
    const updated = {
      ...settings,
      departments: settings.departments.filter(d => d !== dept)
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    triggerToast();
  };

  const handleAddProcess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newProcess.trim();
    if (!clean) return;
    if (settings.processNames.some(p => p.toLowerCase() === clean.toLowerCase())) {
      alert('This process name already exists.');
      return;
    }
    const updated = {
      ...settings,
      processNames: [...settings.processNames, clean].sort((a, b) => a.localeCompare(b))
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    setNewProcess('');
    triggerToast();
  };

  const handleRemoveProcess = (proc: string) => {
    const updated = {
      ...settings,
      processNames: settings.processNames.filter(p => p !== proc)
    };
    setSettings(updated);
    saveMachineMasterSettings(updated);
    triggerToast();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all machine catalog settings (Brands, Departments, Processes) to factory defaults?')) {
      setSettings(DEFAULT_MACHINE_MASTER_SETTINGS);
      saveMachineMasterSettings(DEFAULT_MACHINE_MASTER_SETTINGS);
      triggerToast();
    }
  };

  const triggerToast = () => {
    setSaveToast(true);
    if (onSaved) onSaved();
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Machine Master Dropdown Catalogs</h3>
              <p className="text-xs text-slate-500">Configure pre-set Brand Names, Departments, and Process Names</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'brands'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Brand Names ({settings.brandNames.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'departments'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments ({settings.departments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('processes')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'processes'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Process Names ({settings.processNames.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: BRANDS */}
          {activeTab === 'brands' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Brand Names
                </span>
                <span className="text-[11px] text-slate-400">
                  Will appear in "Brand Name" dropdown when registering or editing machines
                </span>
              </div>

              {/* Add New Brand Input */}
              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new brand name (e.g. Gallus, Nilpeter, Mark Andy)..."
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newBrand.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Brand</span>
                </button>
              </form>

              {/* Brand Chips List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {settings.brandNames.map((brand) => (
                  <div
                    key={brand}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate" title={brand}>
                      {brand}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBrand(brand)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      title={`Remove ${brand}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Departments
                </span>
                <span className="text-[11px] text-slate-400">
                  Will appear in "Department" dropdown when registering or editing machines
                </span>
              </div>

              {/* Add New Department Input */}
              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new department name (e.g. Flexo Printing, RFID, Woven)..."
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newDepartment.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </form>

              {/* Department Chips List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {settings.departments.map((dept) => (
                  <div
                    key={dept}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate" title={dept}>
                      {dept}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      title={`Remove ${dept}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PROCESSES */}
          {activeTab === 'processes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Process Names
                </span>
                <span className="text-[11px] text-slate-400">
                  Will appear in "Process Name" dropdown when registering or editing machines
                </span>
              </div>

              {/* Add New Process Input */}
              <form onSubmit={handleAddProcess} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new process name (e.g. Printing, Slitting, Die-cutting)..."
                  value={newProcess}
                  onChange={(e) => setNewProcess(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newProcess.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Process</span>
                </button>
              </form>

              {/* Process Chips List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {settings.processNames.map((proc) => (
                  <div
                    key={proc}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate" title={proc}>
                      {proc}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProcess(proc)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      title={`Remove ${proc}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Factory Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Saved to Master Catalog
              </span>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              Done & Apply Dropdowns
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
