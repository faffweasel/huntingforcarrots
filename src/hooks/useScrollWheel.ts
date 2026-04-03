import type React from 'react';
import { type RefObject, useEffect, useRef, useState } from 'react';

export const MIN_VAL = 1;
export const MAX_VAL = 60;
const DEFAULT_DURATION = 5;
const STORAGE_KEY = 'hfc-timer-duration';

const DRAG_SENSITIVITY = 48;
const FRICTION = 0.92;
const SNAP_EASE = 0.2;
const VEL_THRESHOLD = 0.05;

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

interface UseScrollWheelOptions {
  readonly isEnabled: boolean;
}

interface UseScrollWheelReturn {
  readonly duration: number;
  readonly displayValue: number;
  readonly spinRef: RefObject<HTMLDivElement | null>;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly editing: boolean;
  readonly editValue: string;
  readonly setEditValue: (v: string) => void;
  readonly commitValue: (v: number) => void;
  readonly commitEdit: () => void;
  readonly handleSpinKeyDown: (e: React.KeyboardEvent) => void;
  readonly handleNumberClick: (e: React.MouseEvent) => void;
  readonly handleEditKeyDown: (e: React.KeyboardEvent) => void;
  readonly resetPosition: () => void;
  readonly resetToDefault: () => void;
}

export function useScrollWheel({ isEnabled }: UseScrollWheelOptions): UseScrollWheelReturn {
  const [duration, setDuration] = useState(readStoredDuration);
  const [pos, setPos] = useState(duration);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const durationRef = useRef(duration);
  durationRef.current = duration;
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

  const spinRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function animate() {
    if (dragging.current) return;
    if (reducedMotion.current) {
      commitValue(clamp(Math.round(posRef.current)));
      return;
    }
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

  // ── Scroll event binding (enabled only when panel is open + idle) ──────

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll handlers only use refs — semantically stable across renders
  useEffect(() => {
    if (!isEnabled) return;
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
  }, [isEnabled]);

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

  // ── External resets ────────────────────────────────────────────────────

  function resetPosition() {
    posRef.current = durationRef.current;
    setPos(durationRef.current);
  }

  function resetToDefault() {
    writeDuration(DEFAULT_DURATION);
    setDuration(DEFAULT_DURATION);
    posRef.current = DEFAULT_DURATION;
    setPos(DEFAULT_DURATION);
  }

  return {
    duration,
    displayValue: Math.round(pos),
    spinRef,
    inputRef,
    editing,
    editValue,
    setEditValue,
    commitValue,
    commitEdit,
    handleSpinKeyDown,
    handleNumberClick,
    handleEditKeyDown,
    resetPosition,
    resetToDefault,
  };
}
