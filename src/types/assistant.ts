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
}

export interface AssistantSettings {
  enabled: boolean;
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  autoSpeak: boolean;
  speechRate: number; // 0.8 - 1.3 (default 1.0)
  speechPitch: number; // default 1.05 (for natural feminine pitch)
  selectedVoiceURI?: string;
  assistantName: string;
  welcomeMessageCustom?: string;
  languageMode: 'auto' | 'en' | 'bn';
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: true,
  voiceInputEnabled: true,
  voiceOutputEnabled: true,
  autoSpeak: false,
  speechRate: 1.0,
  speechPitch: 1.05,
  assistantName: 'SML Smart Assistant',
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
  status: 'Success' | 'Denied' | 'Error';
}
