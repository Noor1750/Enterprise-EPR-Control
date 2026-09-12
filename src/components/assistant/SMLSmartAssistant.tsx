import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  Copy, Check, ExternalLink, Settings, RotateCcw, AlertTriangle, 
  MessageSquare, ChevronDown, Clock, Shield, CheckCircle2,
  Play, Pause, Info, User, Activity, Users, FileText
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';
import { 
  ChatMessage, 
  AssistantSettings, 
  DEFAULT_ASSISTANT_SETTINGS, 
  VoiceGenderMode,
  AssistantContextState,
  AssistantProfile,
  ASSISTANT_PROFILES,
  SmartActivity 
} from '../../types/assistant';
import { assistantAudio, VoiceRecognitionState } from '../../lib/assistant/assistantAudio';
import { 
  processAssistantQuery, 
  generateSmartSuggestions, 
  AssistantDataBundle 
} from '../../lib/assistant/smlAssistantEngine';
import { getBangladeshDateTime } from '../../lib/taskReminderEngine';
import { AssistantProfileDrawer } from './AssistantProfileDrawer';
import { AssistantActivitiesView } from './AssistantActivitiesView';
import { AssistantAuditView } from './AssistantAuditView';
import { AssistantAudioWaveform } from './AssistantAudioWaveform';

interface SMLSmartAssistantProps {
  userSecurityScope?: UserSecurityScope;
  accessLevels: string[];
  spreadsheetId: string | null;
  employees: any[];
  tasks: any[];
  holidays: any[];
  onNavigate: (navigatorId: string) => void;
}

