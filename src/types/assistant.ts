import { UserSecurityScope } from '../lib/security';

export interface AssistantKpiCard {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'purple';
}

export interface AssistantTableData {
  headers: string[];
  rows: (string | number)[][];
}

export interface AssistantNavigatorAction {
  navigatorId: string;
  navigatorName: string;
  label: string;
  category?: string;
}

export interface AssistantActionRequest {
  actionId: string;
  actionType: 'navigate' | 'confirm_operation' | 'export_report' | 'refresh_data';
  title: string;
  description: string;
  payload?: any;
  requiresConfirmation?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  speechText?: string;
  timestamp: string;
  suggestions?: string[];
  navigators?: AssistantNavigatorAction[];
  kpiCards?: AssistantKpiCard[];
  table?: AssistantTableData;
  actionRequest?: AssistantActionRequest;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  isSpoken?: boolean;
  isError?: boolean;
}

export interface AssistantContextState {
  lastTopic?: 'production' | 'breakdown' | 'manpower' | 'leave' | 'tasks' | 'kpi' | 'employees' | '5s' | 'general';
  lastDepartment?: string;
  lastDate?: string;
  lastEntityId?: string;
  lastQuery?: string;
  activeProfileId?: string;
}

export interface AssistantProfile {
  id: string;
  name: string;
  title: string;
  role: string;
  departmentFocus: string;
  gender: 'female' | 'male';
  avatarUrl: string;
  auraColor: string; // e.g., 'indigo', 'cyan', 'rose', 'amber', 'teal'
  badgeBg: string;
  specialty: string;
  bio: string;
  tone: string;
  speechRate: number;
  speechPitch: number;
  quickActivities: string[];
  suggestedPrompts: string[];
  sampleGreeting: string;
  badgeText: string;
}

export interface SmartActivity {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'operations' | 'maintenance' | 'workforce' | 'lean' | 'tasks';
  icon: string;
  badge: string;
  badgeColor: string;
  recommendedProfileId: string;
  estimatedSecs: number;
  triggerPrompt: string;
  isAutomated?: boolean;
}

