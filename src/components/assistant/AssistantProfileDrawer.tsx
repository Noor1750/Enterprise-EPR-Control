import React, { useState } from 'react';
import { 
  AssistantProfile, 
  ASSISTANT_PROFILES 
} from '../../types/assistant';
import { 
  Bot, 
  Check, 
  Sparkles, 
  Volume2, 
  UserCheck, 
  BadgeCheck, 
  Zap, 
  Briefcase,
  Play,
  RotateCcw
} from 'lucide-react';
import { speakAssistantText, stopSpeechSynthesis } from '../../lib/assistant/assistantAudio';

interface AssistantProfileDrawerProps {
  activeProfileId: string;
  onSelectProfile: (profile: AssistantProfile) => void;
  onClose?: () => void;
  voiceEnabled: boolean;
}

export const AssistantProfileDrawer: React.FC<AssistantProfileDrawerProps> = ({
  activeProfileId,
  onSelectProfile,
  onClose,
  voiceEnabled
}) => {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');

  const handlePreviewVoice = (profile: AssistantProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeechSynthesis();

    if (playingVoiceId === profile.id) {
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(profile.id);
    speakAssistantText(profile.sampleGreeting, {
      enabled: true,
      rate: profile.speechRate,
      pitch: profile.speechPitch,
      gender: profile.gender,
      language: 'en-US',
      onEnd: () => setPlayingVoiceId(null)
    });

    // Reset voice player state fallback
    setTimeout(() => {
      setPlayingVoiceId(null);
    }, 6000);
  };

  const handleQuickTestGender = (gender: 'female' | 'male') => {
    stopSpeechSynthesis();
    setPlayingVoiceId(`test-${gender}`);
    const sample = gender === 'female'
      ? "Hello! This is the Female Virtual Assistant voice for SML Trims Operations."
      : "Assalamu Alaikum. This is the Male Virtual Assistant voice for SML Equipment and TPM Maintenance.";
    
    speakAssistantText(sample, {
      enabled: true,
      gender,
      onEnd: () => setPlayingVoiceId(null)
    });

    setTimeout(() => setPlayingVoiceId(null), 4500);
  };

  const filteredProfiles = ASSISTANT_PROFILES.filter(p => {
    if (genderFilter === 'all') return true;
    return p.gender === genderFilter;
  });

  return (
    <div id="assistant-profiles-panel" className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Virtual Assistant Profiles & Voices</h2>
              <p className="text-xs text-slate-300">
                Specialized digital co-pilots with gender-tailored voice synthesis (Female & Male).
              </p>
            </div>
          </div>

          {/* Quick Voice Gender Audition */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="test-female-voice-btn"
              onClick={() => handleQuickTestGender('female')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                playingVoiceId === 'test-female'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-sm animate-pulse'
                  : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-800/60'
              }`}
              title="Audition Female TTS Voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Hear Female Voice</span>
            </button>

            <button
              type="button"
              id="test-male-voice-btn"
              onClick={() => handleQuickTestGender('male')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                playingVoiceId === 'test-male'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm animate-pulse'
                  : 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border-blue-800/60'
              }`}
              title="Audition Male TTS Voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Hear Male Voice</span>
            </button>
          </div>
        </div>

        {/* Gender Filter Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="filter-all-profiles-btn"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                genderFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Co-Pilots (5)
            </button>
            <button
              type="button"
              id="filter-female-profiles-btn"
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
                genderFilter === 'female'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800/70 text-rose-300 hover:bg-slate-800'
              }`}
            >
              <span>👩 Female Voices (3)</span>
            </button>
            <button
              type="button"
              id="filter-male-profiles-btn"
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
                genderFilter === 'male'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/70 text-blue-300 hover:bg-slate-800'
              }`}
            >
              <span>👨 Male Voices (2)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            Click "Hear Voice" to audition specific persona tone
          </span>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredProfiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const isPlaying = playingVoiceId === profile.id;

          return (
            <div
              key={profile.id}
              id={`assistant-profile-card-${profile.id}`}
              onClick={() => onSelectProfile(profile)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                  : 'bg-slate-900/70 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Active Assistant</span>
                </div>
              )}

              {/* Profile Bio & Avatar Header */}
              <div>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border-2 shadow-sm"
                      style={{ borderColor: profile.auraColor }}
                    />
                    <span 
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-white shadow"
                      style={{ backgroundColor: profile.auraColor }}
                    >
                      ✓
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 pr-16">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">{profile.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium text-slate-300 bg-slate-800 border border-slate-700">
                        {profile.departmentFocus}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                        profile.gender === 'female'
                          ? 'bg-rose-950/70 text-rose-300 border-rose-800/70'
                          : 'bg-blue-950/70 text-blue-300 border-blue-800/70'
                      }`}>
                        {profile.gender === 'female' ? '👩 Female Voice' : '👨 Male Voice'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-blue-400 mt-0.5">{profile.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                </div>

                {/* Specialties Chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.specialty.split(',').map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-700/70 rounded-md font-medium"
                    >
                      {spec.trim()}
                    </span>
                  ))}
                </div>

                {/* Sample Greeting Snippet */}
                <div className="mt-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 italic">
                  "{profile.sampleGreeting}"
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  id={`preview-voice-btn-${profile.id}`}
                  onClick={(e) => handlePreviewVoice(profile, e)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isPlaying
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                  }`}
                  title="Test assistant speech synthesis voice"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse text-amber-400' : ''}`} />
                  <span>{isPlaying ? 'Voice Playing...' : 'Hear Voice'}</span>
                </button>

                <button
                  type="button"
                  id={`activate-profile-btn-${profile.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProfile(profile);
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Current Co-Pilot' : 'Set as Co-Pilot'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
