const fs = require('fs');

let content = fs.readFileSync('src/components/MachineCapacity.tsx', 'utf8');

// 1. Imports
content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useRef } from 'react';");
content = content.replace("import { Loader2, Edit2, X } from 'lucide-react';", "import { Loader2, Edit2, X, Plus, Upload } from 'lucide-react';\nimport XLSX from 'xlsx';\n\nconst getXlsx = () => XLSX;");

// 2. States & Upload handler
const statesAndUpload = `  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [skillSearch, setSkillSearch] = useState('');

  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
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
          while (padded.length < 16) padded.push('');
          return padded.map(val => val ? String(val) : '');
        });

        if (paddedRows.length > 0) {
          await appendRow(spreadsheetId, 'MachineCapacity!A:P', paddedRows);
          alert(\`Successfully uploaded \${paddedRows.length} machines.\`);
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
  };`;

content = content.replace("  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);\n  const [skillSearch, setSkillSearch] = useState('');", statesAndUpload);

// 3. Edit Machine
content = content.replace("  const handleEditMachine = (index: number, m: string[]) => {", "  const handleEditMachine = (index: number, m: string[]) => {\n    setIsMachineModalOpen(true);");

// 4. Cancel Machine Edit
const cancelReplace = `  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setIsMachineModalOpen(false);
    setMForm({`;
content = content.replace(`  const handleCancelMachineEdit = () => {
    setEditingMachineIndex(null);
    setMForm({`, cancelReplace);

// 5. Add Machine - Close modal on success
const handleAddMachineReplace = `      setMForm({
        brandName: '', department: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''
      });
      setIsMachineModalOpen(false);
      loadData();`;
content = content.replace(`      setMForm({
        brandName: '', department: '', processName: '', machineName: '',
        standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
        conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift', overtime: 'One Shift',
        capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''
      });
      loadData();`, handleAddMachineReplace);


// 6. UI Update: Header buttons and Modal
const formUI = `        {view === 'both' && <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Machine Capacity</h2>}
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm flex justify-between items-center">
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
              className="bg-[#26B99A] text-white px-4 py-2 text-sm rounded-sm hover:bg-[#169F85] flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" /> Bulk Upload {isUploading && '...'}
            </button>
            <button 
              onClick={() => {
                setEditingMachineIndex(null);
                setMForm({
                  brandName: '', department: '', processName: '', machineName: '',
                  standardUnit: '', specificationPerMin: '', standardSpeedPerMin: '', utilization: '',
                  conversionRatio: '', perShiftManpowerRequired: '', manpowerAllocation: 'Both Shift', overtime: 'One Shift',
                  capacityExistingManpowerPcs: '', capacityExistingManpowerMachineUnit: ''
                });
                setIsMachineModalOpen(true);
              }}
              className="bg-[#337AB7] text-white px-4 py-2 text-sm rounded-sm hover:bg-[#286090] flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Machine
            </button>
          </div>
        </div>

        {isMachineModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#E6E9ED]">
              <h3 className="text-lg font-medium text-[#73879C]">{editingMachineIndex !== null ? 'Edit Machine' : 'Add Machine'}</h3>
              <button onClick={() => setIsMachineModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">`;

content = content.replace(`        {view === 'both' && <h2 className="text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4">Machine Capacity</h2>}
        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm">
          <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">`, formUI);

// Update button submit area for modal
const modalButtonsReplace = `            <div className="col-span-1 md:col-span-3 lg:col-span-4 flex gap-2 justify-end mt-4 pt-4 border-t border-[#E6E9ED]">
              <button type="button" onClick={handleCancelMachineEdit} className="bg-gray-200 text-gray-800 px-6 py-1.5 text-sm rounded-sm hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" className="bg-[#337AB7] text-white px-6 py-1.5 text-sm rounded-sm hover:bg-[#286090]">
                {editingMachineIndex !== null ? 'Update Machine' : 'Add Machine'}
              </button>
            </div>
          </form>
          </div>
        </div>
        </div>
        )}

        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">`;

const oldButtons = `            <div className="xl:col-span-5 flex gap-2 justify-end mt-2">
              <button type="submit" className="bg-[#337AB7] text-white px-6 py-1.5 text-sm rounded-sm hover:bg-[#286090]">
                {editingMachineIndex !== null ? 'Update Machine' : 'Add Machine'}
              </button>
              {editingMachineIndex !== null && (
                <button type="button" onClick={handleCancelMachineEdit} className="bg-gray-200 text-gray-800 px-6 py-1.5 text-sm rounded-sm hover:bg-gray-300">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm overflow-hidden">`;

content = content.replace(oldButtons, modalButtonsReplace);

// 7. Input adorned for Utilization
const oldUtilInput = `              <input required placeholder="88" type="number" value={mForm.utilization} onChange={e => setMForm({...mForm, utilization: e.target.value})} className="w-full px-2 py-1 text-sm border rounded-sm" />`;
const newUtilInput = `              <div className="relative">
                <input required placeholder="88" type="number" value={mForm.utilization} onChange={e => setMForm({...mForm, utilization: e.target.value})} className="w-full pl-2 pr-6 py-1 text-sm border rounded-sm" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>`;

content = content.replace(oldUtilInput, newUtilInput);

fs.writeFileSync('src/components/MachineCapacity.tsx', content);

