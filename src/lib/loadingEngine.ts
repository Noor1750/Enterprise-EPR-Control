import { useState, useEffect } from 'react';

// Global Page Loading & Progress Engine

export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0 to 100
  title: string;
  subtitle?: string;
  stepName?: string;
  isSimulated?: boolean;
}

let currentLoadingState: LoadingState = {
  isLoading: false,
  progress: 0,
  title: 'Loading Workspace...',
  subtitle: 'Please wait while resources are prepared.',
  isSimulated: true
};

let listeners: Array<(state: LoadingState) => void> = [];
let simulatedInterval: any = null;

export function getGlobalLoadingState(): LoadingState {
  return { ...currentLoadingState };
}

export function useGlobalLoading(): LoadingState {
  const [state, setState] = useState<LoadingState>(getGlobalLoadingState);
  useEffect(() => {
    return subscribeLoadingState(setState);
  }, []);
  return state;
}

export function subscribeLoadingState(listener: (state: LoadingState) => void): () => void {
  listeners.push(listener);
  listener({ ...currentLoadingState });
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  const copy = { ...currentLoadingState };
  listeners.forEach(l => l(copy));
}

/**
 * Starts a global loading screen with smooth progress animation
 */
export function startGlobalLoading(
  title: string = 'Loading ERP Module...', 
  subtitle: string = 'Synchronizing records...',
  estimatedDurationMs: number = 1000
) {
  if (simulatedInterval) {
    clearInterval(simulatedInterval);
    simulatedInterval = null;
  }

  currentLoadingState = {
    isLoading: true,
    progress: 5,
    title,
    subtitle,
    isSimulated: true
  };
  notifyListeners();

  const stepMs = 50;
  const totalSteps = Math.max(10, Math.round(estimatedDurationMs / stepMs));
  let step = 0;

  simulatedInterval = setInterval(() => {
    step++;
    // Easing curve: faster at start, slows down as it approaches 95%
    if (step <= totalSteps && currentLoadingState.isLoading) {
      const ratio = step / totalSteps;
      const targetPercent = Math.min(94, Math.round(10 + Math.sin((ratio * Math.PI) / 2) * 84));
      if (targetPercent > currentLoadingState.progress) {
        currentLoadingState.progress = targetPercent;
        notifyListeners();
      }
    }
  }, stepMs);
}

/**
 * Updates exact percentage for deterministic operations (e.g. bulk uploads, multi-step syncs)
 */
export function updateGlobalProgress(progressPercent: number, title?: string, subtitle?: string, stepName?: string) {
  if (simulatedInterval) {
    clearInterval(simulatedInterval);
    simulatedInterval = null;
  }

  currentLoadingState = {
    ...currentLoadingState,
    isLoading: true,
    progress: Math.min(100, Math.max(0, Math.round(progressPercent))),
    title: title || currentLoadingState.title,
    subtitle: subtitle !== undefined ? subtitle : currentLoadingState.subtitle,
    stepName: stepName !== undefined ? stepName : currentLoadingState.stepName,
    isSimulated: false
  };
  notifyListeners();
}

/**
 * Completes and gently dismisses the loading screen
 */
export function stopGlobalLoading(delayMs: number = 200): Promise<void> {
  return new Promise((resolve) => {
    if (simulatedInterval) {
      clearInterval(simulatedInterval);
      simulatedInterval = null;
    }

    // Jump to 100% first
    currentLoadingState = {
      ...currentLoadingState,
      progress: 100,
      subtitle: 'Complete'
    };
    notifyListeners();

    setTimeout(() => {
      currentLoadingState = {
        ...currentLoadingState,
        isLoading: false,
        progress: 100
      };
      notifyListeners();
      resolve();
    }, delayMs);
  });
}

/**
 * Helper to wrap any async promise with simulated global loading
 */
export async function withGlobalLoading<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  title: string = 'Loading Data...',
  subtitle: string = 'Processing...',
  minDisplayMs: number = 400
): Promise<T> {
  startGlobalLoading(title, subtitle, 800);
  const start = Date.now();
  try {
    const result = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
    const elapsed = Date.now() - start;
    if (elapsed < minDisplayMs) {
      await new Promise(r => setTimeout(r, minDisplayMs - elapsed));
    }
    await stopGlobalLoading(150);
    return result;
  } catch (err) {
    await stopGlobalLoading(100);
    throw err;
  }
}
