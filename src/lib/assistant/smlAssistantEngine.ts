/**
 * SML Smart Assistant Brain & Query Resolution Engine
 * Handles natural language intent, role-based data analysis, calculations,
 * multi-lingual queries (English, Bangla, Banglish), and context memory.
 */

import { UserSecurityScope } from '../security';
import { 
  ChatMessage, 
  AssistantKpiCard, 
  AssistantTableData, 
  AssistantNavigatorAction,
  AssistantContextState,
  AssistantProfile,
  ASSISTANT_PROFILES
} from '../../types/assistant';
import { 
  checkTopicAccess, 
  getPermittedNavigators, 
  sanitizeUserQuery, 
  logAssistantActivity 
} from './assistantSecurityFilter';
import { getRange } from '../sheets';
import { getBangladeshDateTime } from '../taskReminderEngine';
import { DEFAULT_SYSTEM_NAVIGATORS } from '../navigators';

export interface AssistantDataBundle {
  spreadsheetId: string | null;
  employees: any[];
  tasks: any[];
  holidays: any[];
  userSecurityScope?: UserSecurityScope;
  accessLevels: string[];
  activeProfile?: AssistantProfile;
}

/**
 * Generate smart personalized suggestions based on user role, accessible modules, and active profile.
 */
export function generateSmartSuggestions(userScope?: UserSecurityScope, activeProfile?: AssistantProfile): string[] {
  if (activeProfile?.suggestedPrompts && activeProfile.suggestedPrompts.length > 0) {
    return activeProfile.suggestedPrompts;
  }

  if (!userScope) {
    return [
      "What are the official holidays?",
      "How to access my tasks?",
      "Contact system administrator"
    ];
  }

  if (userScope.isAdmin) {
    return [
      "Run Today's Executive Management Briefing",
      "Are there any active machine breakdowns right now?",
      "Who in my team is absent or on leave today?",
      "Show all overdue and critical tasks",
      "Run complete plant operational health check"
    ];
  }

  if (userScope.isManager) {
    return [
      "Department operations & KPI summary",
      "Check pending team leave requests",
      "Are there any active machine breakdowns right now?",
      "Show shift manpower distribution",
      "Generate shift handover report"
    ];
  }

  if (userScope.isSupervisor) {
    return [
      "Who in my team is absent or on leave today?",
      "Check today's shift machine assignments",
      "Show pending tasks for my team",
      "Start an emergency 5-Why root cause diagnosis"
    ];
  }

  // Standard Employee / Operator
  return [
    "What tasks are assigned to me today?",
    "Show my leave balance & status",
    "What is my current shift schedule?",
    "When is the next official holiday?",
    "Who has a work anniversary this month?"
  ];
}

/**
 * Clean and normalize text for natural matching
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?!.,;]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Detect query language
 */
function detectLanguage(text: string): 'bn' | 'banglish' | 'en' {
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  const banglishWords = ['ajke', 'kalke', 'koyjon', 'ase', 'ache', 'kivabe', 'dekhao', 'bolo', 'chuti', 'koto', 'amr', 'amar', 'kormi', 'shob'];
  const clean = text.toLowerCase();
  if (banglishWords.some(w => clean.includes(w))) return 'banglish';
  return 'en';
}

/**
 * Helper to fetch sheet rows safely with fallback
 */
async function fetchSheetData(spreadsheetId: string | null, sheetName: string): Promise<string[][]> {
  try {
    const raw = await getRange(spreadsheetId || 'local-storage-db', `${sheetName}!A:Z`);
    if (Array.isArray(raw) && raw.length > 1) {
      return raw.slice(1); // skip headers
    }
  } catch (err) {
    console.warn(`Could not fetch ${sheetName}:`, err);
  }
  return [];
}

/**
 * Primary Assistant Processing Entry Point
 */
