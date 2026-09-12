import React from 'react';

interface AssistantAudioWaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  accentColor?: string;
}

export const AssistantAudioWaveform: React.FC<AssistantAudioWaveformProps> = ({
  isSpeaking,
  isListening,
  accentColor = 'bg-blue-600'
}) => {
  if (!isSpeaking && !isListening) return null;

  const barCount = 14;
  const activeColor = isListening ? 'bg-rose-500' : accentColor;

  return (
    <div 
      id="assistant-audio-waveform-container"
      className="flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-900/90 rounded-full border border-slate-700/60 shadow-inner backdrop-blur-sm"
    >
      <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300 mr-1 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
        {isListening ? 'Listening' : 'Speaking'}
      </span>

      <div className="flex items-center gap-0.5 h-4">
        {Array.from({ length: barCount }).map((_, i) => {
          // Dynamic height variation based on index
          const delay = (i * 0.08).toFixed(2);
          return (
            <div
              key={i}
              className={`w-0.5 rounded-full ${activeColor} animate-pulse`}
              style={{
                height: `${Math.max(4, Math.sin((i / barCount) * Math.PI) * 14 + (Math.random() * 4))}px`,
                animationDuration: isListening ? '0.4s' : '0.6s',
                animationDelay: `${delay}s`
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