export const ASSISTANT_PROFILES: AssistantProfile[] = [
  {
    id: 'samia-executive',
    name: 'Samia Rahman',
    title: 'Executive Operations Lead',
    role: 'Operations Co-Pilot & Executive Advisor',
    departmentFocus: 'Plant-Wide Operations & Strategy',
    gender: 'female',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    auraColor: 'indigo',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    badgeText: 'Master Co-Pilot',
    specialty: 'Executive Briefings, Cross-Department Health Checks, OEE & Daily Standup',
    bio: 'Coordinates all manufacturing operations, tracks strategic plant KPIs, and provides high-level executive summaries.',
    tone: 'Executive, precise, confident, data-driven, solution-oriented',
    speechRate: 1.0,
    speechPitch: 1.05,
    quickActivities: ['act-daily-briefing', 'act-plant-health', 'act-shift-handover'],
    suggestedPrompts: [
      "Run Today's Executive Management Briefing",
      "What is our plant operational status today?",
      "Compare Day Shift vs Night Shift manpower",
      "Show all overdue critical tasks across departments"
    ],
    sampleGreeting: "Hello! I am Samia Rahman, your Executive Operations Lead. Ready to review factory KPIs and optimize today's workflow."
  },
  {
    id: 'rahim-maintenance',
    name: 'Engr. Rahim Chowdhury',
    title: 'Equipment & Maintenance Engineer',
    role: 'Shop-Floor Diagnostics & Reliability Specialist',
    departmentFocus: 'Maintenance, Tooling & Machine Capacity',
    gender: 'male',
    avatarUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&auto=format&fit=crop&q=80',
    auraColor: 'cyan',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    badgeText: 'Reliability Engineer',
    specialty: 'Machine Breakdown Triage, MTTR/MTBF, 5-Why Diagnostics, Preventive Maintenance',
    bio: 'Guards factory uptime. Pinpoints mechanical & electrical faults, conducts root cause analyses, and tracks breakdown recovery.',
    tone: 'Engineering-focused, urgent regarding downtime, safety-first, analytical',
    speechRate: 1.02,
    speechPitch: 0.96,
    quickActivities: ['act-breakdown-triage', 'act-5why-diagnosis', 'act-pm-schedule'],
    suggestedPrompts: [
      "Are there any active machine breakdowns right now?",
      "Which machines had highest downtime this week?",
      "Start an emergency 5-Why root cause diagnosis",
      "Show maintenance status for production lines"
    ],
    sampleGreeting: "Assalamu Alaikum, I'm Engr. Rahim. Let's inspect machine capacity, resolve active downtime, and prevent failures."
  },
  {
    id: 'farhana-workforce',
    name: 'Farhana Akter',
    title: 'Workforce & HR Operations Partner',
    role: 'People, Shift Rosters & Skill Matrix Lead',
    departmentFocus: 'Human Resources & Workforce Planning',
    gender: 'female',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    auraColor: 'rose',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    badgeText: 'Workforce Specialist',
    specialty: 'Attendance Roster, Leave Management, Operator Skill Matrix, Manpower Balance',
    bio: 'Dedicated to manpower optimization, leave processing, multi-skill matrix training, and employee engagement.',
    tone: 'Empathetic, structured, supportive, compliance-oriented, clear',
    speechRate: 0.98,
    speechPitch: 1.12,
    quickActivities: ['act-manpower-check', 'act-leave-status', 'act-skill-matrix'],
    suggestedPrompts: [
      "Who is on leave or absent today?",
      "Check shift manpower distribution across lines",
      "What is my personal leave balance?",
      "Show operators with Multi-Skill certification"
    ],
    sampleGreeting: "Greetings! I'm Farhana Akter. I can assist with team rosters, leave approvals, and workforce skill development."
  },
  {
    id: 'tariq-lean',
    name: 'Tariq Hasan',
    title: 'TPS Lean & 5S Master Assessor',
    role: 'Continuous Improvement & Gemba Specialist',
    departmentFocus: 'Lean Manufacturing, Quality & 5S Visuals',
    gender: 'male',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    auraColor: 'amber',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    badgeText: '5S Master Assessor',
    specialty: 'Gemba Walk Audits, 5S Visual Standards, Muda/Waste Elimination, Kaizen',
    bio: 'Champions shop-floor visual standards, conducts Gemba walks, identifies production bottlenecks and eliminates Muda.',
    tone: 'Disciplined, observant, Kaizen-driven, methodical, practical',
    speechRate: 1.0,
    speechPitch: 0.98,
    quickActivities: ['act-gemba-walk', 'act-5s-checklist', 'act-muda-reduction'],
    suggestedPrompts: [
      "Review shop-floor 5S visual standards",
      "Generate a Gemba walk observation report",
      "Identify areas with suspected Muda (Waste)",
      "Open 5S & Visual Management module"
    ],
    sampleGreeting: "Hello! I am Tariq Hasan. Let's walk the shop-floor, eliminate waste, and elevate our 5S workplace standards."
  },
  {
    id: 'ayesha-tasks',
    name: 'Ayesha Siddiqa',
    title: 'Workflow Dispatch & Compliance Officer',
    role: 'Task Watchdog, Deadlines & SOP Compliance',
    departmentFocus: 'Task Management, Audits & Dispatch',
    gender: 'female',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    auraColor: 'teal',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    badgeText: 'Task Dispatcher',
    specialty: 'Daily Task Escalations, SOP Verification, Audit Logging, Shift Handover',
    bio: 'Monitors pending deadlines, dispatches alerts for overdue tasks, and ensures SOP procedural compliance.',
    tone: 'Prompt, organized, meticulous, action-driven, vigilant',
    speechRate: 1.03,
    speechPitch: 1.08,
    quickActivities: ['act-overdue-tasks', 'act-shift-handover', 'act-audit-review'],
    suggestedPrompts: [
      "Show all overdue and critical tasks",
      "Which tasks are assigned to me for today?",
      "Generate shift handover task summary",
      "Check recent assistant audit activity"
    ],
    sampleGreeting: "Hi there! I'm Ayesha Siddiqa. I'll help you stay on top of critical deliverables, deadlines, and task completions."
  }
];