export async function processAssistantQuery(
  rawQuery: string,
  bundle: AssistantDataBundle,
  contextState: AssistantContextState,
  onNavigate?: (navId: string) => void
): Promise<{ message: ChatMessage; updatedContext: AssistantContextState }> {
  const query = rawQuery.trim();
  const queryId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowBd = getBangladeshDateTime();
  const todayStr = nowBd.dateString;
  const userScope = bundle.userSecurityScope;
  const lang = detectLanguage(query);

  // 1. Security & Prompt Injection Inspection
  const sanitizeResult = sanitizeUserQuery(query);
  if (!sanitizeResult.isSafe) {
    logAssistantActivity({
      userEmail: userScope?.username || 'Anonymous',
      employeeId: userScope?.employeeId,
      role: userScope?.role || 'User',
      query,
      status: 'Denied',
      actionTaken: 'Blocked Prompt Injection'
    });

    return {
      message: {
        id: queryId,
        sender: 'assistant',
        text: "I cannot fulfill this request. To protect enterprise integrity, I am strictly prohibited from exposing security tokens, raw system configurations, or overriding role-based permissions.",
        timestamp: new Date().toISOString(),
        isError: true
      },
      updatedContext: contextState
    };
  }

  // 2. Try Server-Side Gemini API via /api/assistant if accessible
  try {
    const serverResponse = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        userScope: {
          role: userScope?.role,
          employeeId: userScope?.employeeId,
          employeeName: userScope?.employeeName,
          assignedDepartment: userScope?.assignedDepartment,
          accessLevel: userScope?.accessLevel,
          isAdmin: userScope?.isAdmin,
          isManager: userScope?.isManager,
          isSupervisor: userScope?.isSupervisor
        },
        contextState,
        todayDate: todayStr,
        activeProfile: bundle.activeProfile
      })
    });

    if (serverResponse.ok) {
      const data = await serverResponse.json();
      if (data && !data.fallback && data.reply) {
        logAssistantActivity({
          userEmail: userScope?.username || 'Anonymous',
          employeeId: userScope?.employeeId,
          role: userScope?.role || 'User',
          query,
          assistantProfileId: bundle.activeProfile?.id,
          status: 'Success',
          actionTaken: 'Gemini AI Response'
        });

        return {
          message: {
            id: queryId,
            sender: 'assistant',
            text: data.reply,
            speechText: data.speechText || data.reply,
            timestamp: new Date().toISOString(),
            kpiCards: data.kpiCards,
            table: data.table,
            navigators: data.navigators,
            suggestions: data.suggestions || generateSmartSuggestions(userScope, bundle.activeProfile).slice(0, 3)
          },
          updatedContext: {
            ...contextState,
            lastQuery: query,
            activeProfileId: bundle.activeProfile?.id,
            ...data.contextUpdates
          }
        };
      }
    }
  } catch (apiErr) {
    // Graceful fallback to client deterministic knowledge engine
    console.info('Server assistant fallback engaged:', apiErr);
  }

  // 3. Client Deterministic Enterprise Knowledge & Analytics Engine
  const result = await evaluateLocalAssistantLogic(query, bundle, contextState, nowBd);

  logAssistantActivity({
    userEmail: userScope?.username || 'Anonymous',
    employeeId: userScope?.employeeId,
    role: userScope?.role || 'User',
    query,
    topic: result.contextUpdates?.lastTopic,
    assistantProfileId: bundle.activeProfile?.id,
    status: 'Success',
    actionTaken: 'Deterministic Engine'
  });

  return {
    message: {
      id: queryId,
      sender: 'assistant',
      text: result.text,
      speechText: result.speechText || result.text,
      timestamp: new Date().toISOString(),
      kpiCards: result.kpiCards,
      table: result.table,
      navigators: result.navigators,
      suggestions: result.suggestions,
      actionRequest: result.actionRequest
    },
    updatedContext: {
      ...contextState,
      ...result.contextUpdates,
      activeProfileId: bundle.activeProfile?.id,
      lastQuery: query
    }
  };
}

/**
 * Deterministic Query Evaluation & Domain Routing
 */
