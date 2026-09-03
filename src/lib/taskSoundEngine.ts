/**
 * Smart Sound Synthesizer for Daily Task Notification Popups
 * Built with native Web Audio API (zero external audio file dependencies).
 * Generates crisp, polyphonic, customizable chimes and tones with volume control.
 */

export type TaskSoundType = 
  | 'gentle-chime' 
  | 'marimba' 
  | 'crystal-harp' 
  | 'zen-bell' 
  | 'energetic-pulse' 
  | 'subtle-ding'
  | 'mute';

export interface SoundOption {
  id: TaskSoundType;
  name: string;
  description: string;
  badge: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { 
    id: 'gentle-chime', 
    name: 'Gentle Chime', 
    description: 'Harmonic 4-note ascending celestial chime',
    badge: 'Recommended'
  },
  { 
    id: 'marimba', 
    name: 'Executive Marimba', 
    description: 'Warm acoustic wooden mallet chord',
    badge: 'Warm & Professional'
  },
  { 
    id: 'crystal-harp', 
    name: 'Crystal Harp', 
    description: 'Ethereal bell-like glass harmonics',
    badge: 'Crisp'
  },
  { 
    id: 'zen-bell', 
    name: 'Zen Bell', 
    description: '432Hz calming resonant meditation bell',
    badge: 'Mindful'
  },
  { 
    id: 'energetic-pulse', 
    name: 'Energetic Pulse', 
    description: 'Bright dual-tone modern tech alert',
    badge: 'Active'
  },
  { 
    id: 'subtle-ding', 
    name: 'Subtle Ding', 
    description: 'Soft, single-tone unobtrusive notification',
    badge: 'Minimal'
  },
  { 
    id: 'mute', 
    name: 'Mute / Silent', 
    description: 'Visual notification only (no sound)',
    badge: 'Silent'
  }
];

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioCtxClass();
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext not supported or blocked:', err);
    return null;
  }
}

/**
 * Synthesizes and plays the chosen sound using Web Audio API
 */
export async function playTaskNotificationSound(
  soundKey: TaskSoundType = 'gentle-chime',
  volume: number = 0.75
): Promise<void> {
  if (soundKey === 'mute') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const safeVolume = Math.max(0.01, Math.min(1.0, volume));
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(safeVolume * 0.45, now);
    masterGain.connect(ctx.destination);

    switch (soundKey) {
      case 'gentle-chime': {
        // C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const startTime = now + i * 0.08;
          const duration = 0.85;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      case 'marimba': {
        // F4, A4, C5, F5
        const chords = [349.23, 440.00, 523.25, 698.46];
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const startTime = now + idx * 0.05;
          const duration = 0.65;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          overtone.type = 'sine';
          overtone.frequency.setValueAtTime(freq * 3.01, startTime); // wood harmonic ratio

          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.6, startTime + 0.015);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(noteGain);
          overtone.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          overtone.start(startTime);
          osc.stop(startTime + duration);
          overtone.stop(startTime + duration);
        });
        break;
      }

      case 'crystal-harp': {
        // D5 (587.33), F#5 (739.99), A5 (880.00), D6 (1174.66)
        const freqs = [587.33, 739.99, 880.00, 1174.66];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const startTime = now + idx * 0.09;
          const duration = 1.1;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.002, startTime + duration);

          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.5, startTime + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      case 'zen-bell': {
        // 432 Hz fundamental with natural singing bowl partials
        const fundamental = 432;
        const partials = [
          { mult: 1.0, gain: 0.7, decay: 2.2 },
          { mult: 2.76, gain: 0.25, decay: 1.5 },
          { mult: 5.4, gain: 0.12, decay: 0.9 }
        ];

        partials.forEach(({ mult, gain: partialGainRatio, decay }) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(fundamental * mult, now);

          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(partialGainRatio * 0.8, now + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(now);
          osc.stop(now + decay);
        });
        break;
      }

      case 'energetic-pulse': {
        // Two snappy ascending bursts
        const pulses = [
          { freq: 880, startOffset: 0, dur: 0.18 },
          { freq: 1318.51, startOffset: 0.13, dur: 0.35 }
        ];
        pulses.forEach(({ freq, startOffset, dur }) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const startTime = now + startOffset;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.7, startTime + 0.01);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + dur);
        });
        break;
      }

      case 'subtle-ding': {
        // Soft single bell ding
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.7, now + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.75);
        break;
      }
    }
  } catch (err) {
    console.warn('Failed to play task notification sound:', err);
  }
}

/**
 * Plays a dedicated, crisp assignment alert chime when a new task is assigned to an employee.
 * Uses a cheerful ascending 4-note cadence with warm harmonics.
 */
export function playTaskAssignedSound(preferredSound?: TaskSoundType, volume: number = 0.85) {
  playUniversalAssignmentSound('tasks', preferredSound, volume);
}

export type UniversalAssignmentModule = 
  | 'tasks'
  | 'leave'
  | 'kpi'
  | '5s-management'
  | 'breakdown'
  | 'shifts'
  | 'skill-dashboard'
  | 'practices'
  | 'overtime'
  | 'general';

/**
 * Universal Sound Synthesizer for any assignment across all navigators
 * Synthesizes unique harmonic profiles tailored to each module's context:
 * - Breakdown: Urgent & energetic tech pulse
 * - Shifts: Warm acoustic rotation marimba chord
 * - Leave: Graceful crystal harp cadence
 * - KPI: Celebratory high-frequency grand chime
 * - 5S: Sparkling crisp shimmer
 * - Skill Matrix: Resonant bronze bell
 * - Best Practices: Triumphant brass fanfare
 * - Overtime: Gentle reminder chime
 */
