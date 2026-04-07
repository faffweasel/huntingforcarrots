import { useRef } from 'react';
import type { Bells } from '../services/bell';
import { loadBells, strikeBell, strikeBellAndWait } from '../services/bell';

interface UseAudioReturn {
  readonly ensureAudio: () => void;
  readonly strikeBeginAndWait: (durationMinutes: number) => Promise<void>;
  readonly strikeComplete: () => void;
}

export function useAudio(): UseAudioReturn {
  const bellsRef = useRef<Bells | null>(null);

  function ensureAudio(): void {
    if (!bellsRef.current) {
      bellsRef.current = loadBells();
    }
  }

  function strikeBeginAndWait(durationMinutes: number): Promise<void> {
    if (bellsRef.current) {
      const bell = durationMinutes >= 10 ? bellsRef.current.zazen : bellsRef.current.single;
      return strikeBellAndWait(bell);
    }
    return Promise.resolve();
  }

  function strikeComplete(): void {
    if (bellsRef.current) {
      strikeBell(bellsRef.current.single);
    }
  }

  return { ensureAudio, strikeBeginAndWait, strikeComplete };
}
