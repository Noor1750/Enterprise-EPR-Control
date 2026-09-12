/**
 * Web Speech Recognition and Speech Synthesis Controller for SML Smart Assistant
 * Supports natural female voices, speech-to-text, audio control and playback interruption.
 */

// Define SpeechRecognition interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface VoiceRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export class AssistantAudioManager {
  private recognition: any = null;
  private isListeningInternal = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChangeCb: ((state: Partial<VoiceRecognitionState>) => void) | null = null;
  private onSpeakingChangeCb: ((isSpeaking: boolean) => void) | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initRecognition();
    this.initVoiceCache();
  }

  private notifyState(state: Partial<VoiceRecognitionState>) {
    if (this.onStateChangeCb) {
      this.onStateChangeCb(state);
    }
  }

  public setCallbacks(
    onStateChange: (state: Partial<VoiceRecognitionState>) => void,
    onSpeakingChange?: (isSpeaking: boolean) => void
  ) {
    this.onStateChangeCb = onStateChange;
    if (onSpeakingChange) {
      this.onSpeakingChangeCb = onSpeakingChange;
    }
  }

  public startListening(language = 'en-US') {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      this.notifyState({ error: 'Speech recognition is not supported in this browser environment.' });
      return;
    }

    try {
      this.recognition.lang = language;
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }

  public stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (_) {}
    this.isListeningInternal = false;
    this.notifyState({ isListening: false });
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListeningInternal = true;
          this.notifyState({ isListening: true, error: null });
        };

        this.recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          this.notifyState({
            transcript: final,
            interimTranscript: interim
          });
        };

        this.recognition.onerror = (event: any) => {
          this.isListeningInternal = false;
          let errMsg = 'Speech recognition error';
          if (event.error === 'not-allowed') {
            errMsg = 'Microphone access was denied. Please allow microphone permission in your browser.';
          } else if (event.error === 'no-speech') {
            errMsg = 'No speech was detected. Please try speaking again.';
          } else if (event.error === 'network') {
            errMsg = 'Network connection issue for speech recognition.';
          }
          this.notifyState({ isListening: false, error: errMsg });
        };

        this.recognition.onend = () => {
          this.isListeningInternal = false;
          this.notifyState({ isListening: false });
        };
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }
  }

  private initVoiceCache() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      this.cachedVoices = window.speechSynthesis.getVoices();
    };
  }

  public isSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSynthesisSupported()) return [];
    const voices = window.speechSynthesis.getVoices();
    return voices.length > 0 ? voices : this.cachedVoices;
  }

  /**
   * Classify voice gender using recognized platform voice names & identifiers
   */
  public classifyVoiceGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
    const nameLower = voice.name.toLowerCase();
    const uriLower = voice.voiceURI.toLowerCase();
    const combined = `${nameLower} ${uriLower}`;

    const femaleKeywords = [
      'female', 'woman', 'zira', 'samantha', 'jenny', 'victoria', 'karen', 'moira',
      'fiona', 'serena', 'ava', 'allison', 'aria', 'michelle', 'natasha', 'anita',
      'susan', 'kate', 'stephanie', 'zoe', 'tessa', 'veena', 'sangeeta', 'kavita',
      'heera', 'hazel', 'catherine', 'clara', 'amy', 'emma', 'joanna', 'kendra',
      'kimberly', 'salli', 'ivy', 'olivia', 'chloe', 'ayesha', 'farhana', 'fatima'
    ];

    const maleKeywords = [
      'male', 'man', 'david', 'mark', 'george', 'guy', 'ryan', 'daniel', 'arthur',
      'oliver', 'liam', 'alex', 'fred', 'tom', 'james', 'richard', 'brian', 'lee',
      'rishi', 'pradeep', 'ananya', 'hemant', 'amit', 'stephen', 'paul', 'matthew',
      'justin', 'joey', 'russell', 'geraint', 'conor', 'rahim', 'tariq', 'arun'
    ];

    for (const kw of femaleKeywords) {
      if (combined.includes(kw)) return 'female';
    }

    for (const kw of maleKeywords) {
      if (combined.includes(kw)) return 'male';
    }

    return 'unknown';
  }

  /**
   * Categorize all detected system voices into Female and Male groups
   */
  public getAvailableVoicesCategorized(): {
    female: SpeechSynthesisVoice[];
    male: SpeechSynthesisVoice[];
    all: SpeechSynthesisVoice[];
  } {
    const all = this.getAvailableVoices();
    const female: SpeechSynthesisVoice[] = [];
    const male: SpeechSynthesisVoice[] = [];

    all.forEach(v => {
      const g = this.classifyVoiceGender(v);
      if (g === 'female') female.push(v);
      else if (g === 'male') male.push(v);
      else {
        // Fallback guess based on standard OS ordering
        female.push(v);
      }
    });

    return { female, male, all };
  }

  /**
   * Look up the best voice matching desired gender (female or male)
   */
  public getBestVoiceByGender(
    gender: 'female' | 'male',
    lang = 'en'
  ): { voice: SpeechSynthesisVoice | null; recommendedPitch: number } {
    if (!this.isSynthesisSupported()) {
      return { voice: null, recommendedPitch: gender === 'male' ? 0.88 : 1.08 };
    }

    const voices = this.getAvailableVoices();
    if (!voices || voices.length === 0) {
      return { voice: null, recommendedPitch: gender === 'male' ? 0.88 : 1.08 };
    }

    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    const targetPool = langVoices.length > 0 ? langVoices : voices;

    if (gender === 'male') {
      const maleKeywords = [
        'natural male', 'guy', 'ryan', 'david', 'mark', 'george', 'daniel', 
        'oliver', 'arthur', 'liam', 'alex', 'tom', 'james', 'richard', 
        'google uk english male', 'microsoft david', 'microsoft mark', 'male'
      ];

      for (const kw of maleKeywords) {
        const found = targetPool.find(v => v.name.toLowerCase().includes(kw));
        if (found) return { voice: found, recommendedPitch: 0.92 };
      }

      // Fallback male classification
      const anyMale = targetPool.find(v => this.classifyVoiceGender(v) === 'male');
      if (anyMale) return { voice: anyMale, recommendedPitch: 0.90 };

      // If no native male voice is installed in OS, pick default and down-pitch for masculine resonance
      return { voice: targetPool[0] || null, recommendedPitch: 0.84 };
    } else {
      // Female voice lookup
      const femaleKeywords = [
        'natural female', 'jenny', 'aria', 'samantha', 'zira', 'victoria', 
        'ava', 'serena', 'karen', 'moira', 'allison', 'google us english', 
        'microsoft zira', 'microsoft jenny', 'female'
      ];

      for (const kw of femaleKeywords) {
        const found = targetPool.find(v => v.name.toLowerCase().includes(kw));
        if (found) return { voice: found, recommendedPitch: 1.06 };
      }

      const anyFemale = targetPool.find(v => this.classifyVoiceGender(v) === 'female');
      if (anyFemale) return { voice: anyFemale, recommendedPitch: 1.08 };

      return { voice: targetPool[0] || null, recommendedPitch: 1.10 };
    }
  }

  /**
   * Look up female voice (backward compatibility)
   */
  public getBestFemaleVoice(lang = 'en'): SpeechSynthesisVoice | null {
    return this.getBestVoiceByGender('female', lang).voice;
  }

  /**
   * Look up male voice
   */
  public getBestMaleVoice(lang = 'en'): SpeechSynthesisVoice | null {
    return this.getBestVoiceByGender('male', lang).voice;
  }

  /**
   * Speak text aloud using gender-tailored acoustic timbre and natural speech synthesis.
   */
  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      gender?: 'female' | 'male' | 'auto';
      voiceURI?: string;
      onEnd?: () => void;
      onError?: () => void;
    } = {}
  ) {
    if (!this.isSynthesisSupported()) return;

    // Stop any ongoing speech
    this.stopSpeaking();

    // Strip markdown formatting, symbols, and code fences for clear speech
    const cleanSpeechText = text
      .replace(/[*_#`~>]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(\r\n|\n|\r)/gm, '. ')
      .replace(/•/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeechText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
      const targetGender: 'female' | 'male' = options.gender === 'male' ? 'male' : 'female';
      const hasBengali = /[\u0980-\u09FF]/.test(cleanSpeechText);
      const lang = hasBengali ? 'bn' : 'en';

      const voices = this.getAvailableVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;

      if (options.voiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === options.voiceURI) || null;
      }

      const genderResult = this.getBestVoiceByGender(targetGender, lang);
      if (!selectedVoice) {
        selectedVoice = genderResult.voice;
      }

      // Configure natural pitch:
      // Male voices are grounded and deeper (~0.88), Female voices are crisp and articulate (~1.08)
      if (options.pitch !== undefined) {
        utterance.pitch = options.pitch;
      } else {
        utterance.pitch = genderResult.recommendedPitch;
      }

      utterance.rate = options.rate ?? (targetGender === 'male' ? 1.0 : 1.02);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        if (this.onSpeakingChangeCb) this.onSpeakingChangeCb(true);
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (this.onSpeakingChangeCb) this.onSpeakingChangeCb(false);
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        if (this.onSpeakingChangeCb) this.onSpeakingChangeCb(false);
        if (options.onError) options.onError();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      if (this.onSpeakingChangeCb) this.onSpeakingChangeCb(false);
    }
  }

  /**
   * Quick preview of female or male voice
   */
  public testVoice(gender: 'female' | 'male', customText?: string) {
    const text = customText || (
      gender === 'male'
        ? "Assalamu Alaikum. This is your male virtual assistant voice. Shop-floor diagnostics and maintenance oversight ready."
        : "Hello! This is your female virtual assistant voice. Enterprise operations and factory workflow ready."
    );

    this.speak(text, {
      gender,
      rate: gender === 'male' ? 1.0 : 1.02
    });
  }

  public stopSpeaking() {
    if (!this.isSynthesisSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
    this.currentUtterance = null;
    if (this.onSpeakingChangeCb) {
      this.onSpeakingChangeCb(false);
    }
  }

  public isSpeaking(): boolean {
    if (!this.isSynthesisSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}

export const assistantAudio = new AssistantAudioManager();

export function speakAssistantText(
  text: string, 
  options: { 
    enabled?: boolean; 
    rate?: number; 
    pitch?: number; 
    gender?: 'female' | 'male' | 'auto';
    voiceURI?: string;
    language?: string; 
    onEnd?: () => void;
  } = {}
) {
  if (options.enabled === false) return;
  assistantAudio.speak(text, {
    rate: options.rate,
    pitch: options.pitch,
    gender: options.gender,
    voiceURI: options.voiceURI,
    onEnd: options.onEnd
  });
}

export function stopSpeechSynthesis() {
  assistantAudio.stopSpeaking();
}

