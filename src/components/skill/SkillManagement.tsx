import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, Filter, Download, Upload, 
  Users, Wrench, Cpu, Award, CheckCircle, AlertCircle, 
  Shield, X, ChevronDown, CheckSquare, Square, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getRange, appendRow, updateRange, deleteRowByPrimaryKey } from '../../lib/sheets';
import { UserSecurityScope } from '../../lib/security';
import { SkillRecord, EmployeeInfo, MachineInfo, SKILL_LEVELS, STANDARD_PROCESSES } from './types';

interface SkillManagementProps {
  spreadsheetId: string;
  skills: SkillRecord[];
  employees: EmployeeInfo[];
  machines: MachineInfo[];
  userSecurityScope?: UserSecurityScope;
  onRefresh: () => void;
}

export default function SkillManagement({
  spreadsheetId,
  skills,
  employees,
  machines,
  userSecurityScope,
  onRefresh
}: SkillManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [machineFilter, setMachineFilter] = useState('All');
  const [processFilter, setProcessFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<SkillRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single form state
  const [singleForm, setSingleForm] = useState({
    empId: '',
    machineName: '',
    processName: '',
    department: '',
    level: 3,
    remarks: '',
    evaluatedBy: userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin'
  });

  // Bulk form state
  const [bulkDept, setBulkDept] = useState('All');
  const [bulkMachine, setBulkMachine] = useState('');
  const [bulkProcess, setBulkProcess] = useState('');
  const [bulkLevel, setBulkLevel] = useState(3);
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkEmpSearch, setBulkEmpSearch] = useState('');

  // Available unique lists
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => e.department && set.add(e.department));
    machines.forEach(m => m.department && set.add(m.department));
    return Array.from(set).sort();
  }, [employees, machines]);

  const allProcesses = useMemo(() => {
    const set = new Set<string>(STANDARD_PROCESSES);
    machines.forEach(m => m.processName && set.add(m.processName));
    skills.forEach(s => s.processName && set.add(s.processName));
    return Array.from(set).filter(Boolean).sort();
  }, [machines, skills]);

  const allMachineNames = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => m.machineName && set.add(m.machineName));
    skills.forEach(s => s.machineName && set.add(s.machineName));
    return Array.from(set).filter(Boolean).sort();
  }, [machines, skills]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      if (deptFilter !== 'All' && s.department !== deptFilter && s.empDepartment !== deptFilter) return false;
      if (machineFilter !== 'All' && s.machineName !== machineFilter) return false;
      if (processFilter !== 'All' && s.processName !== processFilter) return false;
      if (levelFilter !== 'All' && String(s.level) !== levelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.empId.toLowerCase().includes(q);
        const matchesName = (s.empName || '').toLowerCase().includes(q);
        const matchesMach = (s.machineName || '').toLowerCase().includes(q);
        const matchesProc = (s.processName || '').toLowerCase().includes(q);
        const matchesDept = (s.department || '').toLowerCase().includes(q);
        return matchesId || matchesName || matchesMach || matchesProc || matchesDept;
      }
      return true;
    });
  }, [skills, deptFilter, machineFilter, processFilter, levelFilter, searchQuery]);

  // Filtered operators for bulk modal
  const bulkAvailableEmployees = useMemo(() => {
    return employees.filter(e => {
      if (bulkDept !== 'All' && e.department !== bulkDept) return false;
      if (bulkEmpSearch.trim()) {
        const q = bulkEmpSearch.toLowerCase();
        return e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, bulkDept, bulkEmpSearch]);

  // Handle single form machine selection to auto-fill process and department
  const handleSingleMachineChange = (machName: string) => {
    const found = machines.find(m => m.machineName.toLowerCase() === machName.toLowerCase());
    setSingleForm(prev => ({
      ...prev,
      machineName: machName,
      processName: found?.processName || prev.processName || '',
      department: found?.department || prev.department || ''
    }));
  };

  // Handle bulk form machine selection to auto-fill process
  const handleBulkMachineChange = (machName: string) => {
    const found = machines.find(m => m.machineName.toLowerCase() === machName.toLowerCase());
    setBulkMachine(machName);
    if (found?.processName) {
      setBulkProcess(found.processName);
    }
    if (found?.department && bulkDept === 'All') {
      setBulkDept(found.department);
    }
  };

  // Handle Single Add or Edit Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.empId || !singleForm.machineName) {
      alert('Please select both Employee and Machine.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const emp = employees.find(e => e.id.toUpperCase() === singleForm.empId.toUpperCase());
      const mach = machines.find(m => m.machineName.toLowerCase() === singleForm.machineName.toLowerCase());

      const dept = singleForm.department || emp?.department || mach?.department || '';
      const proc = singleForm.processName || mach?.processName || 'General Operation';
      const levelStr = String(singleForm.level);

      const rowValues = [
        singleForm.empId.toUpperCase(),
        singleForm.machineName,
        levelStr,
        proc,
        dept,
        singleForm.remarks || '',
        singleForm.evaluatedBy || 'Admin',
        now
      ];

      // If editing existing row
      if (editingSkill && typeof editingSkill.rowIndex === 'number') {
        const sheetRow = editingSkill.rowIndex + 2;
        await updateRange(spreadsheetId, `SkillMatrix!A${sheetRow}:H${sheetRow}`, [rowValues]);
      } else {
        // Check if there is already a record for this emp + machine in existing skills
        const existingIdx = skills.findIndex(
          s => s.empId.toUpperCase() === singleForm.empId.toUpperCase() && 
               s.machineName.toLowerCase() === singleForm.machineName.toLowerCase()
        );

        if (existingIdx !== -1 && typeof skills[existingIdx].rowIndex === 'number') {
          const sheetRow = (skills[existingIdx].rowIndex as number) + 2;
          await updateRange(spreadsheetId, `SkillMatrix!A${sheetRow}:H${sheetRow}`, [rowValues]);
        } else {
          await appendRow(spreadsheetId, 'SkillMatrix!A:H', [rowValues]);
        }
      }

      setIsAddModalOpen(false);
      setEditingSkill(null);
      setSingleForm({
        empId: '',
        machineName: '',
        processName: '',
        department: '',
        level: 3,
        remarks: '',
        evaluatedBy: userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin'
      });
      onRefresh();
    } catch (err: any) {
      console.error('Error saving skill:', err);
      alert('Failed to save skill record: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit modal
  const handleOpenEdit = (skill: SkillRecord) => {
    setEditingSkill(skill);
    setSingleForm({
      empId: skill.empId,
      machineName: skill.machineName,
      processName: skill.processName,
      department: skill.department,
      level: skill.level,
      remarks: skill.remarks || '',
      evaluatedBy: skill.evaluatedBy || userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin'
    });
    setIsAddModalOpen(true);
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingSkill) return;
    setIsSubmitting(true);
    try {
      if (typeof deletingSkill.rowIndex === 'number') {
        // Read full SkillMatrix, filter out this index, and write back
        const raw = await getRange(spreadsheetId, 'SkillMatrix!A:Z');
        if (raw.length > 0) {
          const headers = raw[0];
          const dataRows = raw.slice(1);
          const filtered = dataRows.filter((_, idx) => idx !== deletingSkill.rowIndex);
          await updateRange(spreadsheetId, 'SkillMatrix!A1:H' + (filtered.length + 1), [headers, ...filtered]);
        }
      }
      setDeletingSkill(null);
      onRefresh();
    } catch (err: any) {
      console.error('Error deleting skill:', err);
      alert('Failed to delete skill: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Submit
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMachine || selectedEmpIds.length === 0) {
      alert('Please select a Machine and at least one Operator.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const mach = machines.find(m => m.machineName.toLowerCase() === bulkMachine.toLowerCase());
      const proc = bulkProcess || mach?.processName || 'General Operation';
      const levelStr = String(bulkLevel);
      const evaluatedBy = userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin';

      const raw = await getRange(spreadsheetId, 'SkillMatrix!A:Z');
      const headers = raw.length > 0 ? raw[0] : ['ID_No', 'Machine_Job', 'Skill_Level', 'Process_Name', 'Department', 'Remarks', 'Evaluated_By', 'Updated_At'];
      const dataRows = raw.length > 1 ? raw.slice(1) : [];

      const rowsMap = new Map<string, string[]>();
      dataRows.forEach(r => {
        const key = `${String(r[0] || '').trim().toUpperCase()}_${String(r[1] || '').trim().toLowerCase()}`;
        rowsMap.set(key, r);
      });

      selectedEmpIds.forEach(empId => {
        const emp = employees.find(e => e.id.toUpperCase() === empId.toUpperCase());
        const dept = emp?.department || mach?.department || '';
        const key = `${empId.toUpperCase()}_${bulkMachine.toLowerCase()}`;
        const newRow = [
          empId.toUpperCase(),
          bulkMachine,
          levelStr,
          proc,
          dept,
          bulkRemarks || 'Bulk skill assignment',
          evaluatedBy,
          now
        ];
        rowsMap.set(key, newRow);
      });

      const updatedRows = Array.from(rowsMap.values());
      await updateRange(spreadsheetId, 'SkillMatrix!A1:H' + (updatedRows.length + 1), [headers, ...updatedRows]);

      setIsBulkModalOpen(false);
      setSelectedEmpIds([]);
      setBulkMachine('');
      setBulkProcess('');
      setBulkRemarks('');
      onRefresh();
    } catch (err: any) {
      console.error('Error bulk updating skills:', err);
      alert('Bulk update failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Bulk Employee Selection
  const toggleSelectAllBulk = () => {
    if (selectedEmpIds.length === bulkAvailableEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(bulkAvailableEmployees.map(e => e.id));
    }
  };

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredSkills.map(s => {
      const lvl = SKILL_LEVELS.find(l => l.level === s.level);
      return {
        'Employee ID': s.empId,
        'Employee Name': s.empName || '',
        'Department': s.department || s.empDepartment || '',
        'Designation': s.empDesignation || '',
        'Machine Name': s.machineName,
        'Process Name': s.processName,
        'Skill Level': s.level,
        'Competency Rating': lvl?.shortLabel || `Level ${s.level}`,
        'Remarks': s.remarks || '',
        'Evaluated By': s.evaluatedBy || '',
        'Updated At': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Skill_Matrix');
    XLSX.writeFile(wb, `Skill_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Sample Template for Bulk Import
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Employee_ID': 'EMP001',
        'Machine_Name': 'Single Needle',
        'Process_Name': 'Lockstitch / Single Needle',
        'Skill_Level': 4,
        'Department': 'Sewing',
        'Remarks': 'Certified multi-needle operator'
      },
      {
        'Employee_ID': 'EMP002',
        'Machine_Name': 'CL-326IE',
        'Process_Name': 'Encoding & Verification',
        'Skill_Level': 5,
        'Department': 'RFID',
        'Remarks': 'Master RFID programmer & trainer'
      },
      {
        'Employee_ID': 'EMP006',
        'Machine_Name': 'Cutter 5000',
        'Process_Name': 'Auto Cutter / Spreading',
        'Skill_Level': 3,
        'Department': 'Cutting',
        'Remarks': 'Standard speed certified'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Skill_Template');
    XLSX.writeFile(wb, 'Skill_Matrix_Import_Template.xlsx');
  };

  // Excel Bulk Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        alert('The uploaded Excel file is empty.');
        return;
      }

      const now = new Date().toISOString();
      const evaluatedBy = userSecurityScope?.employeeName || userSecurityScope?.username || 'Excel Import';

      const raw = await getRange(spreadsheetId, 'SkillMatrix!A:Z');
      const headers = raw.length > 0 ? raw[0] : ['ID_No', 'Machine_Job', 'Skill_Level', 'Process_Name', 'Department', 'Remarks', 'Evaluated_By', 'Updated_At'];
      const dataRows = raw.length > 1 ? raw.slice(1) : [];

      const rowsMap = new Map<string, string[]>();
      dataRows.forEach(r => {
        const key = `${String(r[0] || '').trim().toUpperCase()}_${String(r[1] || '').trim().toLowerCase()}`;
        rowsMap.set(key, r);
      });

      let importedCount = 0;
      rows.forEach(row => {
        const empId = String(row['Employee_ID'] || row['Employee ID'] || row['ID_No'] || row['ID'] || '').trim().toUpperCase();
        const machName = String(row['Machine_Name'] || row['Machine Name'] || row['Machine'] || row['Machine_Job'] || '').trim();
        const procName = String(row['Process_Name'] || row['Process Name'] || row['Process'] || '').trim();
        const rawLvl = String(row['Skill_Level'] || row['Skill Level'] || row['Level'] || '3').trim();
        const lvlNum = parseInt(rawLvl.replace(/\D/g, ''), 10) || 3;
        const dept = String(row['Department'] || '').trim();
        const remarks = String(row['Remarks'] || 'Imported from Excel').trim();

        if (empId && machName) {
          const key = `${empId}_${machName.toLowerCase()}`;
          rowsMap.set(key, [
            empId,
            machName,
            String(Math.min(5, Math.max(1, lvlNum))),
            procName || 'General Operation',
            dept,
            remarks,
            evaluatedBy,
            now
          ]);
          importedCount++;
        }
      });

      const updatedRows = Array.from(rowsMap.values());
      await updateRange(spreadsheetId, 'SkillMatrix!A1:H' + (updatedRows.length + 1), [headers, ...updatedRows]);

      alert(`Successfully imported and mapped ${importedCount} skills!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefresh();
    } catch (err: any) {
      console.error('Error importing skills Excel:', err);
      alert('Failed to parse and import Excel file: ' + (err?.message || 'Check file structure'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Machine & Process Wise Skill Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Map, evaluate, and bulk assign operator competencies across production machinery and specialized manufacturing processes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300"
            title="Download Excel import template"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Template
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 border border-indigo-200"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            {isUploading ? 'Importing...' : 'Bulk Excel Import'}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>

          <button
            onClick={() => {
              setSelectedEmpIds([]);
              setBulkMachine('');
              setBulkProcess('');
              setIsBulkModalOpen(true);
            }}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4" />
            Bulk Machine/Process Assign
          </button>

          <button
            onClick={() => {
              setEditingSkill(null);
              setSingleForm({
                empId: '',
                machineName: '',
                processName: '',
                department: '',
                level: 3,
                remarks: '',
                evaluatedBy: userSecurityScope?.employeeName || userSecurityScope?.username || 'Admin'
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Operator Skill
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, Machine, Process, or Department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Machine:</span>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[140px]"
            >
              <option value="All">All Machines</option>
              {allMachineNames.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Process:</span>
            <select
              value={processFilter}
              onChange={(e) => setProcessFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="All">All Processes</option>
              {allProcesses.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">All Levels</option>
              {SKILL_LEVELS.map(l => (
                <option key={l.level} value={String(l.level)}>{l.shortLabel}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('All');
              setMachineFilter('All');
              setProcessFilter('All');
              setLevelFilter('All');
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Skills Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Mapped Skills:</span>
            <span className="px-2 py-0.5 text-xs font-extrabold bg-indigo-100 text-indigo-700 rounded-full">
              {filteredSkills.length} of {skills.length}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Click Edit or Delete to update specific skill ratings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/60 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Employee ID</th>
                <th className="px-6 py-3.5">Operator Name</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Machine</th>
                <th className="px-6 py-3.5">Process Name</th>
                <th className="px-6 py-3.5 text-center">Skill Level</th>
                <th className="px-6 py-3.5">Competency Scale</th>
                <th className="px-6 py-3.5">Evaluated By</th>
                <th className="px-6 py-3.5">Remarks</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-600">No skill mappings found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or click "Add Operator Skill" or "Bulk Machine/Process Assign" above.</p>
                  </td>
                </tr>
              ) : (
                filteredSkills.map((s, idx) => {
                  const lvlConfig = SKILL_LEVELS.find(l => l.level === s.level) || SKILL_LEVELS[2];
                  return (
                    <tr key={`${s.empId}-${s.machineName}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3 font-mono font-bold text-slate-600">{s.empId}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">
                        {s.empName || s.empId}
                        {s.empDesignation && <span className="block text-xs font-normal text-slate-400">{s.empDesignation}</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {s.department || s.empDepartment || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-1.5 pt-4">
                        <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                        {s.machineName}
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-sky-500" />
                          <span>{s.processName || 'General Operation'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm shadow-xs border bg-slate-50 text-slate-800">
                          {s.level}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${lvlConfig.color}`}>
                          {lvlConfig.shortLabel}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 font-medium">
                        {s.evaluatedBy || 'Admin'}
                        {s.updatedAt && (
                          <span className="block text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={s.remarks}>
                        {s.remarks || '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit Skill"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSkill(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete Skill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE ADD / EDIT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Pinned Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  {editingSkill ? 'Edit Operator Skill Mapping' : 'Add Operator Machine & Process Skill'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record operator competency level, process assignments, and certification notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSkill(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title="Close Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="single-skill-form" onSubmit={handleSingleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              {/* Operator Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Select Operator / Employee <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    list="modal-employee-list"
                    placeholder="Type to search Employee by ID, Name or Department..."
                    value={singleForm.empId}
                    onChange={(e) => {
                      const id = e.target.value.trim();
                      const found = employees.find(emp => emp.id.toUpperCase() === id.toUpperCase());
                      setSingleForm(prev => ({
                        ...prev,
                        empId: id,
                        department: found?.department || prev.department
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-medium"
                  />
                  <datalist id="modal-employee-list">
                    {employees.map((e, idx) => (
                      <option key={`${e.id}-${idx}`} value={e.id}>
                        {e.id} — {e.name} ({e.designation} | {e.department})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Selected Employee Info Box */}
                {(() => {
                  const selEmp = employees.find(e => e.id.toUpperCase() === singleForm.empId.toUpperCase());
                  if (selEmp) {
                    return (
                      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-indigo-950">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{selEmp.name}</span>
                            <span className="font-mono text-indigo-700 font-semibold ml-1.5">({selEmp.id})</span>
                            <span className="text-slate-500 ml-2">{selEmp.designation} • {selEmp.department}</span>
                          </div>
                        </div>
                        {selEmp.shift && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded text-[10px]">
                            {selEmp.shift}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Machine & Process Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Machine & Process Details <span className="text-rose-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Machine Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      list="modal-machine-list"
                      placeholder="Select or type machine..."
                      value={singleForm.machineName}
                      onChange={(e) => handleSingleMachineChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    />
                    <datalist id="modal-machine-list">
                      {machines.map(m => (
                        <option key={`${m.machineName}-${m.machineNo}`} value={m.machineName}>
                          {m.machineName} {m.machineNo ? `(${m.machineNo})` : ''} - {m.department} ({m.processName})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Process Name
                    </label>
                    <input
                      list="modal-process-list"
                      placeholder="e.g. High-Speed Weaving"
                      value={singleForm.processName}
                      onChange={(e) => setSingleForm({...singleForm, processName: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    />
                    <datalist id="modal-process-list">
                      {allProcesses.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Department
                  </label>
                  <select
                    value={singleForm.department}
                    onChange={(e) => setSingleForm({...singleForm, department: e.target.value})}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-700"
                  >
                    <option value="">Auto-detected / Select Department</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Skill Competency Level Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Competency Level (1 to 5) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    Selected: Level {singleForm.level}
                  </span>
                </div>

                {/* 5-Level Interactive Buttons Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {SKILL_LEVELS.map(lvl => {
                    const isSelected = singleForm.level === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setSingleForm({...singleForm, level: lvl.level})}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${lvl.badgeColor}`}>
                          L{lvl.level}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">
                          {lvl.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Detailed Active Level Card */}
                {(() => {
                  const currentLvl = SKILL_LEVELS.find(l => l.level === singleForm.level) || SKILL_LEVELS[2];
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${currentLvl.badgeColor}`}>
                        {currentLvl.level}
                      </span>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{currentLvl.label}</span>
                          {currentLvl.level >= 3 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                              Meets Target Requirement
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{currentLvl.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Remarks and Evaluator */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Certification & Evaluation Details
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Certified on batch 2, passed standard cycle-time test"
                      value={singleForm.remarks}
                      onChange={(e) => setSingleForm({...singleForm, remarks: e.target.value})}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Evaluated By
                    </label>
                    <input
                      type="text"
                      placeholder="Evaluator / Supervisor Name"
                      value={singleForm.evaluatedBy}
                      onChange={(e) => setSingleForm({...singleForm, evaluatedBy: e.target.value})}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-medium"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Pinned Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                {singleForm.empId && singleForm.machineName ? (
                  <span>
                    Mapping: <strong className="text-slate-800">{singleForm.empId}</strong> on <strong className="text-slate-800">{singleForm.machineName}</strong> (Level {singleForm.level})
                  </span>
                ) : (
                  <span>Fill in required fields marked with <span className="text-rose-500 font-bold">*</span></span>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSkill(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="single-skill-form"
                  disabled={isSubmitting || !singleForm.empId || !singleForm.machineName}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingSkill ? (
                    'Update Skill'
                  ) : (
                    'Save Skill'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK MACHINE & PROCESS ASSIGNMENT MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Bulk Operator Skill Assignment (Machine & Process Wise)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a Machine and Process, then assign competency ratings to all or multiple operators at once.
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="bulk-skill-form" onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* Target Machine & Process Configuration */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  1. Target Machine & Process Setup
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Machine *</label>
                    <select
                      required
                      value={bulkMachine}
                      onChange={(e) => handleBulkMachineChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Choose Machine --</option>
                      {machines.map(m => (
                        <option key={`${m.machineName}-${m.machineNo}`} value={m.machineName}>
                          {m.machineName} {m.machineNo ? `(${m.machineNo})` : ''} - {m.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Process Name</label>
                    <input
                      list="bulk-process-list"
                      placeholder="e.g. High-Speed Weaving"
                      value={bulkProcess}
                      onChange={(e) => setBulkProcess(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <datalist id="bulk-process-list">
                      {allProcesses.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Skill Level</label>
                    <select
                      value={bulkLevel}
                      onChange={(e) => setBulkLevel(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {SKILL_LEVELS.map(lvl => (
                        <option key={lvl.level} value={lvl.level}>{lvl.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Department certification batch Q3"
                    value={bulkRemarks}
                    onChange={(e) => setBulkRemarks(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Operator Selection Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      2. Select Operators ({selectedEmpIds.length} Selected)
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={bulkDept}
                      onChange={(e) => setBulkDept(e.target.value)}
                      className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search operator..."
                      value={bulkEmpSearch}
                      onChange={(e) => setBulkEmpSearch(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg outline-none w-36"
                    />

                    <button
                      type="button"
                      onClick={toggleSelectAllBulk}
                      className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                    >
                      {selectedEmpIds.length === bulkAvailableEmployees.length ? 'Deselect All' : 'Select All (' + bulkAvailableEmployees.length + ')'}
                    </button>
                  </div>
                </div>

                {/* Operators Grid List */}
                <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {bulkAvailableEmployees.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No operators found matching the filter.
                    </div>
                  ) : (
                    bulkAvailableEmployees.map((emp, idx) => {
                      const isSelected = selectedEmpIds.includes(emp.id);
                      // Check if already mapped to this machine
                      const existingMapping = bulkMachine 
                        ? skills.find(s => s.empId.toUpperCase() === emp.id.toUpperCase() && s.machineName.toLowerCase() === bulkMachine.toLowerCase())
                        : null;

                      return (
                        <div
                          key={`${emp.id}-${idx}`}
                          onClick={() => toggleSelectEmp(emp.id)}
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-indigo-600">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800">{emp.name}</span>
                              <span className="text-xs font-mono text-slate-400 ml-2">({emp.id})</span>
                              <span className="text-[11px] text-slate-500 ml-2">{emp.designation} • {emp.department}</span>
                            </div>
                          </div>

                          <div>
                            {existingMapping ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                Already Mapped: Level {existingMapping.level} (Will overwrite)
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">New Skill</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </form>

            {/* Pinned Action Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                Ready to assign <strong>{selectedEmpIds.length}</strong> operator{selectedEmpIds.length !== 1 ? 's' : ''} to <strong>{bulkMachine || '(No machine selected)'}</strong>.
              </span>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="bulk-skill-form"
                  disabled={isSubmitting || selectedEmpIds.length === 0 || !bulkMachine}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    `Assign to ${selectedEmpIds.length} Operator${selectedEmpIds.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingSkill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">Confirm Skill Deletion</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to remove the skill mapping for{' '}
              <strong>{deletingSkill.empName || deletingSkill.empId}</strong> on machine{' '}
              <strong>{deletingSkill.machineName}</strong> (Level {deletingSkill.level})?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSkill(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
