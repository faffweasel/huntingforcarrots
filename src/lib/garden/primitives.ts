import { randomFloat, randomInt } from '../prng';
import type { MossPatch, RakePattern, Stone, StoneGroup, StonePosture } from './types';

// 24 sample points → 15° intervals around the ellipse perimeter.
const POINT_COUNT = 24;

export interface StoneParams {
  readonly x: number;
  readonly y: number;
  /** Base width before depth scaling (30–120px relative to viewBox). */
  readonly width: number;
  /** Base height before depth scaling. Posture system uses 0.25× (kikyaku) to 2.0× (taido). */
  readonly height: number;
  /** ViewBox height for depth scaling (700 landscape, 1200 portrait). */
  readonly viewBoxHeight: number;
  /** Override default rotation range of ±10°. */
  readonly rotationRange?: { readonly min: number; readonly max: number };
  /** Override default perturbation magnitude range of 0.05–0.15. */
  readonly perturbation?: { readonly min: number; readonly max: number };
  /** Extra perturbation on the bottom half (sinA > 0), for a "faces viewer" look. */
  readonly lowerHalfBoost?: number;
  /** Posture tag included in the output Stone. Defaults to 'shintai'. */
  readonly posture?: StonePosture;
}

/** Shadow ellipse params for rendering behind a stone. */
export interface StoneShadow {
  /** Shadow ellipse centre x — stone.x + 4px offset. */
  readonly cx: number;
  /** Shadow ellipse centre y — stone.y + 5px offset. */
  readonly cy: number;
  /** Horizontal radius — stone.width × 1.1 / 2. */
  readonly rx: number;
  /** Vertical radius — stone.height × 0.3 / 2. */
  readonly ry: number;
  readonly opacity: number;
}

/**
 * Generates a single stone with a perturbed ellipse path.
 *
 * Depth cue: stones higher in the viewport (lower y) are scaled down to
 * 0.85–1.0× their base dimensions, creating gentle aerial perspective.
 */
export function generateStone(prng: () => number, params: StoneParams): Stone {
  // Depth scale: y=0 (top) → 0.85, y=viewBoxHeight (bottom) → 1.0
  const depthScale = 0.85 + (params.y / params.viewBoxHeight) * 0.15;
  const w = params.width * depthScale;
  const h = params.height * depthScale;
  const a = w / 2; // semi-major axis
  const b = h / 2; // semi-minor axis

  const { min: rotMin, max: rotMax } = params.rotationRange ?? { min: -10, max: 10 };
  const rotation = randomFloat(prng, rotMin, rotMax);
  const colourVariation = randomFloat(prng, -0.05, 0.05);
  const { min: pertMin, max: pertMax } = params.perturbation ?? { min: 0.05, max: 0.15 };
  const lowerBoost = params.lowerHalfBoost ?? 0;

  const rotRad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  // Sample 24 points around the ellipse, perturb each radius, then rotate.
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = (i / POINT_COUNT) * 2 * Math.PI;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Ellipse radius at this angle: r = ab / sqrt((b·cosθ)² + (a·sinθ)²)
    const ellipseR = (a * b) / Math.sqrt((b * cosA) ** 2 + (a * sinA) ** 2);

    // Perturb radius by a configurable magnitude (sign chosen randomly)
    let magnitude = randomFloat(prng, pertMin, pertMax);
    // Boost lower half for "faces viewer" effect on dominant stones
    if (lowerBoost > 0 && sinA > 0) {
      magnitude += lowerBoost * sinA;
    }
    const sign = prng() < 0.5 ? 1 : -1;
    const r = ellipseR * (1 + sign * magnitude);

    // Rotate the point around the stone centre
    const px = r * cosA;
    const py = r * sinA;
    points.push({
      x: params.x + cosR * px - sinR * py,
      y: params.y + sinR * px + cosR * py,
    });
  }

  return {
    x: params.x,
    y: params.y,
    width: w,
    height: h,
    rotation,
    colourVariation,
    path: buildSmoothClosedPath(points),
    posture: params.posture ?? 'shintai',
  };
}

/**
 * Builds a smooth closed SVG path through the given points using
 * Catmull-Rom → cubic Bézier conversion.
 *
 *   CP1[i] = P[i]   + (P[i+1] − P[i-1]) / 6
 *   CP2[i] = P[i+1] − (P[i+2] − P[i])   / 6
 */
