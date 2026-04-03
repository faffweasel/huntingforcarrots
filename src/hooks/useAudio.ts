import { useRef } from 'react';
import type { BellBuffers } from '../services/bell';
import { loadBells, strikeBell } from '../services/bell';

interface UseAudioReturn {
  readonly ensureAudio: () => Promise<void>;
  readonly strikeBegin: () => void;
  readonly strikeComplete: () => void;
}

export function useAudio(): UseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const bellsRef = useRef<BellBuffers | null>(null);

  async function ensureAudio(): Promise<void> {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (!bellsRef.current) {
      try {
        bellsRef.current = await loadBells(ctxRef.current);
      } catch {
        /* audio files may not exist yet */
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