export function playUniversalAssignmentSound(
  moduleType: UniversalAssignmentModule = 'general',
  preferredSound?: TaskSoundType,
  volume: number = 0.85
) {
  if (preferredSound === 'mute') return;

  if (preferredSound && preferredSound !== 'gentle-chime') {
    // If employee customized their sound, play their chosen sound
    playTaskNotificationSound(preferredSound, volume);
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const safeVolume = Math.max(0.01, Math.min(1.0, volume));
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(safeVolume * 0.5, now);
    masterGain.connect(ctx.destination);

    // Module-specific sound signatures
    let notes: { freq: number; delay: number; dur: number; vol: number; type?: OscillatorType }[] = [];

    switch (moduleType) {
      case 'breakdown':
        // Urgent rising alert cadence for machine breakdown tickets
        notes = [
          { freq: 587.33, delay: 0.00, dur: 0.20, vol: 0.8, type: 'sawtooth' },
          { freq: 783.99, delay: 0.10, dur: 0.25, vol: 0.85, type: 'sawtooth' },
          { freq: 1046.50, delay: 0.22, dur: 0.55, vol: 0.9, type: 'sine' },
        ];
        break;

      case 'shifts':
        // Warm acoustic rotation chord: A4 -> C#5 -> E5 -> A5
        notes = [
          { freq: 440.00, delay: 0.00, dur: 0.35, vol: 0.65, type: 'triangle' },
          { freq: 554.37, delay: 0.07, dur: 0.38, vol: 0.70, type: 'triangle' },
          { freq: 659.25, delay: 0.15, dur: 0.42, vol: 0.75, type: 'triangle' },
          { freq: 880.00, delay: 0.23, dur: 0.80, vol: 0.85, type: 'sine' },
        ];
        break;

      case 'leave':
        // Graceful crystal harp: D5 -> F#5 -> A5 -> D6
        notes = [
          { freq: 587.33, delay: 0.00, dur: 0.45, vol: 0.6, type: 'sine' },
          { freq: 739.99, delay: 0.09, dur: 0.50, vol: 0.7, type: 'sine' },
          { freq: 880.00, delay: 0.18, dur: 0.60, vol: 0.75, type: 'sine' },
          { freq: 1174.66, delay: 0.28, dur: 0.95, vol: 0.85, type: 'sine' },
        ];
        break;

      case 'kpi':
        // Celebratory grand chime: C5 -> E5 -> G5 -> C6 -> E6
        notes = [
          { freq: 523.25, delay: 0.00, dur: 0.35, vol: 0.6, type: 'sine' },
          { freq: 659.25, delay: 0.07, dur: 0.40, vol: 0.65, type: 'sine' },
          { freq: 783.99, delay: 0.14, dur: 0.45, vol: 0.7, type: 'sine' },
          { freq: 1046.50, delay: 0.22, dur: 0.60, vol: 0.8, type: 'sine' },
          { freq: 1318.51, delay: 0.30, dur: 0.90, vol: 0.85, type: 'sine' },
        ];
        break;

      case '5s-management':
        // Sparkling crisp shimmer
        notes = [
          { freq: 880.00, delay: 0.00, dur: 0.25, vol: 0.6, type: 'sine' },
          { freq: 1174.66, delay: 0.08, dur: 0.30, vol: 0.7, type: 'triangle' },
          { freq: 1760.00, delay: 0.17, dur: 0.85, vol: 0.85, type: 'sine' },
        ];
        break;

      case 'skill-dashboard':
        // Resonant bronze bell: B4 -> E5 -> G#5 -> B5
        notes = [
          { freq: 493.88, delay: 0.00, dur: 0.40, vol: 0.6, type: 'triangle' },
          { freq: 659.25, delay: 0.08, dur: 0.45, vol: 0.7, type: 'sine' },
          { freq: 830.61, delay: 0.16, dur: 0.50, vol: 0.75, type: 'sine' },
          { freq: 987.77, delay: 0.25, dur: 0.90, vol: 0.85, type: 'sine' },
        ];
        break;

      case 'practices':
        // Triumphant Kaizen fanfare: F4 -> A4 -> C5 -> F5
        notes = [
          { freq: 349.23, delay: 0.00, dur: 0.30, vol: 0.65, type: 'triangle' },
          { freq: 440.00, delay: 0.08, dur: 0.35, vol: 0.70, type: 'triangle' },
          { freq: 523.25, delay: 0.16, dur: 0.40, vol: 0.75, type: 'sine' },
          { freq: 698.46, delay: 0.25, dur: 0.85, vol: 0.90, type: 'sine' },
        ];
        break;

      case 'overtime':
        // Warm dual-bell pulse
        notes = [
          { freq: 659.25, delay: 0.00, dur: 0.40, vol: 0.7, type: 'sine' },
          { freq: 880.00, delay: 0.12, dur: 0.70, vol: 0.8, type: 'sine' },
        ];
        break;

      case 'tasks':
      default:
        // Signature 4-note assignment fanfare: G4 -> C5 -> E5 -> G5 (Golden Triad)
        notes = [
          { freq: 392.00, delay: 0.00, dur: 0.35, vol: 0.6, type: 'sine' },
          { freq: 523.25, delay: 0.08, dur: 0.40, vol: 0.7, type: 'sine' },
          { freq: 659.25, delay: 0.16, dur: 0.45, vol: 0.75, type: 'sine' },
          { freq: 783.99, delay: 0.25, dur: 0.95, vol: 0.9, type: 'sine' },
        ];
        break;
    }

    notes.forEach(({ freq, delay, dur, vol, type = 'sine' }) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const startTime = now + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(noteGain);
      overtone.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + dur);
      overtone.stop(startTime + dur);
    });
  } catch (err) {
    console.warn('Failed to play universal assignment sound:', err);
  }
}

