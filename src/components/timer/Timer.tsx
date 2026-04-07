import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { useCountdown } from '../../hooks/useCountdown';
import { MAX_VAL, MIN_VAL, useScrollWheel } from '../../hooks/useScrollWheel';

// ── Constants ────────────────────────────────────────────────────────────────

const DIAL_SIZE = 140;
const DIAL_R = 64;
const DIAL_C = 2 * Math.PI * DIAL_R;
const DIAL_HALF = DIAL_SIZE / 2;

const ICON_SIZE = 20;
const ICON_R = 8;
const ICON_C = 2 * Math.PI * ICON_R;
const ICON_HALF = ICON_SIZE / 2;

// ── Formatting ──────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Icons ───────────────────────────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────────────────────

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
  // ── Hooks ─────────────────────────────────────────────────────────────
  const audio = useAudio();

  const countdown = useCountdown(() => {
    audio.strikeComplete();
    // wheel is initialised before this callback fires (async via setTimeout)
    wheel.resetPosition();
  });

  const isActive = countdown.running || countdown.paused;

  const wheel = useScrollWheel({
    isEnabled: isOpen && !isActive,
  });

  // ── Bell-before-countdown state ───────────────────────────────────────
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

  // ── Refs ──────────────────────────────────────────────────────────────
  const iconRef = useRef<HTMLButtonElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ── Actions ───────────────────────────────────────────────────────────

  async function handleStart() {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    // ensureAudio + play() must both run synchronously in the click handler
    // call stack — iOS WebKit drops audio started in .then() callbacks.
    // strikeBellAndWait calls play() synchronously, then awaits 'ended'.
    audio.ensureAudio();
    await audio.strikeBeginAndWait(wheel.duration);
    if (startingRef.current) {
      countdown.start(wheel.duration * 60);
    }
    startingRef.current = false;
    setStarting(false);
  }

  function handlePause() {
    countdown.pause();
  }

  function handleResume() {
    audio.ensureAudio();
    countdown.resume();
  }

  function handleReset() {
    startingRef.current = false;
    setStarting(false);
    countdown.stop();
    wheel.resetPosition();
  }

  function handleResetToDefault() {
    wheel.resetToDefault();
  }

  // ── Click outside to close ────────────────────────────────────────────

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

  // ── Focus management ──────────────────────────────────────────────────

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (!isOpen && prevOpenRef.current) iconRef.current?.focus();
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (countdown.running && !prevRunningRef.current && isOpen) countdownRef.current?.focus();
    prevRunningRef.current = countdown.running;
  }, [countdown.running, isOpen]);

  // ── Shared styles ─────────────────────────────────────────────────────

  const actionBtnClass =
    'flex items-center justify-center w-11 h-11 bg-transparent border-0 cursor-pointer p-0 ' +
    '[color:var(--muted)] hover:[color:var(--text)] transition-colors duration-150 focus-visible:outline-none';

  const numberStyle = {
    fontSize: 32,
    fontWeight: 200,
    fontVariantNumeric: 'tabular-nums' as const,
    color: 'var(--text)',
  };

  // ── Render ────────────────────────────────────────────────────────────

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
                  stroke={countdown.pulsing ? 'var(--text)' : 'var(--interactive)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(-90 ${DIAL_HALF} ${DIAL_HALF})`}
                  strokeDasharray={DIAL_C}
                  strokeDashoffset={DIAL_C * (1 - (isActive ? countdown.progress : 1))}
                />
              </svg>

              {/* Centre content */}
              {isActive ? (
                <div
                  ref={countdownRef}
                  role="timer"
                  tabIndex={-1}
                  className="relative flex items-center justify-center outline-none"
                >
                  <span style={numberStyle}>{formatTime(countdown.remaining)}</span>
                </div>
              ) : (
                <div
                  ref={wheel.spinRef}
                  role="spinbutton"
                  tabIndex={0}
                  aria-label="Timer duration in minutes"
                  aria-valuemin={MIN_VAL}
                  aria-valuemax={MAX_VAL}
                  aria-valuenow={wheel.displayValue}
                  aria-valuetext={`${wheel.displayValue} minutes`}
                  onKeyDown={wheel.handleSpinKeyDown}
                  className="relative flex flex-col items-center justify-center gap-1 cursor-ns-resize select-none focus-visible:outline-none"
                  style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
                >
                  {wheel.editing ? (
                    <input
                      ref={wheel.inputRef}
                      type="number"
                      min={MIN_VAL}
                      max={MAX_VAL}
                      value={wheel.editValue}
                      onChange={(e) => wheel.setEditValue(e.target.value)}
                      onBlur={wheel.commitEdit}
                      onKeyDown={wheel.handleEditKeyDown}
                      aria-label="Timer duration in minutes"
                      className="leading-none bg-transparent border-0 text-center p-0 m-0 select-none [-webkit-appearance:none]"
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
                      className="leading-none min-w-[44px] min-h-[44px] select-none"
                      onClick={wheel.handleNumberClick}
                      aria-label={`${wheel.displayValue} minutes — click to edit`}
                    >
                      {wheel.displayValue}
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
                    onClick={countdown.running ? handlePause : handleResume}
                    aria-label={
                      countdown.running ? 'Pause meditation timer' : 'Resume meditation timer'
                    }
                    className={actionBtnClass}
                  >
                    {countdown.running ? <PauseIcon /> : <PlayIcon />}
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
                    disabled={starting}
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
                className="flex items-center justify-center w-11 h-11 bg-transparent border-0 cursor-pointer p-0 transition-colors duration-150 focus-visible:outline-none"
                style={{ color: 'var(--text)' }}
              >
                <svg
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
                  aria-hidden="true"
                  style={countdown.pulsing ? { animation: 'bell-pulse 0.6s ease-out' } : undefined}
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
          onClick={() => {
            // Preload audio on panel open — this tap is a user gesture so
            // iOS WebKit allows AudioContext creation and resume here.
            // By the time the user presses Begin, buffers should be ready.
            audio.ensureAudio();
            onToggle();
          }}
          aria-label="Open meditation timer"
          aria-expanded={false}
          className={`fixed bottom-6 right-6 z-10 flex flex-col items-center justify-center w-11 min-h-[44px] bg-transparent border-0 cursor-pointer p-0 hover:[color:var(--text)] transition-colors duration-150 focus-visible:outline-none ${countdown.pulsing ? '[color:var(--text)]' : '[color:var(--muted)]'}`}
        >
          <svg
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
            fill="none"
            aria-hidden="true"
            style={countdown.pulsing ? { animation: 'bell-pulse 0.6s ease-out' } : undefined}
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
                strokeDashoffset={ICON_C * (1 - countdown.progress)}
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
              {formatTime(countdown.remaining)}
            </span>
          )}
        </button>
      )}

      {/* Screen reader announcements — always mounted */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {countdown.liveText}
      </div>
    </>
  );
}