function buildSmoothClosedPath(points: ReadonlyArray<{ x: number; y: number }>): string {
  const n = points.length;
  const f = (v: number) => v.toFixed(2);

  const segments: string[] = [`M ${f(points[0].x)} ${f(points[0].y)}`];

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    segments.push(`C ${f(cp1x)} ${f(cp1y)} ${f(cp2x)} ${f(cp2y)} ${f(p2.x)} ${f(p2.y)}`);
  }

  segments.push('Z');
  return segments.join(' ');
}

/**
 * Returns shadow ellipse params for a stone.
 * Renderer places this behind the stone using fill="var(--stone-shadow)".
 */
export function getStoneShadow(stone: Stone): StoneShadow {
  return {
    cx: stone.x + 4,
    cy: stone.y + 5,
    rx: (stone.width * 1.1) / 2,
    ry: (stone.height * 0.3) / 2,
    opacity: 0.4,
  };
}

// ─── Rake patterns ───────────────────────────────────────────────────────────

/** Exclusion radius for a stone group — covers outermost concentric ring plus margin. */
export function exclusionRadius(group: StoneGroup): number {
  return group.boundingRadius * 2.0 + 15;
}

/**
 * Generates concentric rings radiating outward from a stone group.
 *
 * Each ring follows the group's silhouette (not a perfect ellipse):
 * at each sample angle θ, the base radius = the furthest extent of any stone
 * in that direction from the group centre.
 *
 * Ring count is proportional to the group's expansion budget — larger groups
 * get more rings, smaller groups get fewer, with consistent ~10px spacing.
 * `maxExpansion` may be reduced by the caller to prevent inter-group overlap.
 *
 * Returns the actual outermost ring radius so the caller can derive
 * exclusion zones from real geometry instead of a formula.
 */
export function generateConcentricRake(
  prng: () => number,
  stoneGroup: StoneGroup,
  maxExpansion: number
): { readonly paths: string[]; readonly opacities: number[]; readonly outermostRadius: number } {
  const BASE_GAP = 10;
  const TARGET_SPACING = 10;
  const available = maxExpansion - BASE_GAP;
  const ringCount =
    available >= TARGET_SPACING
      ? Math.max(3, Math.min(8, Math.floor(available / TARGET_SPACING)))
      : 0;
  const spacing = ringCount > 0 ? available / ringCount : TARGET_SPACING;
  const paths: string[] = [];
  const opacities: number[] = [];
  let outermostRadius = stoneGroup.boundingRadius;

  for (let ring = 1; ring <= ringCount; ring++) {
    const ringExpansion = BASE_GAP + ring * spacing;
    const pts: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < 32; i++) {
      const θ = (i / 32) * 2 * Math.PI;
      const cosθ = Math.cos(θ);
      const sinθ = Math.sin(θ);

      // Silhouette: furthest extent of any stone in direction θ from group centre.
      let silhouette = stoneGroup.boundingRadius;
      for (const stone of stoneGroup.stones) {
        const proj =
          (stone.x - stoneGroup.center.x) * cosθ + (stone.y - stoneGroup.center.y) * sinθ;
        const stoneR = Math.sqrt((stone.width / 2) ** 2 + (stone.height / 2) ** 2);
        silhouette = Math.max(silhouette, proj + stoneR);
      }

      const r = Math.max(0, silhouette) + ringExpansion + randomFloat(prng, -1.5, 1.5);

      // Track the outermost ring's maximum radius for exclusion zone derivation.
      if (ring === ringCount) {
        outermostRadius = Math.max(outermostRadius, r);
      }

      pts.push({
        x: stoneGroup.center.x + r * cosθ,
        y: stoneGroup.center.y + r * sinθ,
      });
    }

    paths.push(buildSmoothClosedPath(pts));

    // Outer rings fade out so concentric pattern dissolves into parallel lines.
    const fromEnd = ringCount - ring;
    opacities.push(fromEnd === 0 ? 0.3 : fromEnd === 1 ? 0.6 : 1.0);
  }

  return { paths, opacities, outermostRadius };
}

