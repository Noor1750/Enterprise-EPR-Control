import { useState, useEffect, useMemo, FormEvent } from 'react';
import { User } from 'firebase/auth';
import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from '../lib/sheets';
import { 
  Loader2, DollarSign, Edit2, Trash2, X, Plus, Calendar, 
  Building2, Users, Trophy, TrendingUp, Search, Filter, 
  Download, Sparkles, Lightbulb, BarChart3, 
  RotateCcw, Check, Award, Zap,
  Briefcase, FileSpreadsheet, Layers, UserCheck, CheckSquare, PlusCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { UserSecurityScope, filterAuthorizedEmployees } from '../lib/security';
import AdminDeleteConfirmModal from './common/AdminDeleteConfirmModal';

interface BestPracticesProps {
  spreadsheetId: string;
  user: User;
  userSecurityScope?: UserSecurityScope;
}

type ViewMode = 'overview' | 'monthly' | 'department' | 'employee' | 'teams';
type ContributorType = 'individual' | 'group';

export interface GroupMemberItem {
  id: string;
  name: string;
  department?: string;
  designation?: string;
}

const CATEGORY_TAGS = [
  'Process Improvement',
  'Waste Reduction',
  'Energy Saving',
  'Machine Efficiency',
  'Cycle Time Reduction',
  'Quality Improvement',
  'Material Optimization',
  'Safety & Ergonomics',
  'Tooling / Automation',
  'Kaizen 5S Circle',
  'Other Innovation'
];

const COLORS = ['#1ABB9C', '#337AB7', '#9B59B6', '#E67E22', '#3498DB', '#E74C3C', '#16A085', '#F39C12', '#2ECC71', '#34495E'];

export default function BestPractices({ spreadsheetId, user, userSecurityScope }: BestPracticesProps) {
  const [practices, setPractices] = useState<string[][]>([]);
  const [employees, setEmployees] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active custom view tab
  const [activeView, setActiveView] = useState<ViewMode>('overview');

  // Filters
  const currentMonthStr = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr); // default to current month
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [selectedContributorType, setSelectedContributorType] = useState<'All' | 'individual' | 'group'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form / Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [contributorType, setContributorType] = useState<ContributorType>('individual');
  
  // Individual Fields
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  
  // Group Fields
  const [formGroupName, setFormGroupName] = useState('');
  const [formGroupLeadId, setFormGroupLeadId] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMemberItem[]>([]);
  const [memberSearchInput, setMemberSearchInput] = useState('');

  // Common Fields
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formDepartment, setFormDepartment] = useState('');
  const [formCategory, setFormCategory] = useState('Process Improvement');
  const [formDetails, setFormDetails] = useState('');
  const [formSavings, setFormSavings] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    details?: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pRaw, eRaw] = await Promise.all([
        getRange(spreadsheetId, 'BestPractices!A:Z').catch(() => []),
        getRange(spreadsheetId, 'Employees!A:Z').catch(() => []),
      ]);
      setPractices(pRaw.length > 1 ? pRaw.slice(1) : []);
      setEmployees(eRaw.length > 1 ? eRaw.slice(1) : []);
    } catch (err) {
      console.error('Error loading best practices data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spreadsheetId]);

  // Filter authorized employees according to security scope
  const authorizedEmployees = useMemo(() => {
    return filterAuthorizedEmployees(employees, userSecurityScope);
  }, [employees, userSecurityScope]);

  // Helper map of all employees for fast lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, { id: string, name: string, designation: string, department: string }>();
    employees.forEach(e => {
      if (e[0]) {
        map.set(e[0].trim(), {
          id: e[0].trim(),
          name: e[1]?.trim() || '',
          designation: e[2]?.trim() || '',
          department: e[3]?.trim() || ''
        });
      }
    });
    return map;
  }, [employees]);

  // Extract all distinct departments
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    practices.forEach(p => {
      if (p[5]?.trim()) set.add(p[5].trim());
    });
    employees.forEach(e => {
      if (e[3]?.trim()) set.add(e[3].trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [practices, employees]);

  // Extract all distinct months available in practices + current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthStr);
    practices.forEach(p => {
      const dateStr = p[1]?.trim();
      if (dateStr && dateStr.length >= 7) {
        set.add(dateStr.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [practices, currentMonthStr]);

  // Helper to format Year-Month to readable string e.g. "2026-08" -> "August 2026"
  const formatMonthLabel = (ym: string) => {
    try {
      const [year, month] = ym.split('-');
      if (!year || !month) return ym;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return format(date, 'MMMM yyyy');
    } catch {
      return ym;
    }
  };

  // Safe numeric savings parser
  const parseSavings = (val: any): number => {
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Determine if a practice row is Individual or Group
  const getRowContributorType = (p: string[]): 'individual' | 'group' => {
    // Check column 8 if explicitly stored
    const explicitType = (p[8] || '').trim().toLowerCase();
    if (explicitType === 'group' || explicitType === 'team') return 'group';
    if (explicitType === 'individual') return 'individual';

    // Fallback checks on ID or Name or Designation
    const id = (p[2] || '').trim();
    const name = (p[3] || '').trim();
    const desig = (p[4] || '').trim();

    if (id.startsWith('GRP') || id.includes(',') || name.toLowerCase().includes('team') || name.toLowerCase().includes('group') || desig.toLowerCase().includes('members') || desig.toLowerCase().includes('group')) {
      return 'group';
    }
    return 'individual';
  };

  // Parse group members list from row
  const getRowGroupMembers = (p: string[]): GroupMemberItem[] => {
    const rawMembers = p[9] || '';
    if (rawMembers) {
      try {
        if (rawMembers.startsWith('[') && rawMembers.endsWith(']')) {
          return JSON.parse(rawMembers);
        }
      } catch {}
      // Comma-separated fallback e.g. "EMP001: John, EMP002: Alice"
      return rawMembers.split(',').map(item => {
        const parts = item.split(':');
        const id = parts[0]?.trim() || '';
        const name = parts[1]?.trim() || id;
        const emp = employeeMap.get(id);
        return {
          id,
          name: emp ? emp.name : name,
          department: emp?.department,
          designation: emp?.designation
        };
      }).filter(m => m.id || m.name);
    }

    // Secondary fallback: parse from ID column if comma-separated
    const idCol = p[2] || '';
    if (idCol.includes(',')) {
      return idCol.replace(/^GRP:\s*/i, '').split(',').map(idStr => {
        const id = idStr.trim();
        const emp = employeeMap.get(id);
        return {
          id,
          name: emp ? emp.name : id,
          department: emp?.department,
          designation: emp?.designation
        };
      }).filter(m => m.id);
    }

    return [];
  };

  // Helper to parse practice month
  const getPracticeMonth = (p: string[]) => {
    const dateStr = p[1]?.trim() || '';
    if (dateStr.length >= 7) {
      return dateStr.substring(0, 7);
    }
    return '';
  };

  // --- STATS CALCULATIONS ---

  // 1. THIS MONTH'S TOTAL SAVINGS (Key requirement: "In best practices TOTAL SAVINGS need to show this month savings only")
  const thisMonthPractices = useMemo(() => {
    return practices.filter(p => getPracticeMonth(p) === currentMonthStr);
  }, [practices, currentMonthStr]);

  const carriedOverPractices = useMemo(() => {
    return practices.filter(p => {
      const isRecurring = (p[10] || '').trim().toLowerCase() === 'yes';
      const pMonth = getPracticeMonth(p);
      return isRecurring && pMonth && pMonth < currentMonthStr;
    });
  }, [practices, currentMonthStr]);

  const thisMonthTotalSavings = useMemo(() => {
    const currentMonthSum = thisMonthPractices.reduce((sum, p) => sum + parseSavings(p[7]), 0);
    const carriedOverSum = carriedOverPractices.reduce((sum, p) => sum + parseSavings(p[7]), 0);
    return currentMonthSum + carriedOverSum;
  }, [thisMonthPractices, carriedOverPractices]);

  const thisMonthIndividualSavings = useMemo(() => {
    const currentSum = thisMonthPractices
      .filter(p => getRowContributorType(p) === 'individual')
      .reduce((sum, p) => sum + parseSavings(p[7]), 0);
    const carriedSum = carriedOverPractices
      .filter(p => getRowContributorType(p) === 'individual')
      .reduce((sum, p) => sum + parseSavings(p[7]), 0);
    return currentSum + carriedSum;
  }, [thisMonthPractices, carriedOverPractices]);

  const thisMonthGroupSavings = useMemo(() => {
    const currentSum = thisMonthPractices
      .filter(p => getRowContributorType(p) === 'group')
      .reduce((sum, p) => sum + parseSavings(p[7]), 0);
    const carriedSum = carriedOverPractices
      .filter(p => getRowContributorType(p) === 'group')
      .reduce((sum, p) => sum + parseSavings(p[7]), 0);
    return currentSum + carriedSum;
  }, [thisMonthPractices, carriedOverPractices]);

  const thisMonthCount = thisMonthPractices.length;
  const thisMonthAvgSavings = thisMonthCount > 0 ? thisMonthTotalSavings / (thisMonthCount + carriedOverPractices.length) : 0;

  // 2. All Time Total Savings
  const allTimeTotalSavings = useMemo(() => {
    return practices.reduce((sum, p) => sum + parseSavings(p[7]), 0);
  }, [practices]);

  // 3. Filtered Practices
  const filteredPractices = useMemo(() => {
    return practices.filter(p => {
      // Month filter logic with recurring check
      if (selectedMonth !== 'All') {
        const pMonth = getPracticeMonth(p);
        const isRecurring = (p[10] || '').trim().toLowerCase() === 'yes';
        
        if (isRecurring) {
          // If recurring, it applies to any selected month on or after its original month
          if (pMonth > selectedMonth) return false;
        } else {
          // If not recurring, it strictly applies to its original month
          if (pMonth !== selectedMonth) return false;
        }
      }

      // Department filter
      if (selectedDepartment !== 'All' && p[5]?.trim() !== selectedDepartment) {
        return false;
      }
      // Contributor Type filter
      const type = getRowContributorType(p);
      if (selectedContributorType !== 'All' && type !== selectedContributorType) {
        return false;
      }
      // Employee filter (matches individual ID or any group member ID)
      if (selectedEmployeeId !== 'All') {
        const isIndividualMatch = p[2]?.trim() === selectedEmployeeId;
        const groupMembersList = getRowGroupMembers(p);
        const isGroupMemberMatch = groupMembersList.some(m => m.id === selectedEmployeeId);
        if (!isIndividualMatch && !isGroupMemberMatch) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empId = (p[2] || '').toLowerCase();
        const empName = (p[3] || '').toLowerCase();
        const dept = (p[5] || '').toLowerCase();
        const details = (p[6] || '').toLowerCase();
        const membersStr = (p[9] || '').toLowerCase();
        if (!empId.includes(q) && !empName.includes(q) && !dept.includes(q) && !details.includes(q) && !membersStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [practices, selectedMonth, selectedDepartment, selectedContributorType, selectedEmployeeId, searchQuery]);

  const filteredTotalSavings = useMemo(() => {
    return filteredPractices.reduce((sum, p) => sum + parseSavings(p[7]), 0);
  }, [filteredPractices]);

  // 4. Monthly Aggregation Data
  const monthlyData = useMemo(() => {
    const map: Record<string, { 
      month: string; 
      label: string; 
      savings: number; 
      individualSavings: number; 
      groupSavings: number; 
      count: number; 
      practices: string[][];
    }> = {};
    
    availableMonths.forEach(m => {
      map[m] = {
        month: m,
        label: formatMonthLabel(m),
        savings: 0,
        individualSavings: 0,
        groupSavings: 0,
        count: 0,
        practices: []
      };
    });

    practices.forEach(p => {
      const pMonth = getPracticeMonth(p);
      const isRecurring = (p[10] || '').trim().toLowerCase() === 'yes';
      const s = parseSavings(p[7]);
      const type = getRowContributorType(p);

      if (pMonth) {
        // Find all months this practice should be credited to
        const monthsToCredit = isRecurring 
          ? availableMonths.filter(m => m >= pMonth) 
          : [pMonth];

        monthsToCredit.forEach(m => {
          if (!map[m]) {
            map[m] = {
              month: m,
              label: formatMonthLabel(m),
              savings: 0,
              individualSavings: 0,
              groupSavings: 0,
              count: 0,
              practices: []
            };
          }
          map[m].savings += s;
          if (type === 'individual') {
            map[m].individualSavings += s;
          } else {
            map[m].groupSavings += s;
          }
          if (m === pMonth) {
            map[m].count += 1;
            map[m].practices.push(p);
          }
        });
      }
    });

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [practices, availableMonths]);

  // 5. Department-wise Aggregation Data
  const departmentData = useMemo(() => {
    const map: Record<string, { 
      department: string; 
      savings: number; 
      individualSavings: number; 
      groupSavings: number; 
      count: number; 
      topContributor: string; 
      practices: string[][];
    }> = {};

    practices.forEach(p => {
      const dept = p[5]?.trim() || 'General';
      if (!map[dept]) {
        map[dept] = {
          department: dept,
          savings: 0,
          individualSavings: 0,
          groupSavings: 0,
          count: 0,
          topContributor: '',
          practices: []
        };
      }
      const s = parseSavings(p[7]);
      const type = getRowContributorType(p);
      map[dept].savings += s;
      if (type === 'individual') {
        map[dept].individualSavings += s;
      } else {
        map[dept].groupSavings += s;
      }
      map[dept].count += 1;
      map[dept].practices.push(p);
    });

    // Determine top contributor in department
    Object.values(map).forEach(deptObj => {
      const contributorMap: Record<string, number> = {};
      deptObj.practices.forEach(p => {
        const contributor = p[3] || p[2] || 'Unknown';
        contributorMap[contributor] = (contributorMap[contributor] || 0) + parseSavings(p[7]);
      });
      let highest = 0;
      let top = '';
      Object.entries(contributorMap).forEach(([name, sav]) => {
        if (sav > highest) {
          highest = sav;
          top = name;
        }
      });
      deptObj.topContributor = top;
    });

    return Object.values(map).sort((a, b) => b.savings - a.savings);
  }, [practices]);

  // 6. Employee-wise Leaderboard Data (Individual Employees from Employee Directory)
  const employeeLeaderboard = useMemo(() => {
    const map: Record<string, { 
      id: string; 
      name: string; 
      department: string; 
      designation: string; 
      savings: number; 
      individualCount: number; 
      groupCount: number; 
      highestSaving: number; 
      practices: string[][];
    }> = {};

    // Initialize map from employees directory to ensure standard matching
    employees.forEach(emp => {
      if (emp[0]) {
        map[emp[0].trim()] = {
          id: emp[0].trim(),
          name: emp[1]?.trim() || emp[0],
          department: emp[3]?.trim() || 'General',
          designation: emp[2]?.trim() || '',
          savings: 0,
          individualCount: 0,
          groupCount: 0,
          highestSaving: 0,
          practices: []
        };
      }
    });

    practices.forEach(p => {
      const s = parseSavings(p[7]);
      const type = getRowContributorType(p);

      if (type === 'individual') {
        const empId = p[2]?.trim();
        if (empId) {
          if (!map[empId]) {
            map[empId] = {
              id: empId,
              name: p[3]?.trim() || empId,
              department: p[5]?.trim() || '',
              designation: p[4]?.trim() || '',
              savings: 0,
              individualCount: 0,
              groupCount: 0,
              highestSaving: 0,
              practices: []
            };
          }
          map[empId].savings += s;
          map[empId].individualCount += 1;
          if (s > map[empId].highestSaving) map[empId].highestSaving = s;
          map[empId].practices.push(p);
        }
      } else {
        // Group innovation - credit member count
        const members = getRowGroupMembers(p);
        members.forEach(m => {
          if (m.id && map[m.id]) {
            map[m.id].groupCount += 1;
            map[m.id].practices.push(p);
          }
        });
      }
    });

    return Object.values(map)
      .filter(emp => (emp.individualCount > 0 || emp.groupCount > 0 || emp.savings > 0))
      .sort((a, b) => b.savings - a.savings);
  }, [practices, employees]);

  // 7. Group / Team Leaderboard Data
  const groupLeaderboard = useMemo(() => {
    const map: Record<string, {
      groupName: string;
      department: string;
      savings: number;
      count: number;
      highestSaving: number;
      members: GroupMemberItem[];
      practices: string[][];
    }> = {};

    practices.forEach(p => {
      if (getRowContributorType(p) === 'group') {
        const gName = p[3]?.trim() || 'Group Innovation';
        const dept = p[5]?.trim() || 'General';
        const s = parseSavings(p[7]);
        const members = getRowGroupMembers(p);

        if (!map[gName]) {
          map[gName] = {
            groupName: gName,
            department: dept,
            savings: 0,
            count: 0,
            highestSaving: 0,
            members,
            practices: []
          };
        }

        map[gName].savings += s;
        map[gName].count += 1;
        if (s > map[gName].highestSaving) map[gName].highestSaving = s;
        map[gName].practices.push(p);

        // Merge members list
        members.forEach(newMem => {
          if (!map[gName].members.some(m => m.id === newMem.id)) {
            map[gName].members.push(newMem);
          }
        });
      }
    });

    return Object.values(map).sort((a, b) => b.savings - a.savings);
  }, [practices]);

  // Top performers
  const topDepartment = departmentData[0];
  const topIndividual = employeeLeaderboard[0];
  const topGroup = groupLeaderboard[0];

  // --- FORM HANDLERS ---
  const handleIndividualSelect = (empId: string) => {
    const matched = employeeMap.get(empId.trim());
    if (matched) {
      setFormEmployeeId(matched.id);
      setFormEmployeeName(matched.name);
      setFormDesignation(matched.designation);
      if (!formDepartment) setFormDepartment(matched.department);
    } else {
      setFormEmployeeId(empId);
    }
  };

  const handleAddGroupMember = (empId: string) => {
    const cleanId = empId.trim();
    if (!cleanId) return;

    if (groupMembers.some(m => m.id === cleanId)) {
      alert('This employee is already added to the group.');
      setMemberSearchInput('');
      return;
    }

    const matched = employeeMap.get(cleanId);
    const newMember: GroupMemberItem = {
      id: cleanId,
      name: matched ? matched.name : cleanId,
      department: matched?.department,
      designation: matched?.designation
    };

    setGroupMembers(prev => [...prev, newMember]);
    if (!formDepartment && matched?.department) {
      setFormDepartment(matched.department);
    }
    setMemberSearchInput('');
  };

  const handleRemoveGroupMember = (empId: string) => {
    setGroupMembers(prev => prev.filter(m => m.id !== empId));
    if (formGroupLeadId === empId) {
      setFormGroupLeadId('');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setContributorType('individual');
    
    const userEmpId = userSecurityScope?.employeeId || '';
    const userEmp = employeeMap.get(userEmpId);

    setFormEmployeeId(userEmpId);
    setFormEmployeeName(userEmp?.name || userSecurityScope?.employeeName || '');
    setFormDesignation(userEmp?.designation || userSecurityScope?.employeeDesignation || '');
    setFormDepartment(userEmp?.department || userSecurityScope?.assignedDepartment || '');

    setFormGroupName('');
    setFormGroupLeadId('');
    setGroupMembers([]);
    setMemberSearchInput('');

    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormCategory('Process Improvement');
    setFormDetails('');
    setFormSavings('');
    
    setShowModal(true);
  };

  const handleEdit = (p: string[]) => {
    setEditingId(p[0]);
    const type = getRowContributorType(p);
    setContributorType(type);

    setFormDate(p[1] || format(new Date(), 'yyyy-MM-dd'));
    setFormDepartment(p[5] || '');
    setFormDetails(p[6] || '');
    setFormSavings(p[7] || '');
    setFormIsRecurring((p[10] || '').trim().toLowerCase() === 'yes');

    if (type === 'individual') {
      const empId = p[2] || '';
      const matched = employeeMap.get(empId);
      setFormEmployeeId(empId);
      setFormEmployeeName(p[3] || matched?.name || '');
      setFormDesignation(p[4] || matched?.designation || '');
      setFormGroupName('');
      setGroupMembers([]);
    } else {
      setFormGroupName(p[3] || '');
      const members = getRowGroupMembers(p);
      setGroupMembers(members);
      setFormGroupLeadId(members[0]?.id || '');
      setFormEmployeeId('');
      setFormEmployeeName('');
      setFormDesignation('');
    }

    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formSavings || isNaN(parseFloat(formSavings))) {
      alert('Please enter a valid cost savings amount.');
      return;
    }

    if (contributorType === 'individual') {
      if (!formEmployeeId) {
        alert('Please select an Individual Employee from the Employee Directory.');
        return;
      }
    } else {
      if (!formGroupName.trim()) {
        alert('Please enter a Group / Team Name (e.g. SMT Kaizen Squad).');
        return;
      }
      if (groupMembers.length === 0) {
        alert('Please add at least one participating employee from the Employee Directory into the group.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const numSavings = parseFloat(formSavings).toFixed(2);
      let idCol = '';
      let nameCol = '';
      let desigCol = '';
      let deptCol = formDepartment.trim() || 'General';
      let typeCol = contributorType === 'individual' ? 'Individual' : 'Group';
      let groupMembersJson = '';

      if (contributorType === 'individual') {
        const empMatch = employeeMap.get(formEmployeeId);
        idCol = formEmployeeId;
        nameCol = formEmployeeName || empMatch?.name || formEmployeeId;
        desigCol = formDesignation || empMatch?.designation || 'Specialist';
        deptCol = formDepartment || empMatch?.department || 'Production';
        groupMembersJson = '';
      } else {
        idCol = `GRP: ${groupMembers.map(m => m.id).join(', ')}`;
        nameCol = formGroupName.trim();
        desigCol = `Group Innovation (${groupMembers.length} Members)`;
        groupMembersJson = JSON.stringify(groupMembers);
      }

      if (editingId) {
        const updatedRow = [
          editingId,
          formDate,
          idCol,
          nameCol,
          desigCol,
          deptCol,
          formDetails,
          numSavings,
          typeCol,
          groupMembersJson,
          formIsRecurring ? 'Yes' : 'No'
        ];
        await updateRowByPrimaryKey(spreadsheetId, 'BestPractices', editingId, updatedRow);
      } else {
        const bpId = `BP-${Date.now()}`;
        const newRow = [
          bpId,
          formDate,
          idCol,
          nameCol,
          desigCol,
          deptCol,
          formDetails,
          numSavings,
          typeCol,
          groupMembersJson,
          formIsRecurring ? 'Yes' : 'No'
        ];
        await appendRow(spreadsheetId, 'BestPractices!A:K', [newRow]);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to save best practice:', err);
      alert('Failed to save record. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (bpId: string) => {
    const practice = practices.find(p => p[0] === bpId);
    setDeleteTarget({
      id: bpId,
      name: practice ? `${practice[3] || practice[2] || 'Best Practice'} (${practice[0]})` : bpId,
      details: practice ? `Department: ${practice[5] || 'N/A'} | Savings: $${practice[7] || '0'} | ${practice[6] || ''}` : undefined
    });
  };

  const handleExecuteConfirmedDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'BestPractices', deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete best practice:', err);
      alert('Failed to delete record.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Contributor Type', 'Employee ID / Group IDs', 'Contributor / Group Name', 'Designation / Info', 'Department', 'Innovation Details', 'Savings (USD)', 'Team Members'];
    const rows = filteredPractices.map(p => {
      const type = getRowContributorType(p);
      const members = getRowGroupMembers(p).map(m => `${m.id}: ${m.name}`).join('; ');
      return [
        p[0] || '',
        p[1] || '',
        type === 'individual' ? 'Individual' : 'Group',
        p[2] || '',
        `"${(p[3] || '').replace(/"/g, '""')}"`,
        `"${(p[4] || '').replace(/"/g, '""')}"`,
        `"${(p[5] || '').replace(/"/g, '""')}"`,
        `"${(p[6] || '').replace(/"/g, '""')}"`,
        p[7] || '0',
        `"${members.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Best_Practices_${selectedMonth === 'All' ? 'All_Time' : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSelectedMonth(currentMonthStr);
    setSelectedDepartment('All');
    setSelectedEmployeeId('All');
    setSelectedContributorType('All');
    setSearchQuery('');
  };

  const isFilterActive = selectedMonth !== currentMonthStr || selectedDepartment !== 'All' || selectedEmployeeId !== 'All' || selectedContributorType !== 'All' || searchQuery !== '';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-10 h-10 text-[#337AB7] animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading Best Practices & Innovation Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E9ED] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-gray-800">Best Practices & Cost Savings Innovation</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Capture, evaluate, and reward measurable continuous improvements by <strong>Individual Employees</strong> (linked to Employee Directory) and <strong>Cross-Functional Groups / Teams</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors"
            title="Export filtered records as CSV"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export CSV
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#337AB7] text-white text-xs font-bold rounded-md hover:bg-[#286090] flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Best Practice
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS BANNER - FOCUSING ON THIS MONTH'S TOTAL SAVINGS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: THIS MONTH'S TOTAL SAVINGS (PRIMARY PROMINENT FOCUS) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-xl shadow-md text-white relative overflow-hidden flex flex-col justify-between border border-emerald-500">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
            <DollarSign className="w-32 h-32" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold tracking-wider text-emerald-100 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                This Month Total Savings
              </span>
              <span className="bg-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                {formatMonthLabel(currentMonthStr)}
              </span>
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-semibold opacity-90 mr-1">$</span>
              <span className="text-3xl font-extrabold tracking-tight">
                {thisMonthTotalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/40 space-y-1 text-xs text-emerald-100">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                {thisMonthCount} Initiative{thisMonthCount !== 1 ? 's' : ''} this month
              </span>
              <span className="opacity-90 font-medium">
                Avg: ${thisMonthAvgSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-200/90 pt-0.5 font-medium">
              <span>👤 Indiv: ${thisMonthIndividualSavings.toLocaleString()}</span>
              <span>👥 Group: ${thisMonthGroupSavings.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: ALL-TIME TOTAL SAVINGS */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-gray-600">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                All-Time Total Savings
              </span>
              <span className="text-[10px] text-gray-400 font-bold">CUMULATIVE</span>
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-semibold text-gray-500 mr-1">$</span>
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {allTimeTotalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{practices.length} Total Practices Logged</span>
            <span className="font-semibold text-blue-600">
              {monthlyData.length} Active Months
            </span>
          </div>
        </div>

        {/* CARD 3: TOP CONTRIBUTING DEPARTMENT */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Building2 className="w-4 h-4 text-purple-600" />
                Top Department
              </span>
              <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                #1 SAVINGS
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-gray-900 truncate">
                {topDepartment ? topDepartment.department : 'N/A'}
              </div>
              <div className="text-xs font-semibold text-purple-700 mt-0.5">
                ${(topDepartment?.savings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} saved
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{topDepartment?.count || 0} initiatives</span>
            <span className="text-gray-400">
              {allTimeTotalSavings > 0 ? `${(((topDepartment?.savings || 0) / allTimeTotalSavings) * 100).toFixed(0)}% share` : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 4: TOP PERFORMER / GROUP */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Contributor / Team
              </span>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                LEADER
              </span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-gray-900 truncate">
                {topIndividual ? topIndividual.name : (topGroup ? topGroup.groupName : 'N/A')}
              </div>
              <div className="text-xs font-semibold text-amber-600 mt-0.5">
                ${(topIndividual ? topIndividual.savings : (topGroup?.savings || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="truncate">{topIndividual?.department || topGroup?.department || 'Department'}</span>
            <span className="font-mono text-[11px] text-gray-400 font-bold">
              {topIndividual ? topIndividual.id : `${topGroup?.members.length || 0} Members`}
            </span>
          </div>
        </div>
      </div>

      {/* CUSTOMIZED VIEW NAVIGATION TABS */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'overview'
                ? 'bg-[#337AB7] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Overview & Practice Log ({filteredPractices.length})
          </button>

          <button
            onClick={() => setActiveView('monthly')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'monthly'
                ? 'bg-[#337AB7] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Monthly Breakdown ({monthlyData.length} Months)
          </button>

          <button
            onClick={() => setActiveView('department')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'department'
                ? 'bg-[#337AB7] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Department-wise ({departmentData.length} Depts)
          </button>

          <button
            onClick={() => setActiveView('employee')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'employee'
                ? 'bg-[#337AB7] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Award className="w-4 h-4" />
            Individual Employees Directory ({employeeLeaderboard.length})
          </button>

          <button
            onClick={() => setActiveView('teams')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'teams'
                ? 'bg-[#337AB7] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Group / Team Circles ({groupLeaderboard.length})
          </button>
        </div>

        {/* Selected Filter Summary Badge */}
        <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <span className="text-gray-400">Active Scope Savings:</span>
          <span className="text-emerald-700 font-bold">${filteredTotalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            Custom View Filters & Scope Controls
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters (Back to This Month)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Month Period
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full text-xs font-medium border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={currentMonthStr}>🌟 This Month ({formatMonthLabel(currentMonthStr)})</option>
              <option value="All">All Months (Entire History)</option>
              {availableMonths.filter(m => m !== currentMonthStr).map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)} ({m})</option>
              ))}
            </select>
          </div>

          {/* 2. Contributor Type Filter (Individual vs Group) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Contributor Mode
            </label>
            <select
              value={selectedContributorType}
              onChange={e => setSelectedContributorType(e.target.value as any)}
              className="w-full text-xs font-medium border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All (Individual & Group)</option>
              <option value="individual">👤 Individual Employee Only</option>
              <option value="group">👥 Group / Team Innovation Only</option>
            </select>
          </div>

          {/* 3. Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full text-xs font-medium border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Departments</option>
              {allDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* 4. Employee Filter (As per Employee Directory) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Employee Directory Filter
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full text-xs font-medium border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Employees</option>
              {employees.map((emp, idx) => (
                <option key={`${emp[0]}-${idx}`} value={emp[0]}>{emp[0]} - {emp[1]} ({emp[3] || 'General'})</option>
              ))}
            </select>
          </div>

          {/* 5. Keyword Search */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Search Ideas / Groups
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ideas, names, teams..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quick presets pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 mr-1">Quick Presets:</span>
          <button
            onClick={() => { setSelectedMonth(currentMonthStr); setSelectedDepartment('All'); setSelectedEmployeeId('All'); setSelectedContributorType('All'); }}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              selectedMonth === currentMonthStr && selectedDepartment === 'All' && selectedContributorType === 'All'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            This Month Only ({formatMonthLabel(currentMonthStr)})
          </button>

          <button
            onClick={() => { setSelectedContributorType('individual'); }}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              selectedContributorType === 'individual'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👤 Individual Staff Only
          </button>

          <button
            onClick={() => { setSelectedContributorType('group'); }}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              selectedContributorType === 'group'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👥 Group / Team Circles Only
          </button>

          <button
            onClick={() => { setSelectedMonth('All'); }}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
              selectedMonth === 'All'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All-Time History
          </button>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & PRACTICE LOG */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Best Practices Log Entries
                  <span className="text-xs font-normal text-gray-500">
                    (Showing {filteredPractices.length} of {practices.length} records)
                  </span>
                </h3>
              </div>

              <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                <span>Selected Period:</span>
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {selectedMonth === 'All' ? 'All Months' : formatMonthLabel(selectedMonth)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Date & ID</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Contributor / Group (Directory Linked)</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Innovation & Practice Details</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase tracking-wider">Cost Savings</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPractices.map((p, i) => {
                    const savingsNum = parseSavings(p[7]);
                    const isThisMonth = getPracticeMonth(p) === currentMonthStr;
                    const type = getRowContributorType(p);
                    const groupMembersList = type === 'group' ? getRowGroupMembers(p) : [];

                    return (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap align-top">
                          <div className="font-bold text-gray-900">{p[1] || 'N/A'}</div>
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">{p[0]}</div>
                          {isThisMonth && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              This Month
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top max-w-xs">
                          {type === 'individual' ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] inline-flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  Individual
                                </span>
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                  {p[2]}
                                </span>
                              </div>
                              <div className="font-bold text-sm text-gray-900 mt-1">
                                {p[3] || 'Unknown'}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                <span className="font-medium text-gray-700">{p[5] || 'General'}</span>
                                {p[4] && <span className="text-gray-400">• {p[4]}</span>}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded bg-purple-50 text-purple-700 font-bold text-[10px] inline-flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  Group / Team
                                </span>
                                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">
                                  {groupMembersList.length > 0 ? `${groupMembersList.length} Members` : 'Team'}
                                </span>
                              </div>
                              <div className="font-bold text-sm text-gray-900 mt-1 flex items-center gap-1">
                                {p[3] || 'Group Innovation'}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                <span className="font-medium text-purple-800">{p[5] || 'General'}</span>
                              </div>

                              {/* Group Member Chips */}
                              {groupMembersList.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {groupMembersList.map(m => (
                                    <span key={m.id} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200" title={`${m.id} - ${m.designation || ''}`}>
                                      <span className="font-bold text-slate-900">{m.name}</span>
                                      <span className="text-slate-400 font-mono text-[9px]">({m.id})</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="text-gray-800 text-xs font-normal leading-relaxed whitespace-pre-wrap max-w-lg">
                            {p[6] || 'No description provided.'}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right align-top">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            +${savingsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {p[10] === 'Yes' && ' /mo'}
                          </span>
                          {p[10] === 'Yes' && (
                            <div className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">
                              Recurring Savings
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right align-top font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1 text-[#337AB7] hover:bg-blue-50 rounded transition-colors"
                              title="Edit Best Practice"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p[0])}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Best Practice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPractices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Lightbulb className="w-8 h-8 text-gray-300" />
                          <div className="font-semibold text-gray-700">No Best Practices match your selected filters.</div>
                          <div className="text-xs text-gray-400">Try changing the Contributor Mode, Month, Department, or Search query.</div>
                          <button
                            onClick={resetFilters}
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                          >
                            Reset all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY BREAKDOWN VIEW */}
      {activeView === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Trend Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Monthly Cost Savings Trend (Individual vs Group USD)
                </h3>
                <p className="text-xs text-gray-500">Continuous improvement savings stacked by month.</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                This Month ({formatMonthLabel(currentMonthStr)}): ${thisMonthTotalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E9ED" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#73879C' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#73879C' }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Savings']}
                    labelFormatter={(label: any) => formatMonthLabel(String(label))}
                  />
                  <Legend />
                  <Bar dataKey="individualSavings" name="Individual Employee" stackId="a" fill="#337AB7" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="groupSavings" name="Group / Team Circles" stackId="a" fill="#9B59B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month by Month Aggregated Table */}
          <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Monthly Performance & Aggregates</h3>
              <span className="text-xs text-gray-500 font-medium">Click any row to filter the log</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left font-bold text-gray-600 uppercase">Month</th>
                    <th className="px-6 py-3.5 text-center font-bold text-gray-600 uppercase">Practices Logged</th>
                    <th className="px-6 py-3.5 text-right font-bold text-gray-600 uppercase">Individual Savings</th>
                    <th className="px-6 py-3.5 text-right font-bold text-gray-600 uppercase">Group Savings</th>
                    <th className="px-6 py-3.5 text-right font-bold text-gray-600 uppercase">Total Monthly Savings</th>
                    <th className="px-6 py-3.5 text-right font-bold text-gray-600 uppercase">% of All-Time</th>
                    <th className="px-6 py-3.5 text-center font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyData.slice().reverse().map((m, i) => {
                    const isCurrent = m.month === currentMonthStr;
                    const pct = allTimeTotalSavings > 0 ? ((m.savings / allTimeTotalSavings) * 100).toFixed(1) : '0';

                    return (
                      <tr 
                        key={i} 
                        className={`hover:bg-blue-50/40 transition-colors ${isCurrent ? 'bg-emerald-50/40 font-semibold' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 ${isCurrent ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <div>
                              <div className="text-sm font-bold text-gray-900">{m.label}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{m.month}</div>
                            </div>
                            {isCurrent && (
                              <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Current Month
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                            {m.count} idea{m.count !== 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-blue-700 font-medium">
                          ${m.individualSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-purple-700 font-medium">
                          ${m.groupSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-extrabold text-emerald-700">
                            ${m.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-700">
                          {pct}%
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedMonth(m.month);
                              setActiveView('overview');
                            }}
                            className="text-xs text-[#337AB7] hover:underline font-bold"
                          >
                            View Log →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DEPARTMENT-WISE VIEW */}
      {activeView === 'department' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Breakdown Chart */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Savings Share by Department
                </h3>
                <p className="text-xs text-gray-500 mb-4">Proportion of total continuous improvement savings.</p>
                
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        dataKey="savings"
                        nameKey="department"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2 text-[11px]">
                {departmentData.slice(0, 4).map((d, idx) => (
                  <div key={d.department} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-semibold text-gray-700">{d.department}:</span>
                    <span className="text-gray-500">${(d.savings).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Performance Table */}
            <div className="lg:col-span-2 bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">Department Performance Rankings</h3>
                <span className="text-xs text-gray-500">All-Time Statistics</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Department</th>
                      <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Initiatives</th>
                      <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase">Total Savings</th>
                      <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase">Share</th>
                      <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Top Contributor</th>
                      <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentData.map((d, i) => {
                      const share = allTimeTotalSavings > 0 ? ((d.savings / allTimeTotalSavings) * 100).toFixed(1) : '0';

                      return (
                        <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                #{i + 1}
                              </span>
                              <span className="font-bold text-sm text-gray-900">{d.department}</span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center font-semibold text-gray-700">
                            {d.count}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-emerald-700 text-sm">
                            ${d.savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right font-semibold text-gray-600">
                            {share}%
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-gray-800 font-medium truncate max-w-[140px]">
                            {d.topContributor || '-'}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <button
                              onClick={() => {
                                setSelectedDepartment(d.department);
                                setSelectedMonth('All');
                                setActiveView('overview');
                              }}
                              className="text-xs text-purple-700 hover:underline font-bold"
                            >
                              Filter →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                <span>Total Departments with logged initiatives: {departmentData.length}</span>
                <span className="font-bold text-gray-700">Total: ${allTimeTotalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: INDIVIDUAL EMPLOYEES DIRECTORY LEADERBOARD */}
      {activeView === 'employee' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Individual Employee Directory Innovation Leaderboard
                </h3>
                <p className="text-xs text-gray-500">Linked directly to the master Employee Directory list.</p>
              </div>

              <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                👤 {employeeLeaderboard.length} Active Staff Recognized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Rank & Employee (Directory Linked)</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Individual Ideas</th>
                    <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Group Circles</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase">Highest Single Saving</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase">Total Individual Value</th>
                    <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employeeLeaderboard.map((emp, i) => {
                    return (
                      <tr key={i} className={`hover:bg-blue-50/30 transition-colors ${i === 0 ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm ${
                              i === 0 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' :
                              i === 1 ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-200' :
                              i === 2 ? 'bg-amber-700 text-amber-50 ring-2 ring-amber-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                {emp.name}
                                {i === 0 && <span className="text-amber-500">👑</span>}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono">
                                ID: {emp.id} {emp.designation ? `• ${emp.designation}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
                            {emp.department || 'General'}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                            {emp.individualCount}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-100">
                            {emp.groupCount}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right font-semibold text-gray-700">
                          ${emp.highestSaving.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-extrabold text-emerald-700">
                            ${emp.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setSelectedMonth('All');
                              setActiveView('overview');
                            }}
                            className="text-xs text-[#337AB7] hover:underline font-bold"
                          >
                            View Records →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {employeeLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        No individual employee innovation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: GROUP / TEAM CIRCLES LEADERBOARD */}
      {activeView === 'teams' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E6E9ED] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Group & Team Innovation Circles Leaderboard
                </h3>
                <p className="text-xs text-gray-500">Team initiatives, Kaizen circles, and cross-functional groups.</p>
              </div>

              <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                👥 {groupLeaderboard.length} Innovation Teams
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Rank & Group / Team Name</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Department</th>
                    <th className="px-5 py-3 text-left font-bold text-gray-600 uppercase">Participating Members (Directory Linked)</th>
                    <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Team Initiatives</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-600 uppercase">Total Team Savings</th>
                    <th className="px-5 py-3 text-center font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupLeaderboard.map((team, i) => {
                    return (
                      <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm ${
                              i === 0 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                              #{i + 1}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                {team.groupName}
                              </div>
                              <div className="text-[11px] text-purple-600 font-medium">
                                Cross-Functional Kaizen Circle
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
                            {team.department || 'General'}
                          </span>
                        </td>

                        <td className="px-5 py-4 max-w-sm">
                          <div className="flex flex-wrap gap-1">
                            {team.members.map(m => (
                              <span key={m.id} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                <span className="font-bold">{m.name}</span>
                                <span className="text-slate-400 font-mono text-[9px]">({m.id})</span>
                              </span>
                            ))}
                            {team.members.length === 0 && <span className="text-gray-400">Team members not specified</span>}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-100">
                            {team.count} Project{team.count !== 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-extrabold text-emerald-700">
                            ${team.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedContributorType('group');
                              setSearchQuery(team.groupName);
                              setSelectedMonth('All');
                              setActiveView('overview');
                            }}
                            className="text-xs text-purple-700 hover:underline font-bold"
                          >
                            View Projects →
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {groupLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No group or team innovation circles logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG / EDIT BEST PRACTICE (SUPPORTING INDIVIDUAL EMPLOYEE & GROUP OPTIONS) */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#2A3F54] to-[#337AB7] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-300" />
                  {editingId ? 'Edit Best Practice Record' : 'Log New Best Practice & Cost Saving'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Record innovative ideas, process improvements, and verified cost savings.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* CONTRIBUTOR TYPE SELECTOR (2 OPTIONS: INDIVIDUAL EMPLOYEES & GROUP) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Contributor Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setContributorType('individual')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      contributorType === 'individual'
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full ${contributorType === 'individual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Individual Employee</div>
                      <div className="text-[11px] text-gray-500">As per Employee Directory List</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContributorType('group')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      contributorType === 'group'
                        ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full ${contributorType === 'group' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Group / Team Innovation</div>
                      <div className="text-[11px] text-gray-500">Team with multiple Directory staff</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* DATE & DEPARTMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Date Logged *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    list="modal-dept-list"
                    value={formDepartment}
                    onChange={e => setFormDepartment(e.target.value)}
                    placeholder="e.g. Production, Quality, Maintenance"
                    className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                  <datalist id="modal-dept-list">
                    {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </datalist>
                </div>
              </div>

              {/* OPTION 1: INDIVIDUAL EMPLOYEE SECTION (DIRECTLY AS PER EMPLOYEE DIRECTORY) */}
              {contributorType === 'individual' ? (
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Select Individual Employee (From Employee Directory)
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Search or Pick Employee ID *
                    </label>
                    <input
                      type="text"
                      list="modal-emp-directory-list"
                      required
                      placeholder="Type ID (e.g. EMP001) or Name..."
                      value={formEmployeeId}
                      onChange={e => handleIndividualSelect(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <datalist id="modal-emp-directory-list">
                      {authorizedEmployees.map((emp, idx) => (
                        <option key={`${emp[0]}-${idx}`} value={emp[0]}>{emp[0]} - {emp[1]} ({emp[3]} • {emp[2]})</option>
                      ))}
                    </datalist>
                  </div>

                  {/* Auto-resolved Employee Card */}
                  {formEmployeeName && (
                    <div className="bg-white p-3 rounded-md border border-blue-200 flex items-center justify-between text-xs shadow-xs">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{formEmployeeName}</div>
                        <div className="text-gray-500 font-mono text-[11px] mt-0.5">
                          ID: {formEmployeeId} {formDesignation ? `• ${formDesignation}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {formDepartment || 'Employee Directory Match'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* OPTION 2: GROUP / TEAM INNOVATION SECTION */
                <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Users className="w-4 h-4 text-purple-600" />
                    Group / Team Details & Directory Members
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Group / Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Line 1 Kaizen Circle, SMT Efficiency Squad, Maintenance Taskforce"
                      value={formGroupName}
                      onChange={e => setFormGroupName(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    />
                  </div>

                  {/* Add Group Members from Employee Directory */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Add Team Members from Employee Directory *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        list="modal-group-members-picker"
                        placeholder="Search employee by ID or Name to add to group..."
                        value={memberSearchInput}
                        onChange={e => setMemberSearchInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddGroupMember(memberSearchInput);
                          }
                        }}
                        className="flex-1 text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                      />
                      <datalist id="modal-group-members-picker">
                        {authorizedEmployees.map((emp, idx) => (
                          <option key={`${emp[0]}-${idx}`} value={emp[0]}>{emp[0]} - {emp[1]} ({emp[3]})</option>
                        ))}
                      </datalist>

                      <button
                        type="button"
                        onClick={() => handleAddGroupMember(memberSearchInput)}
                        className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Selected Group Members Chips */}
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                      Participating Team Members ({groupMembers.length}):
                    </div>
                    {groupMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-md border border-purple-200 min-h-[42px] max-h-36 overflow-y-auto">
                        {groupMembers.map(m => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 text-xs bg-purple-50 text-purple-900 border border-purple-200 px-2 py-1 rounded-md"
                          >
                            <span className="font-bold">{m.name}</span>
                            <span className="font-mono text-[10px] text-purple-500">({m.id})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGroupMember(m.id)}
                              className="text-purple-400 hover:text-red-600 ml-1 p-0.5 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-white/70 border border-dashed border-purple-200 rounded-md text-xs text-gray-400 text-center">
                        No team members added yet. Search and select above to add staff from Employee Directory.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SAVINGS IN USD */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Cost Savings (USD) *
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formSavings}
                      onChange={e => setFormSavings(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-bold text-emerald-800 border border-gray-300 rounded-md pl-7 pr-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isRecurring"
                      checked={formIsRecurring}
                      onChange={e => setFormIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-bold text-gray-700 cursor-pointer">
                      Monthly Carry-over (Recurring)
                    </label>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">If selected, the savings value will be carried over to future months automatically.</p>
              </div>

              {/* INNOVATION DETAILS */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Innovation / Continuous Improvement Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDetails}
                  onChange={e => setFormDetails(e.target.value)}
                  placeholder="Describe the problem identified, the solution or continuous improvement technique implemented, and how the cost reduction was measured..."
                  className="w-full text-xs border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#337AB7] hover:bg-[#286090] text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingId ? 'Update Record' : 'Save Best Practice'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Protected Deletion Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Best Practice & Innovation Record"
        itemName={deleteTarget?.name}
        itemDetails={deleteTarget?.details}
        warningMessage="Deleting this best practice innovation record will permanently remove it from the department leaderboard and savings metrics. Enter the Admin Deletion Password to confirm."
        confirmButtonText="Verify & Delete Record"
        onConfirm={handleExecuteConfirmedDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

