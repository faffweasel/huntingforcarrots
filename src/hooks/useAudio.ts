import { useRef } from 'react';
import type { BellBuffers } from '../services/bell';
import { loadBells, strikeBell } from '../services/bell';

const RETRY_COOLDOWN_MS = 30_000;

interface UseAudioReturn {
  readonly ensureAudio: () => Promise<void>;
  readonly strikeBegin: () => void;
  readonly strikeComplete: () => void;
}

export function useAudio(): UseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const bellsRef = useRef<BellBuffers | null>(null);
  const loadFailed = useRef(false);
  const lastAttemptRef = useRef(0);

  async function ensureAudio(): Promise<void> {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (!bellsRef.current) {
      if (loadFailed.current) {
        if (Date.now() - lastAttemptRef.current < RETRY_COOLDOWN_MS) return;
      }
      try {
        lastAttemptRef.current = Date.now();
        bellsRef.current = await loadBells(ctxRef.current);
        loadFailed.current = false;
      } catch {
        loadFailed.current = true;
      }
    }
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
  }

  function strikeBegin(): void {
    if (ctxRef.current && bellsRef.current) {
      strikeBell(ctxRef.current, bellsRef.current.begin);
    }
  }

  function strikeComplete(): void {
    if (ctxRef.current && bellsRef.current) {
      strikeBell(ctxRef.current, bellsRef.current.complete);
    }
  }

  return { ensureAudio, strikeBegin, strikeComplete };
}
