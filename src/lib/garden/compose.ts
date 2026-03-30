import { pick, randomFloat, randomInt, shuffle } from '../prng';
import {
  exclusionRadius,
  generateConcentricRake,
  generateMoss,
  generateParallelRake,
} from './primitives';
import { composeGroup } from './stones';
import type {
  Composition,
  CompositionMode,
  MossPatch,
  RakePattern,
  ResponsiveConfig,
  StoneGroup,
} from './types';

// ViewBox dimensions by mode.
const VIEWBOXES: Record<CompositionMode, { readonly width: number; readonly height: number }> = {
  landscape: { width: 1000, height: 700 },
  portrait: { width: 700, height: 1200 },
};

// Default stone totals — odd only, per CLAUDE.md garden rules.
const DEFAULT_STONE_TOTALS: readonly number[] = [3, 5, 7];
const DEFAULT_RAKE_SPACING = { min: 8, max: 12 };

export function compose(
  prng: () => number,
  mode: CompositionMode,
  config?: ResponsiveConfig
): Composition {
  const viewBox = VIEWBOXES[mode];
  const stoneTotals = config?.stoneTotals ?? DEFAULT_STONE_TOTALS;
  const rakeSpacing = config?.rakeSpacing ?? DEFAULT_RAKE_SPACING;

  // --- Stone count and karesansui distribution ---
  const total = pick(prng, stoneTotals);
  const distribution = distributeStones(total);
  const groupCount = distribution.length;

  // --- Triangular group placement (fukinsei — asymmetry) ---
  const positions = placeGroups(prng, groupCount, viewBox);

  const stoneGroups: StoneGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    stoneGroups.push(
      composeGroup(prng, distribution[i], positions[i].x, positions[i].y, viewBox.height)
    );
  }

  // --- 40% empty space rule ---
  while (occupiedFraction(stoneGroups, viewBox) > 0.6 && stoneGroups.length > 1) {
    stoneGroups.pop();
  }

  // --- Viewport clamping: shift groups so no stone clips above/below viewport ---
  clampGroupsToViewport(stoneGroups, viewBox, 20);

  // --- Rake patterns ---
  const concentricPaths: string[] = [];
  for (const group of stoneGroups) {
    concentricPaths.push(...generateConcentricRake(prng, group).paths);
  }
  const concentricRake: RakePattern = { paths: concentricPaths };
  const parallelRake = generateParallelRake(prng, viewBox, rakeSpacing);

  // --- Moss (0–3 patches, each anchored to a different stone base) ---
  const allStones = stoneGroups.flatMap((g) => [...g.stones]);
  const mossCount = randomInt(prng, 0, Math.min(3, allStones.length));
  const moss: MossPatch[] = shuffle(prng, allStones)
    .slice(0, mossCount)
    .map((stone) => generateMoss(prng, stone));

  // --- Haiku area ---
  const emptyRect = findLargestEmptyRect(stoneGroups, viewBox, mode);
  const haikuArea = { x: emptyRect.x, y: emptyRect.y, width: emptyRect.w, height: emptyRect.h };
  const haikuPosition = {
    x: emptyRect.x + emptyRect.w / 2,
    y: emptyRect.y + emptyRect.h / 2,
  };

  return {
    mode,
    viewBox,
    stoneGroups,
    moss,
    concentricRake,
    parallelRake,
    haikuArea,
    haikuPosition,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fixed karesansui distribution — total stones mapped to group sizes.
 *   1 → [1]   3 → [3]   5 → [3, 2]   7 → [3, 2, 2]
 * First group is always largest (triad), ensuring a dominant focal point.
 */
function distributeStones(total: number): readonly number[] {
  switch (total) {
    case 1:
      return [1];
    case 3:
      return [3];
    case 5:
      return [3, 2];
    case 7:
      return [3, 2, 2];
    default:
      return [total];
  }
}

/**
 * Places groups using polar coordinates around the viewport centre.
 *
 * Groups are spread at roughly equal angular intervals with asymmetric
 * jitter and varying radii — producing natural-looking triangular
 * compositions that avoid the centre cell and stay within the inner 80%.
 */
function placeGroups(
  prng: () => number,
  groupCount: number,
  viewBox: { readonly width: number; readonly height: number }
): ReadonlyArray<{ readonly x: number; readonly y: number }> {
  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;
  const maxRx = viewBox.width * 0.3;
  const maxRy = viewBox.height * 0.3;

  const safeMinX = viewBox.width * 0.15;
  const safeMaxX = viewBox.width * 0.85;
  const safeMinY = viewBox.height * 0.15;
  const safeMaxY = viewBox.height * 0.85;
  const thirdW = viewBox.width / 3;
  const thirdH = viewBox.height / 3;

  function clamp(pos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.max(safeMinX, Math.min(safeMaxX, pos.x)),
      y: Math.max(safeMinY, Math.min(safeMaxY, pos.y)),
    };
  }

  function isInCentre(pos: { x: number; y: number }): boolean {
    return pos.x > thirdW && pos.x < thirdW * 2 && pos.y > thirdH && pos.y < thirdH * 2;
  }

  const baseAngle = randomFloat(prng, 0, 2 * Math.PI);
  const angularSep = groupCount > 1 ? (2 * Math.PI) / groupCount : 0;
  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < groupCount; i++) {
    const jitter = groupCount > 1 ? randomFloat(prng, -angularSep * 0.15, angularSep * 0.15) : 0;
    const angle = baseAngle + i * angularSep + jitter;
    const r = randomFloat(prng, 0.5, 1.0);

    let pos = clamp({
      x: cx + r * maxRx * Math.cos(angle),
      y: cy + r * maxRy * Math.sin(angle),
    });

    // Push outward if the position lands in the centre cell
    if (isInCentre(pos)) {
      pos = clamp({
        x: cx + 1.3 * maxRx * Math.cos(angle),
        y: cy + 1.3 * maxRy * Math.sin(angle),
      });
    }

    positions.push(pos);
  }

  return positions;
}