export const SMART_ACTIVITIES_CATALOG: SmartActivity[] = [
  {
    id: 'act-daily-briefing',
    title: 'Executive Shift Briefing',
    subtitle: 'High-level 360° factory overview',
    description: 'Scans attendance, open breakdowns, critical tasks, and factory KPIs to build a concise executive briefing.',
    category: 'operations',
    icon: 'SunMedium',
    badge: 'Proactive Briefing',
    badgeColor: 'indigo',
    recommendedProfileId: 'samia-executive',
    estimatedSecs: 3,
    triggerPrompt: "Run Today's Executive Management Briefing"
  },
  {
    id: 'act-breakdown-triage',
    title: 'Machine Breakdown Live Triage',
    subtitle: 'Immediate downtime & equipment inspection',
    description: 'Audits active and recent machine breakdown logs, flags prolonged downtime lines, and checks technician assignments.',
    category: 'maintenance',
    icon: 'AlertTriangle',
    badge: 'Urgent Diagnostic',
    badgeColor: 'rose',
    recommendedProfileId: 'rahim-maintenance',
    estimatedSecs: 2,
    triggerPrompt: "Are there any active machine breakdowns right now?"
  },
  {
    id: 'act-manpower-check',
    title: 'Shift Manpower & Absence Diagnostic',
    subtitle: 'Roster & shift balance evaluation',
    description: 'Checks employee attendance, calculates active leaves today, and inspects Day vs Night shift balance.',
    category: 'workforce',
    icon: 'Users',
    badge: 'Workforce Audit',
    badgeColor: 'rose',
    recommendedProfileId: 'farhana-workforce',
    estimatedSecs: 2,
    triggerPrompt: "Who in my team is absent or on leave today?"
  },
  {
    id: 'act-overdue-tasks',
    title: 'Overdue Task Escalation Watchdog',
    subtitle: 'Identifies stalled or critical items',
    description: 'Scans task register for overdue, high-priority, or blocked tasks, identifying assignees and pending actions.',
    category: 'tasks',
    icon: 'ClockAlert',
    badge: 'Escalation Alert',
    badgeColor: 'amber',
    recommendedProfileId: 'ayesha-tasks',
    estimatedSecs: 2,
    triggerPrompt: "Show all overdue and critical tasks"
  },
  {
    id: 'act-5why-diagnosis',
    title: 'Interactive 5-Why Root Cause Diagnosis',
    subtitle: 'Root cause analysis for equipment or quality defects',
    description: 'Launches a guided 5-Why analysis to uncover the systemic root cause and formulate permanent countermeasures.',
    category: 'maintenance',
    icon: 'Sparkles',
    badge: 'TPS Lean Tool',
    badgeColor: 'cyan',
    recommendedProfileId: 'rahim-maintenance',
    estimatedSecs: 5,
    triggerPrompt: "Start an emergency 5-Why root cause diagnosis"
  },
  {
    id: 'act-shift-handover',
    title: 'Shift Handover Report Generator',
    subtitle: 'Clean summary for incoming shift supervisor',
    description: 'Compiles active machine states, task progress, and team status into a copyable shift handover note.',
    category: 'operations',
    icon: 'FileText',
    badge: 'Shift Handover',
    badgeColor: 'teal',
    recommendedProfileId: 'samia-executive',
    estimatedSecs: 3,
    triggerPrompt: "Generate a complete shift handover report"
  },
  {
    id: 'act-gemba-walk',
    title: 'Gemba Walk & 5S Standard Audit',
    subtitle: 'Shop-floor observation & visual compliance',
    description: 'Reviews workplace 5S compliance scorecards, safety hazard inspections, and standard visual controls.',
    category: 'lean',
    icon: 'CheckSquare',
    badge: 'Shop-Floor Audit',
    badgeColor: 'amber',
    recommendedProfileId: 'tariq-lean',
    estimatedSecs: 3,
    triggerPrompt: "Review shop-floor 5S visual standards"
  },
  {
    id: 'act-plant-health',
    title: 'Complete Plant Operational Health Check',
    subtitle: 'All-systems multi-module diagnostic',
    description: 'Cross-analyzes Breakdown Logs, Shift Rosters, Daily Tasks, and 5S compliance for a unified operational score.',
    category: 'operations',
    icon: 'Activity',
    badge: 'Comprehensive',
    badgeColor: 'emerald',
    recommendedProfileId: 'samia-executive',
    estimatedSecs: 4,
    triggerPrompt: "Run complete plant operational health check"
  }
];

export type VoiceGenderMode = 'auto' | 'female' | 'male';

export interface AssistantSettings {
  enabled: boolean;
  activeProfileId: string;
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  autoSpeak: boolean;
  speechRate: number; // 0.8 - 1.3 (default 1.0)
  speechPitch: number; // default 1.05
  selectedVoiceURI?: string;
  voiceGender: VoiceGenderMode; // 'auto' (matches persona gender) | 'female' | 'male'
  assistantName: string;
  welcomeMessageCustom?: string;
  languageMode: 'auto' | 'en' | 'bn';
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: true,
  activeProfileId: 'samia-executive',
  voiceInputEnabled: true,
  voiceOutputEnabled: true,
  autoSpeak: false,
  speechRate: 1.0,
  speechPitch: 1.05,
  voiceGender: 'auto',
  assistantName: 'Samia Rahman',
  languageMode: 'auto'
};

export interface AssistantAuditEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  employeeId?: string;
  role: string;
  query: string;
  topic?: string;
  accessedModule?: string;
  actionTaken?: string;
  assistantProfileId?: string;
  status: 'Success' | 'Denied' | 'Error';
}

export type AssistantAuditLogEntry = AssistantAuditEntry;