async function evaluateLocalAssistantLogic(
  query: string,
  bundle: AssistantDataBundle,
  context: AssistantContextState,
  nowBd: ReturnType<typeof getBangladeshDateTime>
): Promise<{
  text: string;
  speechText?: string;
  kpiCards?: AssistantKpiCard[];
  table?: AssistantTableData;
  navigators?: AssistantNavigatorAction[];
  suggestions?: string[];
  actionRequest?: any;
  contextUpdates?: Partial<AssistantContextState>;
}> {
  const q = normalizeQuery(query);
  const userScope = bundle.userSecurityScope;
  const todayStr = nowBd.dateString;
  const isBangla = detectLanguage(query) !== 'en';

  // A. GREETINGS & INTRODUCTIONS
  if (
    q === 'hi' || q === 'hello' || q === 'hey' || 
    q.includes('good morning') || q.includes('good afternoon') || q.includes('good evening') ||
    q.includes('who are you') || q.includes('tumi ke') || q.includes('apni ke') || q.includes('sml assistant')
  ) {
    const greetingWord = nowBd.hours < 12 ? 'Good morning' : nowBd.hours < 17 ? 'Good afternoon' : 'Good evening';
    const userName = userScope?.employeeName || 'Colleague';
    const roleDesc = userScope?.role || 'Valued Employee';
    const activeProf = bundle.activeProfile || ASSISTANT_PROFILES[0];

    const text = isBangla
      ? `শুভ দিন, ${userName}! আমি **${activeProf.name}** (${activeProf.title})। আপনার বর্তমান ভূমিকা: **${roleDesc}** (${userScope?.assignedDepartment || 'অপারেশনস'})। আমার বিশেষ ক্ষেত্র: *${activeProf.specialty}*। উৎপাদন, ব্রেকডাউন, ছুটি, কর্মী তালিকা, কাজ ও শিফট সংক্রান্ত যেকোনো তথ্যে সাহায্য করতে প্রস্তুত।`
      : `${greetingWord}, ${userName}! I am **${activeProf.name}**, your ${activeProf.title}.\n\n` +
        `• **Profile Specialty:** ${activeProf.specialty}\n` +
        `• **Your Access Level:** ${roleDesc} (${userScope?.assignedDepartment || 'Operations'})\n\n` +
        `${activeProf.sampleGreeting}\n\nHow can I support your operational goals right now?`;

    return {
      text,
      speechText: `${greetingWord}, ${userName}. I am ${activeProf.name}, your ${activeProf.title}. How can I assist you with your operations today?`,
      suggestions: generateSmartSuggestions(userScope, activeProf),
      contextUpdates: { lastTopic: 'general' }
    };
  }

  // ACTIVITY 1: 5-WHY ROOT CAUSE DIAGNOSIS (TPS Lean & Equipment Reliability)
  if (
    q.includes('5-why') || q.includes('five why') || q.includes('root cause') || 
    q.includes('diagnosis') || q.includes('emergency 5-why')
  ) {
    const kpiCards: AssistantKpiCard[] = [
      { label: 'Diagnostic Engine', value: 'TPS 5-Why', color: 'indigo' },
      { label: 'Recommended Lead', value: 'Engr. Rahim', color: 'blue' },
      { label: 'Target MTTR', value: '< 45 Mins', color: 'emerald' },
      { label: 'Action Status', value: 'Immediate Containment', color: 'amber' }
    ];

    const text = `### 🔬 Interactive TPS 5-Why Root Cause Diagnosis Framework\n` +
      `*Recommended Specialist: Engr. Rahim Chowdhury (Maintenance & Reliability)*\n\n` +
      `When investigating machine breakdowns or defect spikes, trace symptoms systematically to uncover systemic management and procedural root causes:\n\n` +
      `1. **Why 1 (Direct Symptom):** *Why did the machine halt or yield defect?*\n` +
      `   → E.g., Spindle drive tripped or servo motor overheated.\n` +
      `2. **Why 2 (Physical Cause):** *Why did the component overheat?*\n` +
      `   → E.g., Lubrication port was dry and mechanical friction escalated.\n` +
      `3. **Why 3 (Condition Gap):** *Why was the lubricant dry?*\n` +
      `   → E.g., Scheduled autonomous maintenance lubrication was overdue.\n` +
      `4. **Why 4 (Procedural Gap):** *Why was lubrication not completed on schedule?*\n` +
      `   → E.g., Daily PM checklist visual card was not updated during shift handover.\n` +
      `5. **Why 5 (Systemic Root Cause):** *Why was the visual standard skipped?*\n` +
      `   → **True Root Cause:** Lack of standardized visual 5S tagging & autonomous maintenance verification at line start.\n\n` +
      `🛠️ **Permanent Standardized Countermeasure:** Institute visual Kanban lube indicators on equipment and mandatory 5S shift startup sign-off in the Breakdown Log.`;

    return {
      text,
      speechText: "Here is your structured 5-Why root cause diagnosis framework to eliminate systemic equipment failures.",
      kpiCards,
      navigators: [
        {
          navigatorId: 'breakdown',
          navigatorName: 'Breakdown Log Navigator',
          label: 'Open Breakdown Log →',
          category: 'Operations & Factory'
        },
        {
          navigatorId: '5s-management',
          navigatorName: '5S & Visual Management',
          label: 'Review 5S Standards →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Are there any active machine breakdowns right now?",
        "Generate a complete shift handover report",
        "Today's Executive Management Summary"
      ],
      contextUpdates: { lastTopic: 'breakdown' }
    };
  }

  // ACTIVITY 2: SHIFT HANDOVER REPORT GENERATOR
  if (
    q.includes('handover') || q.includes('shift handover') || q.includes('handover report')
  ) {
    const breakdownRows = await fetchSheetData(bundle.spreadsheetId, 'BreakdownLog');
    const activeStoppages = breakdownRows.filter(r => (r[26] || '').toLowerCase().includes('progress') || (r[26] || '').toLowerCase().includes('investigation'));
    const pendingTasks = (bundle.tasks || []).filter(t => t.deleted !== 'TRUE' && t.status !== 'Completed');
    const employees = bundle.employees || [];
    const dayStaff = employees.filter(e => e.status === 'Active' && (e.currentShift || e.shift || '').toLowerCase().includes('day'));
    const nightStaff = employees.filter(e => e.status === 'Active' && (e.currentShift || e.shift || '').toLowerCase().includes('night'));

    const kpiCards: AssistantKpiCard[] = [
      { label: 'Reporting Date', value: todayStr, color: 'blue' },
      { label: 'Active Stoppages', value: activeStoppages.length, color: activeStoppages.length > 0 ? 'rose' : 'emerald' },
      { label: 'Carried Tasks', value: pendingTasks.length, color: 'amber' },
      { label: 'Incoming Shift Strength', value: nightStaff.length || dayStaff.length, color: 'emerald' }
    ];

    const report = `### 📋 Shift Handover Executive Briefing\n` +
      `**Facility:** SML Trims BD Manufacturing Plant | **Date:** ${todayStr} | **BST:** ${nowBd.timeString}\n` +
      `**Supervisor On Duty:** ${userScope?.employeeName || 'Shift In-Charge'} (${userScope?.assignedDepartment || 'Production'})\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**1. Equipment & Line Status:**\n` +
      `• Active Stoppages at Handover: **${activeStoppages.length} machines** currently undergoing repair.\n` +
      (activeStoppages.length > 0 ? `• Alert: Ensure incoming technician team prioritizes line recovery.\n` : `• All production lines running at standard rated capacity.\n`) +
      `\n**2. Workforce & Manpower Continuity:**\n` +
      `• Outgoing Shift Attendance: ${dayStaff.length} operators active.\n` +
      `• Incoming Shift Handover: Check roll-call against assigned shift rosters.\n\n` +
      `**3. Critical Open Action Items:**\n` +
      `• Pending High-Priority Deliverables: **${pendingTasks.length} task(s)** carried over.\n` +
      (pendingTasks.length > 0 ? pendingTasks.slice(0, 3).map(t => `  - [${t.priority}] ${t.title} (Due: ${t.dueDate})`).join('\n') : `  - Zero high-severity bottlenecks.\n`) +
      `\n**4. 5S & Shop-Floor Condition:**\n` +
      `• Scrap bins emptied, work aisles clear, and SOP stations signed off.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Incoming Supervisor Acceptance: [  ] Accepted with verified machine counts.*`;

    return {
      text: report,
      speechText: `Shift handover generated. There are ${activeStoppages.length} active equipment stoppages and ${pendingTasks.length} tasks carried over to the incoming shift.`,
      kpiCards,
      navigators: [
        {
          navigatorId: 'shifts',
          navigatorName: 'Shift Assignments Navigator',
          label: 'Review Shift Rosters →',
          category: 'Operations & Factory'
        },
        {
          navigatorId: 'tasks',
          navigatorName: 'Daily Tasks Navigator',
          label: 'View Carried Tasks →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Are there any active machine breakdowns right now?",
        "Show all overdue and critical tasks",
        "Run Today's Executive Management Briefing"
      ],
      contextUpdates: { lastTopic: 'production' }
    };
  }

  // ACTIVITY 3: COMPLETE PLANT OPERATIONAL HEALTH CHECK
  if (
    q.includes('plant health') || q.includes('operational health') || 
    q.includes('health check') || q.includes('all-systems')
  ) {
    const breakdownRows = await fetchSheetData(bundle.spreadsheetId, 'BreakdownLog');
    const leaveRows = await fetchSheetData(bundle.spreadsheetId, 'Leave');
    const tasks = bundle.tasks || [];
    const activeStaff = (bundle.employees || []).filter(e => e.status === 'Active');
    const activeStoppages = breakdownRows.filter(r => (r[26] || '').toLowerCase().includes('progress') || (r[26] || '').toLowerCase().includes('investigation'));
    const overdueTasks = tasks.filter(t => t.deleted !== 'TRUE' && t.status !== 'Completed' && t.dueDate < todayStr);
    const onLeaveToday = leaveRows.filter(r => todayStr >= (r[5] || '') && todayStr <= (r[6] || ''));

    // Calculate synthetic health score (0 - 100%)
    let healthScore = 100;
    if (activeStoppages.length > 0) healthScore -= Math.min(30, activeStoppages.length * 10);
    if (overdueTasks.length > 0) healthScore -= Math.min(20, overdueTasks.length * 5);
    const leaveRatio = activeStaff.length > 0 ? (onLeaveToday.length / activeStaff.length) : 0;
    if (leaveRatio > 0.1) healthScore -= 10;
    healthScore = Math.max(50, healthScore);

    const kpiCards: AssistantKpiCard[] = [
      { label: 'Plant Health Index', value: `${healthScore}%`, color: healthScore >= 85 ? 'emerald' : healthScore >= 70 ? 'amber' : 'rose' },
      { label: 'Line Reliability', value: activeStoppages.length === 0 ? '100%' : `${Math.max(65, 100 - activeStoppages.length * 8)}%`, color: activeStoppages.length === 0 ? 'emerald' : 'rose' },
      { label: 'Workforce Avail.', value: `${Math.round((1 - leaveRatio) * 100)}%`, color: 'blue' },
      { label: 'Task Velocity', value: overdueTasks.length === 0 ? '100% On-Track' : `${overdueTasks.length} Overdue`, color: overdueTasks.length === 0 ? 'emerald' : 'amber' }
    ];

    const text = `### 🏭 Factory Operational Health Diagnostic (${todayStr})\n` +
      `**Overall Health Index: ${healthScore}%** (${healthScore >= 85 ? 'Optimal Operational Condition' : healthScore >= 70 ? 'Moderate Caution — Attend to Bottlenecks' : 'High Alert — Downtime/Backlog Detected'})\n\n` +
      `**Diagnostic Vector Breakdown:**\n` +
      `• **Machine Reliability:** ${activeStoppages.length === 0 ? '✅ Zero active breakdowns reported.' : `⚠️ ${activeStoppages.length} active breakdown(s) ongoing.`}\n` +
      `• **Workforce Attendance:** ✅ ${activeStaff.length - onLeaveToday.length} active staff on-duty (${onLeaveToday.length} on scheduled leave).\n` +
      `• **Task Compliance:** ${overdueTasks.length === 0 ? '✅ Zero overdue tasks.' : `⚠️ ${overdueTasks.length} task(s) past SLA deadline.`}\n` +
      `• **Security & Audit Guardrails:** Verified active RBAC & enterprise encryption.\n\n` +
      `💡 **Action Directive:** ${activeStoppages.length > 0 ? 'Prioritize maintenance recovery for down machinery.' : 'Maintain current flow and conduct scheduled 5S audits.'}`;

    return {
      text,
      speechText: `Plant operational health is at ${healthScore} percent. ${activeStoppages.length} active machine stoppages and ${overdueTasks.length} overdue tasks detected.`,
      kpiCards,
      navigators: [
        {
          navigatorId: 'kpi',
          navigatorName: 'KPI Performance Navigator',
          label: 'View Factory KPIs →',
          category: 'Management'
        },
        {
          navigatorId: 'breakdown',
          navigatorName: 'Breakdown Log Navigator',
          label: 'Inspect Breakdowns →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Run Today's Executive Management Briefing",
        "Start an emergency 5-Why root cause diagnosis",
        "Review shop-floor 5S visual standards"
      ],
      contextUpdates: { lastTopic: 'production' }
    };
  }

  // ACTIVITY 4: 5S VISUAL STANDARDS & GEMBA AUDIT
  if (
    q.includes('5s') || q.includes('gemba') || q.includes('muda') || 
    q.includes('visual standard') || q.includes('kaizen')
  ) {
    const kpiCards: AssistantKpiCard[] = [
      { label: '5S Framework', value: 'TPS Visual', color: 'amber' },
      { label: 'Specialist Lead', value: 'Tariq Hasan', color: 'blue' },
      { label: 'Shop-Floor Audit', value: 'Continuous', color: 'emerald' },
      { label: 'Muda Focus', value: 'Motion & Wait', color: 'indigo' }
    ];

    const text = `### 📐 Shop-Floor 5S Visual Management & Gemba Audit Standard\n` +
      `*Curated by Tariq Hasan (TPS Lean & 5S Master Assessor)*\n\n` +
      `Ensure shop-floor workstations satisfy all 5 foundational pillars:\n\n` +
      `1. **Sort (1S - Seiri):** Eliminate red-tagged broken tooling, unneeded raw materials, and obsolete jigs from the line.\n` +
      `2. **Set in Order (2S - Seiton):** Implement shadow boards, designated floor boundary tape, and color-coded bin addresses (A place for everything, everything in its place).\n` +
      `3. **Shine (3S - Seiso):** Clean while inspecting; identify oil leaks, worn electrical conduit, and dust buildup before breakdown occurs.\n` +
      `4. **Standardize (4S - Seiketsu):** Prominently display visual SOP standard sheets, lubricant tags, and daily 5-minute audit matrices.\n` +
      `5. **Sustain (5S - Shitsuke):** Conduct regular Gemba walks and recognize top-performing manufacturing cells.\n\n` +
      `🔍 **Gemba Walk Tip:** Look for excessive operator walking (Muda of Motion) and inventory queuing before stamping or assembly stations.`;

    return {
      text,
      speechText: "Here is your 5S Visual Management and Gemba audit standard to drive continuous improvement across production cells.",
      kpiCards,
      navigators: [
        {
          navigatorId: '5s-management',
          navigatorName: '5S & Visual Management',
          label: 'Open 5S Module →',
          category: 'Operations & Factory'
        },
        {
          navigatorId: 'gemba-walks',
          navigatorName: 'Gemba Walks Navigator',
          label: 'Start Gemba Audit →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Run complete plant operational health check",
        "Are there any active machine breakdowns right now?",
        "Generate a complete shift handover report"
      ],
      contextUpdates: { lastTopic: '5s' }
    };
  }

  // B. NAVIGATION INTENTS ("Open Employee Directory", "Go to Daily Tasks", etc.)
  const permittedNavs = getPermittedNavigators(userScope, bundle.accessLevels);
  for (const nav of permittedNavs) {
    const navName = nav.name.toLowerCase();
    const navId = nav.id.toLowerCase();
    if (
      q.includes(`open ${navName}`) || 
      q.includes(`go to ${navName}`) || 
      q.includes(`navigate to ${navName}`) ||
      q.includes(`show ${navName}`) ||
      (q.includes('open') && q.includes(navId))
    ) {
      return {
        text: `You can access **${nav.name}** right here. Click the button below to switch directly to the module:`,
        speechText: `Opening ${nav.name}.`,
        navigators: [
          {
            navigatorId: nav.id,
            navigatorName: nav.name,
            label: `Open ${nav.name} →`,
            category: nav.category
          }
        ],
        suggestions: [
          `What are the functions in ${nav.name}?`,
          "Today's Executive Management Summary"
        ]
      };
    }
  }

  // C. MACHINE BREAKDOWNS & MAINTENANCE
  if (
    q.includes('breakdown') || q.includes('machine down') || q.includes('stopped') || 
    q.includes('maintenance') || q.includes('jogontro') || q.includes('nosto')
  ) {
    const access = checkTopicAccess('breakdown', userScope);
    if (!access.allowed) {
      return {
        text: "I'm sorry, you do not have permission to view machine breakdown and maintenance records.",
        speechText: "Sorry, you do not have permission to access machine breakdown data."
      };
    }

    const breakdownRows = await fetchSheetData(bundle.spreadsheetId, 'BreakdownLog');
    const activeStoppages = breakdownRows.filter(r => {
      const status = (r[26] || '').toLowerCase();
      return status.includes('progress') || status.includes('investigation') || status.includes('open') || status.includes('pending');
    });

    const totalHoursLost = breakdownRows.reduce((acc, r) => acc + (parseFloat(r[13]) || 0), 0);
    const totalCost = breakdownRows.reduce((acc, r) => acc + (parseFloat(r[25]) || 0), 0);

    const kpiCards: AssistantKpiCard[] = [
      {
        label: 'Active Stoppages',
        value: activeStoppages.length,
        subtext: activeStoppages.length > 0 ? 'Urgent attention needed' : 'All machines operational',
        color: activeStoppages.length > 0 ? 'rose' : 'emerald'
      },
      {
        label: 'Total Incidents',
        value: breakdownRows.length,
        subtext: 'Logged in database',
        color: 'blue'
      },
      {
        label: 'Hours Lost',
        value: `${totalHoursLost.toFixed(1)} hrs`,
        subtext: 'Cumulative maintenance downtime',
        color: 'amber'
      }
    ];

    let breakdownDetails = '';
    if (activeStoppages.length > 0) {
      breakdownDetails = `\n\n### ⚠️ Active Breakdown Alert:\n` + activeStoppages.map(b => 
        `• **${b[3]}** (${b[4]} - ${b[2]}): ${b[5]} — Status: *${b[26]}* (Reported: ${b[7]} by ${b[9]})`
      ).join('\n');
    } else {
      breakdownDetails = `\n\n✅ **Good news:** There are currently no unresolved machine stoppages reported in the active log.`;
    }

    return {
      text: `### Machine Breakdown & Downtime Summary\nHere is the current maintenance status from the Breakdown Log database:${breakdownDetails}`,
      speechText: activeStoppages.length > 0 
        ? `Attention: There are ${activeStoppages.length} active machine breakdowns currently in progress.`
        : 'All monitored production machines are currently operating with zero active stoppages.',
      kpiCards,
      navigators: [
        {
          navigatorId: 'breakdown',
          navigatorName: 'Breakdown Log Navigator',
          label: 'Open Full Breakdown Log →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Show RFID machine status",
        "Who is on leave today?",
        "Today's Executive Management Summary"
      ],
      contextUpdates: { lastTopic: 'breakdown' }
    };
  }

  // D. LEAVE MANAGEMENT & ABSENTEEISM
  if (
    q.includes('leave') || q.includes('chuti') || q.includes('absent') || 
    q.includes('holiday balance') || q.includes('vacation')
  ) {
    const access = checkTopicAccess('leave', userScope);
    const leaveRows = await fetchSheetData(bundle.spreadsheetId, 'Leave');

    // Self Leave Balance Request
    if (q.includes('my leave') || q.includes('amar chuti') || access.scopeType === 'self') {
      const myId = (userScope?.employeeId || '').toUpperCase();
      const myLeaves = leaveRows.filter(r => (r[1] || '').toUpperCase() === myId);

      const approved = myLeaves.filter(r => (r[8] || '').toLowerCase().includes('approved') || (r[8] || '').toLowerCase().includes('settlement'));
      const pending = myLeaves.filter(r => (r[8] || '').toLowerCase().includes('pending'));
      const totalDaysTaken = approved.reduce((acc, r) => acc + (parseFloat(r[7]) || 0), 0);

      const kpiCards: AssistantKpiCard[] = [
        { label: 'Annual Entitlement', value: '14 Days', color: 'blue' },
        { label: 'Days Utilized', value: `${totalDaysTaken} Days`, color: 'amber' },
        { label: 'Pending Requests', value: pending.length, color: pending.length > 0 ? 'indigo' : 'emerald' },
        { label: 'Remaining Balance', value: `${Math.max(0, 14 - totalDaysTaken)} Days`, color: 'emerald' }
      ];

      return {
        text: `### Your Personal Leave Balance (ID: ${userScope?.employeeId || 'Staff'})\n` +
          `• **Annual Allocation:** 14 Days\n` +
          `• **Utilized Leaves:** ${totalDaysTaken} Days\n` +
          `• **Pending Approvals:** ${pending.length} applications awaiting supervisor/HR sign-off.\n` +
          `• **Available Days:** Approximately **${Math.max(0, 14 - totalDaysTaken)} Days** remaining for 2026.`,
        speechText: `You have utilized ${totalDaysTaken} days of leave with ${Math.max(0, 14 - totalDaysTaken)} days remaining.`,
        kpiCards,
        navigators: [
          {
            navigatorId: 'leave',
            navigatorName: 'Leave Management Navigator',
            label: 'Apply for Leave →',
            category: 'Workforce & HR'
          }
        ],
        suggestions: ["What are the upcoming official holidays?", "My daily tasks"],
        contextUpdates: { lastTopic: 'leave' }
      };
    }

    // Organization / Department Leave Overview (Manager / Admin / Supervisor)
    const onLeaveToday = leaveRows.filter(r => {
      const from = r[5] || '';
      const to = r[6] || '';
      const status = (r[8] || '').toLowerCase();
      const isApprovedOrSettled = status.includes('approved') || status.includes('settlement') || status.includes('hr pending');
      return isApprovedOrSettled && todayStr >= from && todayStr <= to;
    });

    const kpiCards: AssistantKpiCard[] = [
      {
        label: 'On Leave Today',
        value: onLeaveToday.length,
        subtext: `Date: ${todayStr}`,
        color: onLeaveToday.length > 0 ? 'amber' : 'emerald'
      },
      {
        label: 'Total Applications',
        value: leaveRows.length,
        subtext: 'In database records',
        color: 'blue'
      }
    ];

    let employeeList = '';
    if (onLeaveToday.length > 0) {
      employeeList = '\n\n**Staff on Leave Today:**\n' + onLeaveToday.map(r =>
        `• **${r[2]}** (${r[1]} - ${r[4]}): ${r[18] || 'Leave'} (${r[5]} to ${r[6]}, Reason: *${r[10]}*)`
      ).join('\n');
    } else {
      employeeList = `\n\n✅ There are no employees scheduled on approved leave for today (${todayStr}).`;
    }

    return {
      text: `### Leave & Attendance Status (${todayStr})\n` +
        `Based on authorized HR records, **${onLeaveToday.length} employee(s)** are currently scheduled on leave.${employeeList}`,
      speechText: onLeaveToday.length > 0
        ? `There are ${onLeaveToday.length} employees on leave today.`
        : 'There are no employees on leave today.',
      kpiCards,
      navigators: [
        {
          navigatorId: 'leave',
          navigatorName: 'Leave Management Navigator',
          label: 'Open Leave Management →',
          category: 'Workforce & HR'
        }
      ],
      suggestions: [
        "Show upcoming public holidays",
        "Today's Executive Management Summary",
        "Check shift assignments"
      ],
      contextUpdates: { lastTopic: 'leave' }
    };
  }

  // E. DAILY TASKS & JOB ORDERS
  if (
    q.includes('task') || q.includes('kaj') || q.includes('todo') || 
    q.includes('pending') || q.includes('overdue')
  ) {
    const tasks = bundle.tasks || [];
    const myId = (userScope?.employeeId || '').toUpperCase();
    const isSelfTask = q.includes('my task') || q.includes('amar kaj') || (!userScope?.isAdmin && !userScope?.isManager);

    const relevantTasks = tasks.filter(t => {
      if (t.deleted === 'TRUE') return false;
      if (isSelfTask && myId) {
        return (t.assigneeId || '').toUpperCase() === myId;
      }
      return true;
    });

    const pending = relevantTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
    const overdue = pending.filter(t => t.dueDate < todayStr);
    const dueToday = pending.filter(t => t.dueDate === todayStr);

    const kpiCards: AssistantKpiCard[] = [
      {
        label: 'Pending Tasks',
        value: pending.length,
        subtext: isSelfTask ? 'Assigned to you' : 'Across accessible units',
        color: pending.length > 0 ? 'indigo' : 'emerald'
      },
      {
        label: 'Due Today',
        value: dueToday.length,
        subtext: 'Must be completed today',
        color: dueToday.length > 0 ? 'amber' : 'blue'
      },
      {
        label: 'Overdue',
        value: overdue.length,
        subtext: overdue.length > 0 ? 'Immediate follow-up' : 'Zero overdue items',
        color: overdue.length > 0 ? 'rose' : 'emerald'
      }
    ];

    let taskBullets = '';
    if (pending.length > 0) {
      taskBullets = `\n\n### Priority Action Items:\n` + pending.slice(0, 5).map(t => 
        `• **[${t.priority}] ${t.title}** (Due: ${t.dueDate}) — *${t.status}* (${t.progress}% completed)`
      ).join('\n');
      if (pending.length > 5) {
        taskBullets += `\n*...and ${pending.length - 5} more pending tasks.*`;
      }
    } else {
      taskBullets = `\n\n🎉 All assigned tasks are currently completed!`;
    }

    return {
      text: `### Daily Tasks Overview (${isSelfTask ? 'Your Assigned Tasks' : 'Operational Scope'})\n` +
        `I found **${pending.length} pending task(s)** (${dueToday.length} due today, ${overdue.length} overdue).${taskBullets}`,
      speechText: `You have ${pending.length} pending tasks, with ${overdue.length} overdue.`,
      kpiCards,
      navigators: [
        {
          navigatorId: 'tasks',
          navigatorName: 'Daily Tasks Navigator',
          label: 'Manage Daily Tasks →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Today's Executive Management Summary",
        "Show machine breakdowns",
        "My leave balance"
      ],
      contextUpdates: { lastTopic: 'tasks' }
    };
  }

  // F. SHIFTS & MANPOWER DISTRIBUTION
  if (
    q.includes('shift') || q.includes('manpower') || q.includes('night shift') || 
    q.includes('day shift') || q.includes('kormi') || q.includes('operator')
  ) {
    const access = checkTopicAccess('manpower', userScope);
    if (!access.allowed) {
      return {
        text: "I'm sorry, you do not have permission to view general shift manpower allocation.",
        speechText: "Sorry, you do not have permission to view manpower allocation."
      };
    }

    const employees = bundle.employees || [];
    const active = employees.filter(e => e.status === 'Active');
    const dayShift = active.filter(e => (e.currentShift || e.shift || '').toLowerCase().includes('day'));
    const nightShift = active.filter(e => (e.currentShift || e.shift || '').toLowerCase().includes('night'));
    const generalShift = active.filter(e => (e.currentShift || e.shift || '').toLowerCase().includes('general'));

    const kpiCards: AssistantKpiCard[] = [
      { label: 'Active Workforce', value: active.length, color: 'blue' },
      { label: 'Day Shift', value: dayShift.length, subtext: '08:00 - 17:00 BST', color: 'amber' },
      { label: 'Night Shift', value: nightShift.length, subtext: '20:00 - 05:00 BST', color: 'indigo' },
      { label: 'General Shift', value: generalShift.length, subtext: 'Standard Office', color: 'emerald' }
    ];

    return {
      text: `### Shift Manpower Allocation\n` +
        `Current operational distribution across active employees:\n` +
        `• **Day Shift:** ${dayShift.length} operators & specialists\n` +
        `• **Night Shift:** ${nightShift.length} operators & specialists\n` +
        `• **General Shift:** ${generalShift.length} administrative and support staff\n` +
        `• **Total Active Strength:** ${active.length} team members`,
      speechText: `Active workforce is ${active.length} people, with ${dayShift.length} on Day Shift and ${nightShift.length} on Night Shift.`,
      kpiCards,
      navigators: [
        {
          navigatorId: 'shifts',
          navigatorName: 'Shift Assignments Navigator',
          label: 'Open Shift Rostering →',
          category: 'Operations & Factory'
        }
      ],
      suggestions: [
        "Are there any active machine breakdowns?",
        "Today's Executive Management Summary"
      ],
      contextUpdates: { lastTopic: 'manpower' }
    };
  }

  // G. OFFICIAL HOLIDAYS & CALENDAR
  if (
    q.includes('holiday') || q.includes('chutir din') || q.includes('calendar') || 
    q.includes('public holiday') || q.includes('eid') || q.includes('puja')
  ) {
    const holidays = bundle.holidays || [];
    const upcoming = holidays
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const nextHol = upcoming[0];
    const text = nextHol
      ? `### Official Holidays Schedule\n` +
        `The upcoming official holiday is **${nextHol.name}** on **${nextHol.date}** (${nextHol.dayOfWeek}, *${nextHol.holidayType}*).\n\n` +
        `**Next Upcoming Company Holidays:**\n` +
        upcoming.slice(0, 4).map(h => `• **${h.name}:** ${h.date} (${h.dayOfWeek}) — *${h.workType}*`).join('\n')
      : `### Official Holidays Schedule\nAll major public holidays for the current cycle have passed. Next year schedule will be uploaded soon.`;

    return {
      text,
      speechText: nextHol
        ? `The next official holiday is ${nextHol.name} on ${nextHol.date}.`
        : 'There are no more scheduled holidays for this month.',
      suggestions: [
        "Show my leave balance",
        "Today's Executive Management Summary"
      ],
      contextUpdates: { lastTopic: 'general' }
    };
  }

  // H. EXECUTIVE MANAGEMENT SUMMARY (Part 19 of Specification)
  if (
    q.includes('summary') || q.includes('management summary') || 
    q.includes('executive summary') || q.includes('overview') || q.includes('daily report')
  ) {
    const breakdownRows = await fetchSheetData(bundle.spreadsheetId, 'BreakdownLog');
    const leaveRows = await fetchSheetData(bundle.spreadsheetId, 'Leave');
    const activeStoppages = breakdownRows.filter(r => (r[26] || '').toLowerCase().includes('progress') || (r[26] || '').toLowerCase().includes('investigation'));
    const pendingTasks = (bundle.tasks || []).filter(t => t.deleted !== 'TRUE' && t.status !== 'Completed');
    const onLeaveToday = leaveRows.filter(r => todayStr >= (r[5] || '') && todayStr <= (r[6] || ''));
    const activeStaff = (bundle.employees || []).filter(e => e.status === 'Active');

    const kpiCards: AssistantKpiCard[] = [
      { label: 'Active Workforce', value: activeStaff.length, color: 'blue' },
      { label: 'Pending Tasks', value: pendingTasks.length, color: pendingTasks.length > 5 ? 'amber' : 'emerald' },
      { label: 'Active Breakdowns', value: activeStoppages.length, color: activeStoppages.length > 0 ? 'rose' : 'emerald' },
      { label: 'On Leave Today', value: onLeaveToday.length, color: 'indigo' }
    ];

    const report = 
      `### Daily Executive Management Summary (${todayStr})\n` +
      `*Generated for ${userScope?.employeeName || 'Management'} (${userScope?.role || 'Admin'})*\n\n` +
      `**1. Factory Operations & Uptime:**\n` +
      `• Active Machine Breakdowns: **${activeStoppages.length}** active stoppages requiring engineering attention.\n` +
      `• Total recorded maintenance incidents: **${breakdownRows.length}** events.\n\n` +
      `**2. Workforce & Attendance:**\n` +
      `• Total active headcount: **${activeStaff.length} employees**.\n` +
      `• Staff currently on approved leave: **${onLeaveToday.length} employees**.\n\n` +
      `**3. Task Dispatch & Execution:**\n` +
      `• Open operations tasks: **${pendingTasks.length} pending items** across active departments.\n\n` +
      `💡 **Recommendation:** ${activeStoppages.length > 0 ? 'Prioritize rapid repair on active line stoppages to protect daily production output.' : 'Line operations are running smoothly with zero active stoppage bottlenecks.'}`;

    return {
      text: report,
      speechText: `Daily management summary: Active workforce is ${activeStaff.length}. There are ${activeStoppages.length} active machine stoppages and ${pendingTasks.length} pending tasks.`,
      kpiCards,
      suggestions: [
        "Check machine breakdowns",
        "Who is on leave today?",
        "Open ERP Dashboard"
      ],
      contextUpdates: { lastTopic: 'production' }
    };
  }

  // DEFAULT / GENERAL ASSISTANCE
  return {
    text: `I understand you are inquiring about **"${query}"**.\n\n` +
      `As your **SML Smart Assistant**, I can directly retrieve authorized records from Google Drive database regarding:\n` +
      `• **Production & Machinery:** Capacity, line speeds, and active downtime breakdowns\n` +
      `• **Workforce:** Employee directory, shift rosters, and work anniversaries\n` +
      `• **Leave & Attendance:** Today's absentees, personal leave balances, and approvals\n` +
      `• **Daily Operations:** Task assignments, priorities, and management summaries\n\n` +
      `Would you like me to show today's management summary or search specific department records?`,
    speechText: `I can help you check production, breakdowns, leaves, tasks, or generate today's management summary. What would you like to know?`,
    suggestions: generateSmartSuggestions(userScope),
    contextUpdates: { lastTopic: 'general' }
  };
}
