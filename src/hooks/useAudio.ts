import { useRef } from 'react';
import type { Bells } from '../services/bell';
import { loadBells, strikeBell } from '../services/bell';

interface UseAudioReturn {
  readonly ensureAudio: () => void;
  readonly strikeBegin: () => void;
  readonly strikeComplete: () => void;
}

export function useAudio(): UseAudioReturn {
  const bellsRef = useRef<Bells | null>(null);

  function ensureAudio(): void {
    if (!bellsRef.current) {
      bellsRef.current = loadBells();
    }
  }

  function strikeBegin(): void {
    if (bellsRef.current) {
      strikeBell(bellsRef.current.begin);
    }
  }

  function strikeComplete(): void {
    if (bellsRef.current) {
      strikeBell(bellsRef.current.complete);
    }
  }

  return { ensureAudio, strikeBegin, strikeComplete };
}