/**
 * Generates horizontal parallel rake lines across the viewport, clipped
 * around exclusion zones so lines do not draw through concentric ring areas.
 *
 * Lines run with a gentle quadratic bow (±4px). Where a line would pass
 * through an exclusion circle, it stops before the zone and resumes after.
 */
export function generateParallelRake(
  prng: () => number,
  viewBox: { readonly width: number; readonly height: number },
  rakeSpacing?: { readonly min: number; readonly max: number },
  exclusions?: readonly { readonly cx: number; readonly cy: number; readonly radius: number }[]
): RakePattern {
  const { min, max } = rakeSpacing ?? { min: 8, max: 12 };
  const spacing = randomFloat(prng, min, max);
  const paths: string[] = [];
  const f = (v: number) => v.toFixed(2);

  let y = spacing / 2;
  while (y < viewBox.height) {
    const curveOffset = randomFloat(prng, -4, 4);
    const segments = clipLineToExclusions(0, viewBox.width, y, exclusions ?? []);

    for (const [x1, x2] of segments) {
      const midX = (x1 + x2) / 2;
      paths.push(`M ${f(x1)} ${f(y)} Q ${f(midX)} ${f(y + curveOffset)} ${f(x2)} ${f(y)}`);
    }

    // ±8% random variation in line spacing to break the scan-line feel.
    y += spacing * randomFloat(prng, 0.92, 1.08);
  }

  return { paths };
}

/**
 * Clips a horizontal line segment to avoid circular exclusion zones.
 * Returns (startX, endX) pairs for segments that lie outside all zones.
 * Segments shorter than 10px are dropped to avoid visual noise.
 */
function clipLineToExclusions(
  startX: number,
  endX: number,
  y: number,
  exclusions: readonly { readonly cx: number; readonly cy: number; readonly radius: number }[]
): ReadonlyArray<[number, number]> {
  if (exclusions.length === 0) return [[startX, endX]];

  // Collect exclusion intervals where circles intersect this y
  const intervals: Array<[number, number]> = [];
  for (const zone of exclusions) {
    const dy = y - zone.cy;
    const r2 = zone.radius ** 2;
    if (dy ** 2 >= r2) continue;
    const dx = Math.sqrt(r2 - dy ** 2);
    intervals.push([zone.cx - dx, zone.cx + dx]);
  }

  if (intervals.length === 0) return [[startX, endX]];

  // Sort by start, merge overlapping
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i][0] <= last[1]) {
      last[1] = Math.max(last[1], intervals[i][1]);
    } else {
      merged.push(intervals[i]);
    }
  }

  // Build gap segments outside exclusion zones
  const segments: Array<[number, number]> = [];
  let cursor = startX;
  for (const [iStart, iEnd] of merged) {
    if (iStart > cursor) {
      segments.push([cursor, Math.min(iStart, endX)]);
    }
    cursor = Math.max(cursor, iEnd);
  }
  if (cursor < endX) {
    segments.push([cursor, endX]);
  }

  // Drop tiny segments that would look like visual noise
  return segments.filter(([a, b]) => b - a >= 10);
}

/**
 * Generates a moss patch at the base of the anchor stone.
 * Position: stone.y + stone.height × 0.4 (partial coverage of stone base).
 */
export function generateMoss(prng: () => number, anchorStone: Stone): MossPatch {
  const ax = anchorStone.x;
  const ay = anchorStone.y + anchorStone.height * 0.4;

  const blobCount = randomInt(prng, 3, 6);
  const jitterRange = anchorStone.width * 0.3;

  const blobs: Array<{ cx: number; cy: number; r: number }> = [];
  for (let i = 0; i < blobCount; i++) {
    const cx = ax + randomFloat(prng, -jitterRange, jitterRange);
    const cy = ay + randomFloat(prng, -jitterRange * 0.5, jitterRange * 0.5);
    const r = randomFloat(prng, 3, 8);
    blobs.push({ cx, cy, r });
  }

  // Overall patch diameter — clamped to the 10–30px range from MossPatch spec.
  const maxR = blobs.reduce((max, b) => Math.max(max, b.r), 0);
  const size = Math.min(30, Math.max(10, maxR * 4));

  return {
    x: ax,
    y: ay,
    size,
    opacity: randomFloat(prng, 0.6, 0.8),
    blobs,
  };
}