/**
 * Circular approximation of occupied viewport fraction. Conservative: overlapping
 * group circles are double-counted, so the true occupied area is ≤ this value.
 */
function occupiedFraction(
  groups: readonly StoneGroup[],
  viewBox: { readonly width: number; readonly height: number }
): number {
  const totalArea = viewBox.width * viewBox.height;
  let occupied = 0;
  for (const group of groups) {
    occupied += Math.PI * group.boundingRadius ** 2;
  }
  return Math.min(1, occupied / totalArea);
}

/**
 * Shifts all y-coordinates in an absolute SVG path string by `dy`.
 * Paths use alternating (x, y) pairs throughout M and C commands.
 */
function shiftPathY(path: string, dy: number): string {
  let index = 0;
  return path.replace(/-?\d+\.\d+/g, (match) => {
    const isY = index % 2 === 1;
    index++;
    if (isY) return (Number.parseFloat(match) + dy).toFixed(2);
    return match;
  });
}

/**
 * Ensures no stone in any group extends above `margin` or below
 * `viewBox.height - margin`. Shifts entire groups vertically when needed.
 */
function clampGroupsToViewport(
  groups: StoneGroup[],
  viewBox: { readonly width: number; readonly height: number },
  margin: number
): void {
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    let minY = Infinity;
    let maxY = -Infinity;
    for (const stone of group.stones) {
      minY = Math.min(minY, stone.y - stone.height / 2);
      maxY = Math.max(maxY, stone.y + stone.height / 2);
    }

    let dy = 0;
    if (minY < margin) {
      dy = margin - minY;
    } else if (maxY > viewBox.height - margin) {
      dy = viewBox.height - margin - maxY;
    }

    if (dy === 0) continue;

    groups[i] = {
      stones: group.stones.map((stone) => ({
        ...stone,
        y: stone.y + dy,
        path: shiftPathY(stone.path, dy),
      })),
      center: { x: group.center.x, y: group.center.y + dy },
      boundingRadius: group.boundingRadius,
    };
  }
}

/**
 * Finds the largest axis-aligned rectangle of unoccupied space on a coarse grid.
 * Landscape: 20 × 14 grid (~50 px cells). Portrait: 14 × 24 grid.
 * Brute-force O(rows² × cols) — grids are small.
 */
function findLargestEmptyRect(
  groups: readonly StoneGroup[],
  viewBox: { readonly width: number; readonly height: number },
  mode: CompositionMode
): { x: number; y: number; w: number; h: number } {
  const cols = mode === 'landscape' ? 20 : 14;
  const rows = mode === 'landscape' ? 14 : 24;
  const cellW = viewBox.width / cols;
  const cellH = viewBox.height / rows;

  // Build occupancy grid — mark cells within a group's visual influence.
  const occupied: boolean[][] = Array.from({ length: rows }, () =>
    new Array<boolean>(cols).fill(false)
  );
  for (const group of groups) {
    const radius = exclusionRadius(group);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c + 0.5) * cellW;
        const py = (r + 0.5) * cellH;
        if ((px - group.center.x) ** 2 + (py - group.center.y) ** 2 < radius ** 2) {
          occupied[r][c] = true;
        }
      }
    }
  }

  // Find largest empty rectangle.
  let bestArea = 0;
  let best = { x: 0, y: 0, w: cellW, h: cellH };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue;
      let maxW = cols - c;
      for (let h = 1; r + h <= rows; h++) {
        let w = 0;
        while (w < maxW && !occupied[r + h - 1][c + w]) w++;
        maxW = w;
        if (maxW === 0) break;
        if (maxW * h > bestArea) {
          bestArea = maxW * h;
          best = { x: c * cellW, y: r * cellH, w: maxW * cellW, h: h * cellH };
        }
      }
    }
  }

  return best;
}
