import { getStoneShadow } from './primitives';
import type { Composition, MossPatch, RakePattern, StoneGroup } from './types';

/** Format a number to 2 decimal places for SVG attributes. */
function n(value: number): string {
  return value.toFixed(2);
}

/**
 * Converts a Composition into a complete SVG string.
 *
 * Render order (painter's algorithm, back to front):
 *   1. Sand background
 *   2. Parallel rake lines
 *   3. Concentric rake lines
 *   4. Stone shadows
 *   5. Stones (with depth-cue opacity and per-stone brightness variation)
 *   6. Moss patches
 *
 * All colours reference CSS custom properties — dark mode is automatic.
 * No <text> elements — haiku is rendered as HTML over the SVG.
 */
export function renderGarden(composition: Composition): string {
  const { viewBox, stoneGroups, moss, concentricRake, parallelRake } = composition;
  const vb = `0 0 ${viewBox.width} ${viewBox.height}`;
  const label = buildAriaLabel(composition);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">`,
    `<rect width="${viewBox.width}" height="${viewBox.height}" fill="var(--sand)"/>`,
    renderIslands(stoneGroups),
    renderRakeGroup(parallelRake),
    renderRakeGroup(concentricRake),
    renderShadows(stoneGroups),
    renderStones(stoneGroups, viewBox.height),
    renderMossPatches(moss),
    '</svg>',
  ].join('\n');
}

// ─── Layer renderers ──────────────────────────────────────────────────────────

/** Subtle mound effect behind each stone group — barely visible lightening of the sand. */
function renderIslands(groups: readonly StoneGroup[]): string {
  if (groups.length === 0) return '';
  const ISLAND_PADDING = 12;
  const ellipses: string[] = [];
  for (const group of groups) {
    // Compute actual stone extents from group centre rather than using boundingRadius.
    // Island extends only 10–15px beyond outermost stone edge — a subtle grounding element.
    let maxExtentX = 0;
    let maxExtentY = 0;
    for (const stone of group.stones) {
      maxExtentX = Math.max(maxExtentX, Math.abs(stone.x - group.center.x) + stone.width / 2);
      maxExtentY = Math.max(maxExtentY, Math.abs(stone.y - group.center.y) + stone.height / 2);
    }
    const rx = maxExtentX + ISLAND_PADDING;
    const ry = maxExtentY * 0.4 + ISLAND_PADDING;
    ellipses.push(
      `<ellipse cx="${n(group.center.x)}" cy="${n(group.center.y)}" rx="${n(rx)}" ry="${n(ry)}"/>`
    );
  }
  return `<g fill="white" opacity="0.03">${ellipses.join('')}</g>`;
}

function renderRakeGroup(rake: RakePattern): string {
  if (rake.paths.length === 0) return '';
  const paths = rake.paths
    .map((d, i) => {
      const o = rake.opacities?.[i];
      return o !== undefined && o < 1 ? `<path d="${d}" opacity="${o.toFixed(2)}"/>` : `<path d="${d}"/>`;
    })
    .join('');
  return `<g stroke="var(--rake-line)" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.65">${paths}</g>`;
}

function renderShadows(groups: readonly StoneGroup[]): string {
  const ellipses: string[] = [];
  for (const group of groups) {
    for (const stone of group.stones) {
      const s = getStoneShadow(stone);
      ellipses.push(`<ellipse cx="${n(s.cx)}" cy="${n(s.cy)}" rx="${n(s.rx)}" ry="${n(s.ry)}"/>`);
    }
  }
  if (ellipses.length === 0) return '';
  return `<g fill="var(--stone-shadow)" opacity="0.4">${ellipses.join('')}</g>`;
}

/**
 * Renders stone paths with two visual modifiers:
 *
 * - Depth-cue opacity: 0.85 (top of viewport) → 1.0 (bottom).
 *   Far stones appear slightly muted as the sand shows through.
 * - Per-stone brightness: 1 + colourVariation (±5%).
 *   Gives subtle individuality to each stone.
 */
function renderStones(groups: readonly StoneGroup[], viewBoxHeight: number): string {
  const paths: string[] = [];
  for (const group of groups) {
    for (const stone of group.stones) {
      const depthOpacity = Math.min(1, Math.max(0.85, 0.85 + (stone.y / viewBoxHeight) * 0.15));
      const brightness = 1 + stone.colourVariation;
      paths.push(
        `<path d="${stone.path}" opacity="${n(depthOpacity)}" style="filter:brightness(${n(brightness)})"/>`
      );
    }
  }
  if (paths.length === 0) return '';
  return `<g fill="var(--stone)">${paths.join('')}</g>`;
}

function renderMossPatches(patches: readonly MossPatch[]): string {
  if (patches.length === 0) return '';
  const groups: string[] = [];
  for (const patch of patches) {
    const circles = patch.blobs
      .map((b) => `<circle cx="${n(b.cx)}" cy="${n(b.cy)}" r="${n(b.r)}"/>`)
      .join('');
    groups.push(`<g opacity="${n(patch.opacity)}">${circles}</g>`);
  }
  return `<g fill="var(--moss)">${groups.join('')}</g>`;
}

// ─── Accessibility ────────────────────────────────────────────────────────────

function buildAriaLabel(composition: Composition): string {
  const totalStones = composition.stoneGroups.reduce((sum, g) => sum + g.stones.length, 0);
  const groupCount = composition.stoneGroups.length;
  const mossCount = composition.moss.length;

  let label = `Zen garden with ${totalStones} stones in ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}, raked sand`;
  if (mossCount > 0) {
    label += `, and ${mossCount} moss ${mossCount === 1 ? 'patch' : 'patches'}`;
  }
  return label;
}
