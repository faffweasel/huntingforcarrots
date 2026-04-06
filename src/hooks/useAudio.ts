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
  const unlockedRef = useRef(false);

  /**
   * Call synchronously from a user gesture handler.
   * resume() and the silent-buffer iOS unlock run in the
   * synchronous call stack; buffer loading is async after.
   */
  function ensureAudio(): Promise<void> {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;

    // iOS WebKit requires resume() in the synchronous call stack
    // of the user gesture — not after an await or inside .then()
    ctx.resume();

    // Play a silent buffer once to unlock audio on iOS
    // (works around the hardware mute switch restriction)
    if (!unlockedRef.current) {
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start();
      unlockedRef.current = true;
    }

    if (bellsRef.current) return Promise.resolve();

    if (loadFailed.current && Date.now() - lastAttemptRef.current < RETRY_COOLDOWN_MS) {
      return Promise.resolve();
    }

    lastAttemptRef.current = Date.now();
    return loadBells(ctx).then(
      (buffers) => {
        bellsRef.current = buffers;
        loadFailed.current = false;
      },
      () => {
        loadFailed.current = true;
      }
    );
  }

  function strikeBegin(): void {
    const ctx = ctxRef.current;
    if (ctx && bellsRef.current) {
      // Re-resume in case iOS suspended the context (e.g. tab backgrounded)
      ctx.resume();
      strikeBell(ctx, bellsRef.current.begin);
    }
  }

  function strikeComplete(): void {
    const ctx = ctxRef.current;
    if (ctx && bellsRef.current) {
      ctx.resume();
      strikeBell(ctx, bellsRef.current.complete);
    }
  }

  return { ensureAudio, strikeBegin, strikeComplete };
}
