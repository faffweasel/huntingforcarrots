import type { ReactElement } from 'react';
import type { Haiku } from '../../lib/haiku';

interface HaikuOverlayProps {
  readonly haiku: Haiku;
  readonly position: { readonly x: number; readonly y: number };
  readonly viewBox: { readonly width: number; readonly height: number };
}

// Minimum clearance from viewport edges (pixels).
// Top/bottom 80px clears nav trigger and timer; left 48px; right 80px clears timer icon.
const PAD_TOP = 80;
const PAD_BOTTOM = 80;
const PAD_LEFT = 48;
const PAD_RIGHT = 80;

// Conservative text block half-dimensions for clamping.
// Covers the largest breakpoint (20px font, line-height 2.0, 3 lines ≈ 120px tall, ~280px wide).
const TEXT_HALF_W = 140;
const TEXT_HALF_H = 60;

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
 * Clamps the haiku centre so the full text block stays within safe bounds:
 *   top ≥ PAD_TOP, bottom ≤ vpH − PAD_BOTTOM,
 *   left ≥ PAD_LEFT, right ≤ vpW − PAD_RIGHT.
 * Falls back to viewport centre if the safe zone is too small (tiny viewport).
 */
function clampCenter(cx: number, cy: number): { x: number; y: number } {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  const minX = PAD_LEFT + TEXT_HALF_W;
  const maxX = vpW - PAD_RIGHT - TEXT_HALF_W;
  const minY = PAD_TOP + TEXT_HALF_H;
  const maxY = vpH - PAD_BOTTOM - TEXT_HALF_H;

  // Viewport too small for any valid position — centre as best we can.
  if (minX > maxX || minY > maxY) {
    return { x: vpW / 2, y: vpH / 2 };
  }

  return {
    x: Math.max(minX, Math.min(maxX, cx)),
    y: Math.max(minY, Math.min(maxY, cy)),
  };
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
      <article aria-label="Daily haiku">
        <p>{haiku.line1}</p>
        <p>{haiku.line2}</p>
        <p>{haiku.line3}</p>
      </article>
    </div>
  );
}
