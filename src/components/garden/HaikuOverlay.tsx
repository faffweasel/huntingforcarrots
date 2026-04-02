import type { ReactElement } from 'react';
import type { Haiku } from '../../lib/haiku';

interface HaikuOverlayProps {
  readonly haiku: Haiku;
  readonly position: { readonly x: number; readonly y: number };
  readonly viewBox: { readonly width: number; readonly height: number };
}

// Nav icon: top-6 left-6 (24px), 44px size. Timer: bottom-6 right-6 (24px), 44px size.
// 24 + 44 + 32px breathing room = 100px clearance from each corner.
const CONTROL_CLEARANCE = 100;
const EDGE_PAD = 32;

// Conservative text block half-dimensions for clamping.
// Covers the largest breakpoint (20px font, line-height 2.0, 3 lines ≈ 120px tall, ~280px wide).
const TEXT_HALF_W = 140;
const TEXT_HALF_H = 65;

/**
 * Converts a viewBox coordinate to viewport pixels,
 * matching the SVG's preserveAspectRatio="xMidYMid slice".
 */
function toViewportPixels(
  vbX: number,
  vbY: number,
  vbW: number,
  vbH: number
): { x: number; y: number } {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const scale = Math.max(vpW / vbW, vpH / vbH);
  const offsetX = (vpW - vbW * scale) / 2;
  const offsetY = (vpH - vbH * scale) / 2;
  return {
    x: vbX * scale + offsetX,
    y: vbY * scale + offsetY,
  };
}

/**
 * Clamps the haiku center to keep the full text block within the viewport
 * with 32px breathing room, and clear of nav (top-left) and timer (bottom-right).
 * Safety check only — the composition engine handles primary placement.
 */
function clampCenter(cx: number, cy: number): { x: number; y: number } {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  const x = Math.max(TEXT_HALF_W + EDGE_PAD, Math.min(vpW - TEXT_HALF_W - EDGE_PAD, cx));
  let y = Math.max(TEXT_HALF_H + EDGE_PAD, Math.min(vpH - TEXT_HALF_H - EDGE_PAD, cy));

  // Nav icon (top-left): nudge down if text block would overlap
  if (x - TEXT_HALF_W < CONTROL_CLEARANCE && y - TEXT_HALF_H < CONTROL_CLEARANCE) {
    y = CONTROL_CLEARANCE + TEXT_HALF_H;
  }

  // Timer icon (bottom-right): nudge up if text block would overlap
  if (x + TEXT_HALF_W > vpW - CONTROL_CLEARANCE && y + TEXT_HALF_H > vpH - CONTROL_CLEARANCE) {
    y = vpH - CONTROL_CLEARANCE - TEXT_HALF_H;
  }

  return { x, y };
}

export function HaikuOverlay({ haiku, position, viewBox }: HaikuOverlayProps): ReactElement {
  const pixel = toViewportPixels(position.x, position.y, viewBox.width, viewBox.height);
  const clamped = clampCenter(pixel.x, pixel.y);
  const left = (clamped.x / window.innerWidth) * 100;
  const top = (clamped.y / window.innerHeight) * 100;

  return (
    <div
      className="fixed z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-8 font-light text-[16px] leading-[2] tracking-[0.02em] text-[color:var(--text)] md:text-[18px] lg:text-[20px]"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <p>{haiku.line1}</p>
      <p>{haiku.line2}</p>
      <p>{haiku.line3}</p>
    </div>
  );
}
