import { useEffect, useRef, useState } from 'react';

function announcement(totalSeconds: number): string | null {
  if (totalSeconds === 0) return 'Timer complete';
  if (totalSeconds === 30) return '30 seconds remaining';
  if (totalSeconds === 10) return '10 seconds remaining';
  if (totalSeconds % 60 === 0) {
    const m = totalSeconds / 60;
    return `${m} ${m === 1 ? 'minute' : 'minutes'} remaining`;
  }
  return null;
}

interface UseCountdownReturn {
  readonly remaining: number;
  readonly running: boolean;
  readonly paused: boolean;
  readonly pulsing: boolean;
  readonly liveText: string;
  readonly progress: number;
  readonly start: (totalSeconds: number) => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly stop: () => void;
}

export function useCountdown(onComplete: () => void): UseCountdownReturn {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [liveText, setLiveText] = useState('');

  const remainingRef = useRef(0);
  const totalRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pulseRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Countdown tick — recursive setTimeout.
  // Each tick explicitly schedules the next. On completion, no next tick
  // is scheduled — structurally impossible to fire completion more than once.
  useEffect(() => {
    if (!running) return;

    function tick() {
      const next = remainingRef.current - 1;
      remainingRef.current = next;
      if (next <= 0) {
        remainingRef.current = 0;
        onCompleteRef.current();
        setPulsing(true);
        pulseRef.current = setTimeout(() => setPulsing(false), 2000);
        setRemaining(0);
        setRunning(false);
        setPaused(false);
        setLiveText('Timer complete');
      } else {
        setRemaining(next);
        const text = announcement(next);
        if (text) setLiveText(text);
        intervalRef.current = setTimeout(tick, 1000);
      }
    }

    intervalRef.current = setTimeout(tick, 1000);
    return () => clearTimeout(intervalRef.current);
  }, [running]);

  useEffect(() => () => clearTimeout(pulseRef.current), []);

  function start(totalSeconds: number) {
    totalRef.current = totalSeconds;
    remainingRef.current = totalSeconds;
    setRemaining(totalSeconds);
    setRunning(true);
    setPaused(false);
    const m = Math.round(totalSeconds / 60);
    setLiveText(`${m} ${m === 1 ? 'minute' : 'minutes'} remaining`);
  }

  function pause() {
    clearTimeout(intervalRef.current);
    setRunning(false);
    setPaused(true);
  }

  function resume() {
    clearTimeout(intervalRef.current);
    setRunning(true);
    setPaused(false);
  }

  function stop() {
    clearTimeout(intervalRef.current);
    setRunning(false);
    setPaused(false);
    remainingRef.current = 0;
    setRemaining(0);
    setLiveText('');
  }

  const isActive = running || paused;
  const progress = isActive && totalRef.current > 0 ? remaining / totalRef.current : 0;

  return { remaining, running, paused, pulsing, liveText, progress, start, pause, resume, stop };
}
