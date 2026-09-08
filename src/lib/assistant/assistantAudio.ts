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

  constructor() {
    this.initRecognition();
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

  public isSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  public setCallbacks(
    onStateChange: (state: Partial<VoiceRecognitionState>) => void,
    onSpeakingChange: (isSpeaking: boolean) => void
  ) {
    this.onStateChangeCb = onStateChange;
    this.onSpeakingChangeCb = onSpeakingChange;
  }

  private notifyState(state: Partial<VoiceRecognitionState>) {
    if (this.onStateChangeCb) {
      this.onStateChangeCb(state);
    }
  }

  public startListening(lang = 'en-US'): boolean {
    if (!this.recognition) {
      this.notifyState({
        isSupported: false,
        error: 'Voice recognition is not supported in this browser. Please use Chrome or Edge.'
      });
      return false;
    }

    // Stop speaking if assistant was speaking so we don't speak over user
    this.stopSpeaking();

    try {
      this.recognition.lang = lang;
      this.recognition.start();
      return true;
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        try {
          this.recognition.stop();
          setTimeout(() => this.recognition.start(), 200);
          return true;
        } catch (_) {}
      }
      this.notifyState({ error: 'Could not start microphone.' });
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.isListeningInternal = false;
      this.notifyState({ isListening: false });
    }
  }

  /**
   * Look up the best natural-sounding female voice available in the client system.
   */
  public getBestFemaleVoice(lang = 'en'): SpeechSynthesisVoice | null {
    if (!this.isSynthesisSupported()) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Filter by language prefix
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    const targetVoices = langVoices.length > 0 ? langVoices : voices;

    // Priority list of female voice keywords
    const femaleKeywords = [
      'female', 'zira', 'samantha', 'jenny', 'victoria', 'karen', 'moira', 'fiona', 
      'serena', 'ava', 'allison', 'natural', 'google us english', 'microsoft'
    ];

    for (const kw of femaleKeywords) {
      const match = targetVoices.find(v => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }

    return targetVoices[0] || null;
  }

  /**
   * Speak text aloud using natural professional tone.
   */
  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
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
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.05; // Slightly higher pitch for natural feminine timbre

      // Determine voice
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;

      if (options.voiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === options.voiceURI) || null;
      }

      if (!selectedVoice) {
        // Detect if response contains significant Bengali characters
        const hasBengali = /[\u0980-\u09FF]/.test(cleanSpeechText);
        selectedVoice = this.getBestFemaleVoice(hasBengali ? 'bn' : 'en');
      }

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
