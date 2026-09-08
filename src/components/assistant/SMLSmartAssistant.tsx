import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  Copy, Check, ExternalLink, Settings, RotateCcw, AlertTriangle, 
  MessageSquare, ChevronDown, Clock, Shield, CheckCircle2,
  Play, Pause, Info, User
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';
import { 
  ChatMessage, 
  AssistantSettings, 
  DEFAULT_ASSISTANT_SETTINGS, 
  AssistantContextState 
} from '../../types/assistant';
import { assistantAudio, VoiceRecognitionState } from '../../lib/assistant/assistantAudio';
import { 
  processAssistantQuery, 
  generateSmartSuggestions, 
  AssistantDataBundle 
} from '../../lib/assistant/smlAssistantEngine';
import { getBangladeshDateTime } from '../../lib/taskReminderEngine';
import { getAssistantAuditLogs } from '../../lib/assistant/assistantSecurityFilter';

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
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_ASSISTANT_SETTINGS;
  });

  const [contextState, setContextState] = useState<AssistantContextState>({});
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

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Initial Welcome Message
  useEffect(() => {
    if (messages.length === 0) {
      const greetingWord = bdTime.hours < 12 ? 'Good morning' : bdTime.hours < 17 ? 'Good afternoon' : 'Good evening';
      const userName = userScopeName();
      const role = userSecurityScope?.role || 'Valued Employee';

      const initialMessage: ChatMessage = {
        id: 'welcome-msg',
        sender: 'assistant',
        text: `**${greetingWord}, ${userName}!**\n\nI am your **SML Smart Assistant**, your AI digital employee for OPERATION ERP.\n\nI have verified your security profile as **${role}** (${userSecurityScope?.assignedDepartment || 'Operations'}). How can I assist you with your operations, production records, tasks, or leave inquiries today?`,
        speechText: `${greetingWord}, ${userName}. I am your SML Smart Assistant. How can I assist you with your operations today?`,
        timestamp: new Date().toISOString(),
        suggestions: generateSmartSuggestions(userSecurityScope)
      };

      setMessages([initialMessage]);
    }
  }, [userSecurityScope]);

  function userScopeName(): string {
    return userSecurityScope?.employeeName || 'Team Member';
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    assistantAudio.stopListening();
    assistantAudio.stopSpeaking();

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
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
      accessLevels
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
        id: `err-${Date.now()}`,
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

    setActiveSpeechMsgId(messageId);
    assistantAudio.speak(speechText, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
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
    const userName = userScopeName();
    const initialMessage: ChatMessage = {
      id: `reset-${Date.now()}`,
      sender: 'assistant',
      text: `Chat cleared. How can I assist you now, ${userName}?`,
      speechText: `Chat cleared. How can I assist you now?`,
      timestamp: new Date().toISOString(),
      suggestions: generateSmartSuggestions(userSecurityScope)
    };
    setMessages([initialMessage]);
    setContextState({});
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
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Ask SML Smart Assistant</span>
                <span className="text-[10px] text-slate-400 font-normal">Voice & Text</span>
              </div>

              {/* Launcher Button */}
              <button
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-3 p-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/40 cursor-pointer"
                title="Open SML Smart Assistant"
              >
                {/* Female Assistant Avatar */}
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500 to-indigo-500 p-0.5 shadow-md shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      alt="SML Assistant Avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Status beacon indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full shadow-xs" />
                </div>

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wide text-white">SML Smart Assistant</span>
                    <span className="px-1.5 py-0.2 bg-indigo-500/50 border border-indigo-300/40 rounded text-[9px] font-bold text-indigo-100">AI</span>
                  </div>
                  <div className="text-[10px] text-indigo-200 font-medium">Click to ask or speak</div>
                </div>

                {/* Pulse wave ring */}
                <span className="absolute -inset-0.5 rounded-full bg-indigo-500/20 animate-ping pointer-events-none" />
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
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] sm:w-[440px] md:w-[460px] h-[640px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-indigo-400 shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      alt="SML Assistant"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">SML Smart Assistant</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold">LIVE</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-300">
                    <span>BST {bdTime.timeString} (UTC+6)</span>
                    <span>•</span>
                    <span className="text-indigo-300 font-semibold">{userSecurityScope?.role || 'Staff'} Access</span>
                  </div>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                {/* Voice Output Toggle */}
                <button
                  onClick={() => setSettings(prev => ({ ...prev, voiceOutputEnabled: !prev.voiceOutputEnabled }))}
                  className={`p-1.5 rounded-lg transition text-xs ${settings.voiceOutputEnabled ? 'text-indigo-300 hover:bg-indigo-900/50' : 'text-slate-500 hover:bg-slate-800'}`}
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

                {/* Settings Drawer Toggle */}
                {userSecurityScope?.isAdmin && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 rounded-lg transition ${showSettings ? 'text-indigo-300 bg-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    title="Assistant Administration & Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => {
                    assistantAudio.stopSpeaking();
                    assistantAudio.stopListening();
                    setIsOpen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Close assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Speaking / Listening Waveform Banner */}
            {(isSpeaking || voiceState.isListening) && (
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/15 to-indigo-500/10 border-b border-indigo-200/60 px-4 py-2 flex items-center justify-between text-xs text-indigo-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[12, 20, 16, 24, 14, 18].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-indigo-600 rounded-full animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-xs text-indigo-950">
                    {voiceState.isListening ? 'Listening to your voice...' : 'Speaking answer aloud...'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (voiceState.isListening) assistantAudio.stopListening();
                    if (isSpeaking) assistantAudio.stopSpeaking();
                  }}
                  className="text-indigo-700 hover:text-indigo-900 text-xs font-bold px-2 py-0.5 bg-white/80 rounded-md shadow-2xs border border-indigo-200"
                >
                  Stop Audio
                </button>
              </div>
            )}

            {/* Admin Settings Drawer Overlay */}
            {showSettings && (
              <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0 text-xs text-slate-800 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
                  <span>Assistant Configuration (Administrator)</span>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSpeak}
                      onChange={e => setSettings(prev => ({ ...prev, autoSpeak: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-medium">Auto-speak responses</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.voiceOutputEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, voiceOutputEnabled: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-medium">Enable TTS Voice</span>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Speaking Pace:</span>
                  <div className="flex items-center gap-1">
                    {[0.85, 1.0, 1.15].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setSettings(prev => ({ ...prev, speechRate: rate }))}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${settings.speechRate === rate ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 custom-scrollbar bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar in chat */}
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-600 shrink-0 mt-0.5 border border-indigo-200 shadow-2xs">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                        alt="Assistant"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    {/* Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md rounded-tr-xs font-medium'
                          : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs shadow-2xs'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {/* Markdown rendered text */}
                      <div className="whitespace-pre-wrap space-y-1.5">
                        {msg.text.split('\n\n').map((para, pIdx) => {
                          if (para.startsWith('### ')) {
                            return <div key={pIdx} className="font-bold text-slate-900 text-sm mt-1">{para.replace('### ', '')}</div>;
                          }
                          return (
                            <p key={pIdx} className="leading-relaxed">
                              {para.split('**').map((chunk, cIdx) => 
                                cIdx % 2 === 1 ? <strong key={cIdx} className="font-bold text-slate-900">{chunk}</strong> : chunk
                              )}
                            </p>
                          );
                        })}
                      </div>

                      {/* KPI Cards Grid */}
                      {msg.kpiCards && msg.kpiCards.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
                          {msg.kpiCards.map((card, cIdx) => (
                            <div
                              key={cIdx}
                              className={`p-2.5 rounded-xl border ${
                                card.color === 'rose' ? 'bg-rose-50/80 border-rose-200 text-rose-950' :
                                card.color === 'emerald' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' :
                                card.color === 'amber' ? 'bg-amber-50/80 border-amber-200 text-amber-950' :
                                'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                              }`}
                            >
                              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</div>
                              <div className="text-base font-black mt-0.5">{card.value}</div>
                              {card.subtext && <div className="text-[10px] text-slate-500 mt-0.5">{card.subtext}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actionable Navigator links */}
                      {msg.navigators && msg.navigators.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                          {msg.navigators.map((nav, nIdx) => (
                            <button
                              key={nIdx}
                              onClick={() => {
                                onNavigate(nav.navigatorId);
                                setIsOpen(false);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
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
                            className={`flex items-center gap-1 hover:text-indigo-600 transition font-medium ${activeSpeechMsgId === msg.id ? 'text-indigo-600 font-bold' : ''}`}
                            title="Read answer aloud"
                          >
                            {activeSpeechMsgId === msg.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            <span>{activeSpeechMsgId === msg.id ? 'Pause' : 'Read'}</span>
                          </button>
                        )}

                        {/* Copy Response */}
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="flex items-center gap-1 hover:text-slate-700 transition"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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
                            className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-full text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition shadow-2xs text-left"
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
                <div className="flex gap-2.5 items-center text-xs text-slate-500">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-2xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200" />
                    <span className="text-slate-600 font-medium ml-1">Analyzing database records...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              {voiceState.error && (
                <div className="mb-2 px-2.5 py-1 bg-rose-50 border border-rose-200 text-[11px] text-rose-700 rounded-lg flex items-center gap-1.5">
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
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-300'
                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
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
                  placeholder={voiceState.isListening ? 'Listening to your voice...' : 'Ask SML Smart Assistant (English/Bangla)...'}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-hidden transition font-medium text-slate-800 placeholder:text-slate-400"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                  title="Send question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