export default function SMLSmartAssistant({
  userSecurityScope,
  accessLevels,
  spreadsheetId,
  employees,
  tasks,
  holidays,
  onNavigate
}: SMLSmartAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'activities' | 'profiles' | 'audit'>('chat');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>({
    isSupported: true,
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null
  });

  const [settings, setSettings] = useState<AssistantSettings>(() => {
    try {
      const saved = localStorage.getItem('sml_assistant_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_ASSISTANT_SETTINGS,
          ...parsed,
          voiceGender: parsed.voiceGender || 'auto'
        };
      }
    } catch (_) {}
    return DEFAULT_ASSISTANT_SETTINGS;
  });

  // Categorized browser voices (Female, Male, All)
  const [categorizedVoices, setCategorizedVoices] = useState<{
    female: SpeechSynthesisVoice[];
    male: SpeechSynthesisVoice[];
    all: SpeechSynthesisVoice[];
  }>({ female: [], male: [], all: [] });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        setCategorizedVoices(assistantAudio.getAvailableVoicesCategorized());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Current active assistant profile persona
  const activeProfile: AssistantProfile = 
    ASSISTANT_PROFILES.find(p => p.id === settings.activeProfileId) || ASSISTANT_PROFILES[0];

  const [contextState, setContextState] = useState<AssistantContextState>({
    activeProfileId: activeProfile.id
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Time in Bangladesh Standard Time
  const [bdTime, setBdTime] = useState(getBangladeshDateTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setBdTime(getBangladeshDateTime());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem('sml_assistant_settings', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  // Connect Audio Manager callbacks
  useEffect(() => {
    assistantAudio.setCallbacks(
      (newVoiceState) => {
        setVoiceState(prev => ({ ...prev, ...newVoiceState }));
        if (newVoiceState.transcript) {
          setInputText(prev => (prev ? `${prev} ${newVoiceState.transcript}` : newVoiceState.transcript));
        }
      },
      (speaking) => {
        setIsSpeaking(speaking);
        if (!speaking) {
          setActiveSpeechMsgId(null);
        }
      }
    );
  }, []);

  // Auto-scroll messages in chat tab
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading, activeTab]);

  // Initial Welcome Message
  useEffect(() => {
    if (messages.length === 0) {
      const greetingWord = bdTime.hours < 12 ? 'Good morning' : bdTime.hours < 17 ? 'Good afternoon' : 'Good evening';
      const userName = userSecurityScope?.employeeName || 'Team Member';
      const role = userSecurityScope?.role || 'Valued Employee';

      const initialMessage: ChatMessage = {
        id: 'welcome-msg',
        sender: 'assistant',
        text: `**${greetingWord}, ${userName}!**\n\nI am **${activeProfile.name}**, your **${activeProfile.title}** for OPERATION ERP at SML Trims BD.\n\n• **Core Specialty:** ${activeProfile.specialty}\n• **Verified Access Level:** ${role} (${userSecurityScope?.assignedDepartment || 'Operations'})\n\n${activeProfile.sampleGreeting}\n\nHow can I support your operational decisions today?`,
        speechText: `${greetingWord}, ${userName}. I am ${activeProfile.name}, your ${activeProfile.title}. How can I assist you with your operations today?`,
        timestamp: new Date().toISOString(),
        suggestions: generateSmartSuggestions(userSecurityScope, activeProfile)
      };

      setMessages([initialMessage]);
    }
  }, [userSecurityScope, activeProfile]);

  const handleSelectProfile = (profile: AssistantProfile) => {
    // If selecting the already active profile, just switch to chat view
    if (settings.activeProfileId === profile.id) {
      setActiveTab('chat');
      return;
    }

    setSettings(prev => ({ ...prev, activeProfileId: profile.id }));
    setContextState(prev => ({ ...prev, activeProfileId: profile.id }));

    // Post persona switch greeting with guaranteed unique ID
    const uniqueSwitchId = `profile-switch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const switchMsg: ChatMessage = {
      id: uniqueSwitchId,
      sender: 'assistant',
      text: `🔄 **Assistant Profile Switched to ${profile.name}** (${profile.title})\n\n• **Department Focus:** ${profile.departmentFocus}\n• **Specialty:** ${profile.specialty}\n\n*"${profile.sampleGreeting}"*`,
      speechText: `Switched to ${profile.name}, ${profile.title}. Ready for your directives.`,
      timestamp: new Date().toISOString(),
      suggestions: generateSmartSuggestions(userSecurityScope, profile)
    };

    setMessages(prev => {
      if (prev.some(m => m.id === switchMsg.id)) return prev;
      return [...prev, switchMsg];
    });
    setActiveTab('chat');

    if (settings.voiceOutputEnabled) {
      handleSpeak(switchMsg.speechText!, switchMsg.id);
    }
  };

  const handleRunActivity = (activity: SmartActivity) => {
    setActiveTab('chat');
    handleSendMessage(activity.triggerPrompt);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    assistantAudio.stopListening();
    assistantAudio.stopSpeaking();

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const bundle: AssistantDataBundle = {
      spreadsheetId,
      employees,
      tasks,
      holidays,
      userSecurityScope,
      accessLevels,
      activeProfile
    };

    try {
      const { message: assistantReply, updatedContext } = await processAssistantQuery(
        text,
        bundle,
        contextState,
        onNavigate
      );

      setContextState(updatedContext);
      setMessages(prev => [...prev, assistantReply]);

      // Auto speech playback if enabled
      if (settings.voiceOutputEnabled && settings.autoSpeak && assistantReply.speechText) {
        handleSpeak(assistantReply.speechText, assistantReply.id);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        sender: 'assistant',
        text: "I'm having trouble accessing the requested operational data right now. Please verify your connection or try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (voiceState.isListening) {
      assistantAudio.stopListening();
    } else {
      assistantAudio.startListening('en-US');
    }
  };

  const handleSpeak = (speechText: string, messageId: string) => {
    if (isSpeaking && activeSpeechMsgId === messageId) {
      assistantAudio.stopSpeaking();
      setActiveSpeechMsgId(null);
      return;
    }

    const effectiveGender: 'female' | 'male' = 
      settings.voiceGender === 'female' 
        ? 'female' 
        : settings.voiceGender === 'male' 
        ? 'male' 
        : activeProfile.gender;

    setActiveSpeechMsgId(messageId);
    assistantAudio.speak(speechText, {
      gender: effectiveGender,
      voiceURI: settings.selectedVoiceURI,
      rate: activeProfile.speechRate || settings.speechRate,
      pitch: effectiveGender === 'male'
        ? (activeProfile.gender === 'male' ? activeProfile.speechPitch : 0.90)
        : (activeProfile.gender === 'female' ? activeProfile.speechPitch : 1.08),
      onEnd: () => setActiveSpeechMsgId(null),
      onError: () => setActiveSpeechMsgId(null)
    });
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    assistantAudio.stopSpeaking();
    const userName = userSecurityScope?.employeeName || 'Team Member';
    const initialMessage: ChatMessage = {
      id: `reset-${Date.now()}`,
      sender: 'assistant',
      text: `Chat cleared. How can I assist you now, ${userName}?`,
      speechText: `Chat cleared. How can I assist you now?`,
      timestamp: new Date().toISOString(),
      suggestions: generateSmartSuggestions(userSecurityScope, activeProfile)
    };
    setMessages([initialMessage]);
    setContextState({ activeProfileId: activeProfile.id });
  };

  return (
    <>
      {/* Floating Assistant Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative group"
            >
              {/* Tooltip hint on hover */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-slate-900/95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ask {activeProfile.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">{activeProfile.role}</span>
              </div>

              {/* Launcher Button */}
              <button
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-3 p-2.5 sm:px-4 sm:py-3 rounded-full bg-slate-900 hover:bg-slate-850 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 cursor-pointer"
                style={{ borderColor: activeProfile.auraColor }}
                title={`Open SML Smart Assistant (${activeProfile.name})`}
              >
                {/* Active Persona Avatar */}
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 shadow-md shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img
                      src={activeProfile.avatarUrl}
                      alt={activeProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Status beacon indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full shadow-xs" />
                </div>

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wide text-white">{activeProfile.name}</span>
                    <span 
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: activeProfile.auraColor }}
                    >
                      AI
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">{activeProfile.title}</div>
                </div>

                {/* Pulse wave ring */}
                <span 
                  className="absolute -inset-0.5 rounded-full animate-ping pointer-events-none opacity-40"
                  style={{ backgroundColor: activeProfile.auraColor }}
                />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable Assistant Drawer / Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] sm:w-[460px] md:w-[500px] h-[660px] max-h-[90vh] bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Header with Active Profile Details */}
            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div 
                onClick={() => setActiveTab('profiles')}
                className="flex items-center gap-3 cursor-pointer group"
                title="Click to change Assistant Persona"
              >
                <div 
                  className="relative w-10 h-10 rounded-full p-0.5 shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: activeProfile.auraColor }}
                >
                  <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden">
                    <img
                      src={activeProfile.avatarUrl}
                      alt={activeProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                      {activeProfile.name}
                    </span>
                    <span 
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white"
                      style={{ backgroundColor: activeProfile.auraColor }}
                    >
                      {activeProfile.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>BST {bdTime.timeString}</span>
                    <span>•</span>
                    <span className="text-blue-400 font-semibold">{userSecurityScope?.role || 'Staff'} Scope</span>
                  </div>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5">
                {/* Quick Voice Gender Toggle Pill */}
                <button
                  type="button"
                  id="quick-voice-gender-pill"
                  onClick={() => {
                    const cycle: VoiceGenderMode[] = ['auto', 'female', 'male'];
                    const curIdx = cycle.indexOf(settings.voiceGender || 'auto');
                    const nextMode = cycle[(curIdx + 1) % cycle.length];
                    setSettings(prev => ({ ...prev, voiceGender: nextMode }));
                    const genderToSpeak = nextMode === 'male' ? 'male' : nextMode === 'female' ? 'female' : activeProfile.gender;
                    assistantAudio.testVoice(genderToSpeak, nextMode === 'auto' 
                      ? `Auto mode enabled. Voice matches ${activeProfile.name}.`
                      : `${nextMode.toUpperCase()} voice activated.`
                    );
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    settings.voiceGender === 'female'
                      ? 'bg-rose-950/70 text-rose-300 border-rose-700 hover:bg-rose-900/80 shadow-sm'
                      : settings.voiceGender === 'male'
                      ? 'bg-blue-950/70 text-blue-300 border-blue-700 hover:bg-blue-900/80 shadow-sm'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  title={`Voice Gender: ${settings.voiceGender || 'auto'}. Click to cycle: Auto -> Female -> Male`}
                >
                  {settings.voiceGender === 'female' ? (
                    <>
                      <span>👩</span>
                      <span className="hidden sm:inline">Female</span>
                    </>
                  ) : settings.voiceGender === 'male' ? (
                    <>
                      <span>👨</span>
                      <span className="hidden sm:inline">Male</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px]">🔄</span>
                      <span className="hidden sm:inline">Auto ({activeProfile.gender === 'female' ? '👩' : '👨'})</span>
                    </>
                  )}
                </button>

                {/* Voice Output Toggle */}
                <button
                  onClick={() => setSettings(prev => ({ ...prev, voiceOutputEnabled: !prev.voiceOutputEnabled }))}
                  className={`p-1.5 rounded-lg transition text-xs ${settings.voiceOutputEnabled ? 'text-blue-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
                  title={settings.voiceOutputEnabled ? 'Voice output enabled' : 'Voice output muted'}
                >
                  {settings.voiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Clear Chat */}
                <button
                  onClick={handleClearChat}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Settings & Voice Engine Drawer Toggle */}
                <button
                  type="button"
                  id="assistant-settings-drawer-toggle"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg transition ${showSettings ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title="Virtual Assistant Voice & Engine Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    assistantAudio.stopSpeaking();
                    assistantAudio.stopListening();
                    setIsOpen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1"
                  title="Close assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-3 py-1.5 gap-1 shrink-0">
              <button
                type="button"
                id="tab-btn-chat"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                id="tab-btn-activities"
                onClick={() => setActiveTab('activities')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'activities'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Smart Activities</span>
              </button>

              <button
                type="button"
                id="tab-btn-profiles"
                onClick={() => setActiveTab('profiles')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'profiles'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Profiles</span>
              </button>

              {userSecurityScope?.isAdmin && (
                <button
                  type="button"
                  id="tab-btn-audit"
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Audit Logs</span>
                </button>
              )}

              {/* Dynamic Waveform in Navigation Bar */}
              <div className="ml-auto">
                <AssistantAudioWaveform 
                  isSpeaking={isSpeaking}
                  isListening={voiceState.isListening}
                  accentColor="bg-blue-500"
                />
              </div>
            </div>

            {/* Voice & Assistant Engine Settings Drawer Overlay */}
            {showSettings && (
              <div id="assistant-settings-drawer" className="bg-slate-900 border-b border-slate-800 p-4 space-y-3.5 shrink-0 text-xs text-slate-200 shadow-xl max-h-[380px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between font-bold text-white border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span>Virtual Assistant Voice & Engine Settings</span>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Voice Gender Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Voice Gender:</span>
                    <span className="text-[11px] text-slate-400">
                      Active: <strong className="text-white capitalize">{settings.voiceGender || 'auto'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Auto Option */}
                    <button
                      type="button"
                      id="voice-gender-opt-auto"
                      onClick={() => setSettings(prev => ({ ...prev, voiceGender: 'auto' }))}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        (settings.voiceGender || 'auto') === 'auto'
                          ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1">
                          <span>🔄</span>
                          <span>Auto</span>
                        </span>
                        {(settings.voiceGender || 'auto') === 'auto' && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Matches {activeProfile.name} ({activeProfile.gender === 'female' ? 'Female' : 'Male'})
                      </span>
                    </button>

                    {/* Female Option */}
                    <button
                      type="button"
                      id="voice-gender-opt-female"
                      onClick={() => {
                        setSettings(prev => ({ ...prev, voiceGender: 'female' }));
                        assistantAudio.testVoice('female');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        settings.voiceGender === 'female'
                          ? 'bg-rose-950/60 border-rose-500 text-white shadow-sm ring-1 ring-rose-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1">
                          <span>👩</span>
                          <span>Female</span>
                        </span>
                        {settings.voiceGender === 'female' && (
                          <Check className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Feminine timbre & clarity
                      </span>
                    </button>

                    {/* Male Option */}
                    <button
                      type="button"
                      id="voice-gender-opt-male"
                      onClick={() => {
                        setSettings(prev => ({ ...prev, voiceGender: 'male' }));
                        assistantAudio.testVoice('male');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        settings.voiceGender === 'male'
                          ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1">
                          <span>👨</span>
                          <span>Male</span>
                        </span>
                        {settings.voiceGender === 'male' && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Masculine timbre & resonance
                      </span>
                    </button>
                  </div>
                </div>

                {/* Instant Audition Buttons */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-400">Audition Voice:</span>
                  <button
                    type="button"
                    id="settings-test-female-voice"
                    onClick={() => assistantAudio.testVoice('female')}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-rose-400" />
                    <span>👩 Audition Female</span>
                  </button>

                  <button
                    type="button"
                    id="settings-test-male-voice"
                    onClick={() => assistantAudio.testVoice('male')}
                    className="px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-blue-400" />
                    <span>👨 Audition Male</span>
                  </button>
                </div>

                {/* System Voice Selection (if browser provides voices) */}
                {categorizedVoices.all.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                      <span>Specific TTS Engine Voice:</span>
                      {settings.selectedVoiceURI && (
                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, selectedVoiceURI: undefined }))}
                          className="text-blue-400 hover:underline text-[10px]"
                        >
                          Reset to Smart Automatic
                        </button>
                      )}
                    </label>
                    <select
                      value={settings.selectedVoiceURI || ''}
                      onChange={e => setSettings(prev => ({ ...prev, selectedVoiceURI: e.target.value || undefined }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Auto Recommended (Optimized by Gender & Persona)</option>
                      {categorizedVoices.female.length > 0 && (
                        <optgroup label="👩 Female Detected Voices">
                          {categorizedVoices.female.map((v, vIdx) => (
                            <option key={`female-v-${v.voiceURI || v.name}-${vIdx}`} value={v.voiceURI}>
                              👩 {v.name} ({v.lang})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {categorizedVoices.male.length > 0 && (
                        <optgroup label="👨 Male Detected Voices">
                          {categorizedVoices.male.map((v, vIdx) => (
                            <option key={`male-v-${v.voiceURI || v.name}-${vIdx}`} value={v.voiceURI}>
                              👨 {v.name} ({v.lang})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* Speech Automation Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSpeak}
                      onChange={e => setSettings(prev => ({ ...prev, autoSpeak: e.target.checked }))}
                      className="rounded text-blue-600 bg-slate-800 border-slate-700"
                    />
                    <span className="font-medium text-slate-300">Auto-speak replies</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.voiceOutputEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, voiceOutputEnabled: e.target.checked }))}
                      className="rounded text-blue-600 bg-slate-800 border-slate-700"
                    />
                    <span className="font-medium text-slate-300">Enable Voice Output</span>
                  </label>
                </div>

                {/* Speech Rate Controls */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-medium text-slate-400">Speech Speed:</span>
                  <div className="flex items-center gap-1">
                    {[0.85, 1.0, 1.15].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, speechRate: rate }))}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                          settings.speechRate === rate 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW: PROFILES */}
            {activeTab === 'profiles' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
                <AssistantProfileDrawer
                  activeProfileId={activeProfile.id}
                  onSelectProfile={handleSelectProfile}
                  voiceEnabled={settings.voiceOutputEnabled}
                />
              </div>
            )}

            {/* TAB VIEW: SMART ACTIVITIES */}
            {activeTab === 'activities' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
                <AssistantActivitiesView
                  userScope={userSecurityScope}
                  activeProfile={activeProfile}
                  onRunActivity={handleRunActivity}
                />
              </div>
            )}

            {/* TAB VIEW: AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
                <AssistantAuditView />
              </div>
            )}

            {/* TAB VIEW: CHAT */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 custom-scrollbar bg-slate-950">
                  {messages.map((msg, mIdx) => (
                    <div
                      key={`${msg.id}-${mIdx}`}
                      className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Assistant Avatar in chat */}
                      {msg.sender === 'assistant' && (
                        <div 
                          className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border shadow-sm"
                          style={{ borderColor: activeProfile.auraColor }}
                        >
                          <img
                            src={activeProfile.avatarUrl}
                            alt={activeProfile.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2`}>
                        {/* Message Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md rounded-tr-xs font-medium'
                              : msg.isError
                              ? 'bg-rose-950/70 border border-rose-800/80 text-rose-200 rounded-tl-xs shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm'
                          }`}
                        >
                          {/* Markdown rendered text */}
                          <div className="whitespace-pre-wrap space-y-1.5">
                            {msg.text.split('\n\n').map((para, pIdx) => {
                              if (para.startsWith('### ')) {
                                return <div key={pIdx} className="font-bold text-white text-sm mt-1">{para.replace('### ', '')}</div>;
                              }
                              return (
                                <p key={pIdx} className="leading-relaxed">
                                  {para.split('**').map((chunk, cIdx) => 
                                    cIdx % 2 === 1 ? <strong key={cIdx} className="font-bold text-white">{chunk}</strong> : chunk
                                  )}
                                </p>
                              );
                            })}
                          </div>

                          {/* KPI Cards Grid */}
                          {msg.kpiCards && msg.kpiCards.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800">
                              {msg.kpiCards.map((card, cIdx) => (
                                <div
                                  key={cIdx}
                                  className={`p-2.5 rounded-xl border ${
                                    card.color === 'rose' ? 'bg-rose-950/50 border-rose-800/60 text-rose-200' :
                                    card.color === 'emerald' ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200' :
                                    card.color === 'amber' ? 'bg-amber-950/50 border-amber-800/60 text-amber-200' :
                                    card.color === 'purple' ? 'bg-purple-950/50 border-purple-800/60 text-purple-200' :
                                    card.color === 'indigo' ? 'bg-indigo-950/50 border-indigo-800/60 text-indigo-200' :
                                    'bg-blue-950/50 border-blue-800/60 text-blue-200'
                                  }`}
                                >
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</div>
                                  <div className="text-base font-black mt-0.5 text-white">{card.value}</div>
                                  {card.subtext && <div className="text-[10px] text-slate-400 mt-0.5">{card.subtext}</div>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actionable Navigator links */}
                          {msg.navigators && msg.navigators.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-800">
                              {msg.navigators.map((nav, nIdx) => (
                                <button
                                  key={nIdx}
                                  onClick={() => {
                                    onNavigate(nav.navigatorId);
                                    setIsOpen(false);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                                >
                                  <span>{nav.label}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Message Tools (Assistant only) */}
                        {msg.sender === 'assistant' && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                            {/* Audio Speak Button */}
                            {msg.speechText && settings.voiceOutputEnabled && (
                              <button
                                onClick={() => handleSpeak(msg.speechText!, msg.id)}
                                className={`flex items-center gap-1 hover:text-blue-400 transition font-medium ${activeSpeechMsgId === msg.id ? 'text-blue-400 font-bold' : ''}`}
                                title="Read answer aloud"
                              >
                                {activeSpeechMsgId === msg.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                <span>{activeSpeechMsgId === msg.id ? 'Pause' : 'Read'}</span>
                              </button>
                            )}

                            {/* Copy Response */}
                            <button
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="flex items-center gap-1 hover:text-slate-200 transition"
                              title="Copy text"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}

                        {/* Follow-up / Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSendMessage(sug)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-full text-[11px] font-medium text-slate-300 hover:text-white transition shadow-sm text-left"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 items-center text-xs text-slate-400">
                      <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-200" />
                        <span className="text-slate-300 font-medium ml-1">
                          {activeProfile.name} is querying ERP records...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
                  {voiceState.error && (
                    <div className="mb-2 px-2.5 py-1 bg-rose-950/60 border border-rose-800 text-[11px] text-rose-300 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{voiceState.error}</span>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Microphone Button */}
                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                        voiceState.isListening
                          ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={voiceState.isListening ? 'Stop listening' : 'Start speaking (Microphone)'}
                    >
                      {voiceState.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Text input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={voiceState.isListening ? 'Listening to your voice...' : `Ask ${activeProfile.name} (English/বাংলা)...`}
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl outline-hidden transition font-medium text-white placeholder:text-slate-500"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isLoading}
                      className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition shadow-md cursor-pointer shrink-0"
                      title="Send question"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
