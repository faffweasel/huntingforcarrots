import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BellBuffers } from '../../lib/bell';
import { loadBells, strikeBell } from '../../lib/bell';

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_VAL = 1;
const MAX_VAL = 60;
const DEFAULT_DURATION = 5;
const STORAGE_KEY = 'hfc-timer-duration';

const DRAG_SENSITIVITY = 48;
const FRICTION = 0.92;
const SNAP_EASE = 0.2;
const VEL_THRESHOLD = 0.05;

const DIAL_SIZE = 140;
const DIAL_R = 64;
const DIAL_C = 2 * Math.PI * DIAL_R;
const DIAL_HALF = DIAL_SIZE / 2;

const ICON_SIZE = 20;
const ICON_R = 8;
const ICON_C = 2 * Math.PI * ICON_R;
const ICON_HALF = ICON_SIZE / 2;

// ── Storage ──────────────────────────────────────────────────────────────────

function readStoredDuration(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const n = Number.parseInt(raw, 10);
      if (n >= MIN_VAL && n <= MAX_VAL) return n;
    }
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_DURATION;
}

function writeDuration(m: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(m));
  } catch {
    /* */
  }
}

function clamp(v: number): number {
  return Math.max(MIN_VAL, Math.min(MAX_VAL, v));
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

// ── Icons ────────────────────────────────────────────────────────────────────

function PlayIcon(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3 L13 8 L5 13 Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="3" width="3" height="10" rx="0.5" fill="currentColor" />
      <rect x="9.5" y="3" width="3" height="10" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function ResetIcon(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {/* Counterclockwise arc — ~300 degrees */}
      <path
        d="M8.5 2.5 A5.5 5.5 0 1 0 13.5 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Arrowhead at the top */}
      <path
        d="M5.5 2.5 L8.5 2.5 L8.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface TimerProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}

/**
 * Ambient timer — lives in the bottom-right corner of the garden.
 * Always mounted so the countdown interval survives open/close.
 */
export function Timer({ isOpen, onToggle, onClose }: TimerProps): ReactElement {
  // ── State ──────────────────────────────────────────────────────────────
  const [duration, setDuration] = useState(readStoredDuration);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [pos, setPos] = useState(duration);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────
  const posRef = useRef(duration);
  const velRef = useRef(0);
  const rafRef = useRef(0);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartPos = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const smoothVel = useRef(0);
  const hasMoved = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bellsRef = useRef<BellBuffers | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const totalRef = useRef(0);
  const pulseRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const spinRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isActive = running || paused;

  // ── Scroll value helpers ───────────────────────────────────────────────

  function commitValue(v: number) {
    const r = clamp(Math.round(v));
    posRef.current = r;
    setPos(r);
    if (r !== durationRef.current) {
      writeDuration(r);
      setDuration(r);
    }
  }

  function stopAnim() {
    cancelAnimationFrame(rafRef.current);
    velRef.current = 0;
  }

  function animate() {
    if (dragging.current) return;
    if (Math.abs(velRef.current) > VEL_THRESHOLD) {
      velRef.current *= FRICTION;
      const next = clamp(posRef.current + velRef.current);
      if (next <= MIN_VAL || next >= MAX_VAL) velRef.current = 0;
      posRef.current = next;
      setPos(next);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      velRef.current = 0;
      const target = clamp(Math.round(posRef.current));
      const diff = target - posRef.current;
      if (Math.abs(diff) < 0.005) {
        commitValue(target);
        return;
      }
      posRef.current += diff * SNAP_EASE;
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
  }

  function ptrDown(clientY: number) {
    stopAnim();
    dragging.current = true;
    hasMoved.current = false;
    dragStartY.current = clientY;
    dragStartPos.current = posRef.current;
    lastY.current = clientY;
    lastTime.current = performance.now();
    smoothVel.current = 0;
  }

  function ptrMove(clientY: number) {
    if (!dragging.current) return;
    const delta = dragStartY.current - clientY;
    if (Math.abs(delta) > 3) hasMoved.current = true;
    posRef.current = clamp(dragStartPos.current + delta / DRAG_SENSITIVITY);
    setPos(posRef.current);
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const instant = ((lastY.current - clientY) / DRAG_SENSITIVITY / dt) * 16;
      smoothVel.current = 0.7 * instant + 0.3 * smoothVel.current;
    }
    lastY.current = clientY;
    lastTime.current = now;
  }

  function ptrUp() {
    if (!dragging.current) return;
    dragging.current = false;
    velRef.current = smoothVel.current;
    rafRef.current = requestAnimationFrame(animate);
  }

  // ── Scroll event binding (open + idle only) ────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll handlers only use refs — semantically stable across renders
  useEffect(() => {
    if (!isOpen || running || paused) return;
    const el = spinRef.current;
    if (!el) return;

    function onMM(e: MouseEvent) {
      ptrMove(e.clientY);
    }
    function onMU() {
      ptrUp();
      document.removeEventListener('mousemove', onMM);
      document.removeEventListener('mouseup', onMU);
    }
    function onMD(e: MouseEvent) {
      e.preventDefault();
      ptrDown(e.clientY);
      document.addEventListener('mousemove', onMM);
      document.addEventListener('mouseup', onMU);
    }
    function onTS(e: TouchEvent) {
      ptrDown(e.touches[0].clientY);
    }
    function onTM(e: TouchEvent) {
      e.preventDefault();
      ptrMove(e.touches[0].clientY);
    }
    function onTE() {
      ptrUp();
    }
    function onW(e: WheelEvent) {
      e.preventDefault();
      stopAnim();
      posRef.current = clamp(posRef.current - (e.deltaY / DRAG_SENSITIVITY) * 0.5);
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }

    el.addEventListener('mousedown', onMD);
    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: false });
    el.addEventListener('touchend', onTE);
    el.addEventListener('wheel', onW, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onMD);
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove', onTM);
      el.removeEventListener('touchend', onTE);
      el.removeEventListener('wheel', onW);
      document.removeEventListener('mousemove', onMM);
      document.removeEventListener('mouseup', onMU);
    };
  }, [isOpen, running, paused]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ── Spinbutton keyboard ────────────────────────────────────────────────

  function handleSpinKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        commitValue(clamp(durationRef.current + 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        commitValue(clamp(durationRef.current - 1));
        break;
      case 'Home':
        e.preventDefault();
        commitValue(MIN_VAL);
        break;
      case 'End':
        e.preventDefault();
        commitValue(MAX_VAL);
        break;
    }
  }

  // ── Direct number input ────────────────────────────────────────────────

  function handleNumberClick(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(String(durationRef.current));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitEdit() {
    setEditing(false);
    const n = Number.parseInt(editValue, 10);
    if (!Number.isNaN(n) && n >= MIN_VAL && n <= MAX_VAL) {
      commitValue(n);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
    e.stopPropagation();
  }

  // ── Countdown tick ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setPaused(false);
          setLiveText('Timer complete');
          if (audioCtxRef.current && bellsRef.current) {
            strikeBell(audioCtxRef.current, bellsRef.current.complete);
          }
          setPulsing(true);
          pulseRef.current = setTimeout(() => setPulsing(false), 2000);
          posRef.current = durationRef.current;
          setPos(durationRef.current);
          return 0;
        }
        const text = announcement(next);
        if (text) setLiveText(text);
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => () => clearTimeout(pulseRef.current), []);

  // ── Audio ──────────────────────────────────────────────────────────────

  async function ensureAudio(): Promise<void> {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (!bellsRef.current) {
      try {
        bellsRef.current = await loadBells(audioCtxRef.current);
      } catch {
        /* audio files may not exist yet */
      }
    }
    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
  }

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleStart() {
    await ensureAudio();
    const d = durationRef.current;
    const total = d * 60;
    totalRef.current = total;
    setRemaining(total);
    setRunning(true);
    setPaused(false);
    setLiveText(`${d} ${d === 1 ? 'minute' : 'minutes'} remaining`);
    if (audioCtxRef.current && bellsRef.current) {
      strikeBell(audioCtxRef.current, bellsRef.current.begin);
    }
  }

  function handlePause() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(true);
  }

  function handleResume() {
    setRunning(true);
    setPaused(false);
  }

  function handleReset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setRemaining(0);
    setLiveText('');
    posRef.current = durationRef.current;
    setPos(durationRef.current);
  }

  function handleResetToDefault() {
    writeDuration(DEFAULT_DURATION);
    setDuration(DEFAULT_DURATION);
    posRef.current = DEFAULT_DURATION;
    setPos(DEFAULT_DURATION);
  }

  // ── Click outside to close ─────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      // If React replaced the clicked element during re-render (e.g. pause→play
      // icon swap), the old node is no longer in the document. Treat it as an
      // internal click — do not close.
      if (!document.contains(target)) return;
      if (areaRef.current && !areaRef.current.contains(target)) {
        onCloseRef.current();
      }
    }
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', handler);
    };
  }, [isOpen]);

  // ── Focus management ───────────────────────────────────────────────────

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (!isOpen && prevOpenRef.current) iconRef.current?.focus();
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (running && !prevRunningRef.current && isOpen) countdownRef.current?.focus();
    prevRunningRef.current = running;
  }, [running, isOpen]);

  // ── Progress fraction ──────────────────────────────────────────────────

  const progress = isActive && totalRef.current > 0 ? remaining / totalRef.current : 0;

  // ── Shared styles ──────────────────────────────────────────────────────

  const actionBtnClass =
    'flex items-center justify-center w-11 h-11 bg-transparent border-0 cursor-pointer p-0 ' +
    '[color:var(--muted)] hover:[color:var(--text)] transition-colors duration-150';

  const numberStyle = {
    fontSize: 32,
    fontWeight: 200,
    fontVariantNumeric: 'tabular-nums' as const,
    color: 'var(--text)',
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {isOpen ? (
        /* ── Expanded dial ──────────────────────────────────────────── */
        <section
          ref={areaRef}
          className="fixed bottom-6 right-6 z-10"
          aria-label="Meditation timer"
        >
          <div className="flex flex-col items-center">
            {/* Dial circle */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
            >
              {/* Circular backdrop — blur only, minimal tint */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgb(from var(--bg) r g b / 0.15)',
                  backdropFilter: 'blur(12px)',
                }}
                aria-hidden="true"
              />

              {/* Ring SVG */}
              <svg
                width={DIAL_SIZE}
                height={DIAL_SIZE}
                viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
                className="absolute inset-0"
                aria-hidden="true"
              >
                {/* Track ring (elapsed) — always faded behind the arc */}
                <circle
                  cx={DIAL_HALF}
                  cy={DIAL_HALF}
                  r={DIAL_R}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="1.5"
                  opacity={0.4}
                />
                {/* Remaining arc — full when idle, depletes during countdown.
                    Flashes --text on completion for non-auditory signal. */}
                <circle
                  cx={DIAL_HALF}
                  cy={DIAL_HALF}
                  r={DIAL_R}
                  fill="none"
                  stroke={pulsing ? 'var(--text)' : 'var(--interactive)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(-90 ${DIAL_HALF} ${DIAL_HALF})`}
                  strokeDasharray={DIAL_C}
                  strokeDashoffset={DIAL_C * (1 - (isActive ? progress : 1))}
                />
              </svg>

              {/* Centre content */}
              {isActive ? (
                <div
                  ref={countdownRef}
                  role="timer"
                  tabIndex={-1}
                  className="relative flex items-center justify-center"
                >
                  <span style={numberStyle}>{formatTime(remaining)}</span>
                </div>
              ) : (
                <div
                  ref={spinRef}
                  role="spinbutton"
                  tabIndex={0}
                  aria-label="Timer duration in minutes"
                  aria-valuemin={MIN_VAL}
                  aria-valuemax={MAX_VAL}
                  aria-valuenow={Math.round(pos)}
                  aria-valuetext={`${Math.round(pos)} minutes`}
                  onKeyDown={handleSpinKeyDown}
                  className="relative flex flex-col items-center justify-center gap-1 cursor-ns-resize select-none"
                  style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
                >
                  {editing ? (
                    <input
                      ref={inputRef}
                      type="number"
                      min={MIN_VAL}
                      max={MAX_VAL}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleEditKeyDown}
                      aria-label="Timer duration in minutes"
                      className="leading-none bg-transparent border-0 text-center p-0 m-0"
                      style={{
                        ...numberStyle,
                        width: 80,
                        fontFamily: 'inherit',
                        MozAppearance: 'textfield',
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      style={{
                        ...numberStyle,
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                      }}
                      className="leading-none min-w-[44px] min-h-[44px]"
                      onClick={handleNumberClick}
                      aria-label={`${Math.round(pos)} minutes — click to edit`}
                    >
                      {Math.round(pos)}
                    </button>
                  )}
                  <span
                    className="leading-none"
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      opacity: 0.5,
                      letterSpacing: '0.08em',
                    }}
                  >
                    min
                  </span>
                </div>
              )}
            </div>

            {/* Button row: [play/pause] [reset] [icon] — centred */}
            <div className="flex items-center justify-center gap-3 mt-3">
              {isActive ? (
                <>
                  <button
                    type="button"
                    onClick={running ? handlePause : handleResume}
                    aria-label={running ? 'Pause meditation timer' : 'Resume meditation timer'}
                    className={actionBtnClass}
                  >
                    {running ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label="Reset meditation timer"
                    className={actionBtnClass}
                  >
                    <ResetIcon />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStart}
                    aria-label="Start meditation timer"
                    className={actionBtnClass}
                  >
                    <PlayIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    aria-label="Reset timer to default duration"
                    className={actionBtnClass}
                  >
                    <ResetIcon />
                  </button>
                </>
              )}
              {/* Timer icon — filled when dial is open */}
              <button
                ref={iconRef}
                type="button"
                onClick={onToggle}
                aria-label="Close meditation timer"
                aria-expanded={true}
                className="flex items-center justify-center w-11 h-11 bg-transparent border-0 cursor-pointer p-0 transition-colors duration-150"
                style={{ color: 'var(--text)' }}
              >
                <svg
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
                  aria-hidden="true"
                  style={pulsing ? { animation: 'bell-pulse 0.6s ease-out' } : undefined}
                >
                  <circle cx={ICON_HALF} cy={ICON_HALF} r={ICON_R} fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* ── Collapsed icon — fixed bottom-right ────────────────────── */
        <button
          ref={iconRef}
          type="button"
          onClick={onToggle}
          aria-label="Open meditation timer"
          aria-expanded={false}
          className={`fixed bottom-6 right-6 z-10 flex flex-col items-center justify-center w-11 min-h-[44px] bg-transparent border-0 cursor-pointer p-0 hover:[color:var(--text)] transition-colors duration-150 ${pulsing ? '[color:var(--text)]' : '[color:var(--muted)]'}`}
        >
          <svg
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
            fill="none"
            aria-hidden="true"
            style={pulsing ? { animation: 'bell-pulse 0.6s ease-out' } : undefined}
          >
            {/* Track ring */}
            <circle
              cx={ICON_HALF}
              cy={ICON_HALF}
              r={ICON_R}
              fill="none"
              stroke={isActive ? 'var(--border)' : 'currentColor'}
              strokeWidth="1.5"
              opacity={isActive ? 0.4 : 1}
            />
            {/* Remaining arc */}
            {isActive && (
              <circle
                cx={ICON_HALF}
                cy={ICON_HALF}
                r={ICON_R}
                fill="none"
                stroke="var(--interactive)"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(-90 ${ICON_HALF} ${ICON_HALF})`}
                strokeDasharray={ICON_C}
                strokeDashoffset={ICON_C * (1 - progress)}
              />
            )}
          </svg>
          {isActive && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 200,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--muted)',
                marginTop: 2,
              }}
            >
              {formatTime(remaining)}
            </span>
          )}
        </button>
      )}

      {/* Screen reader announcements — always mounted */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveText}
      </div>
    </>
  );
}
