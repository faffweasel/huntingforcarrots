import { pick, randomFloat, randomInt, shuffle } from '../prng';
import {
  type ExclusionPolygon,
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
const DEFAULT_RAKE_SPACING = { min: 10, max: 14 };

export function compose(
  prng: () => number,
  mode: CompositionMode,
  config?: ResponsiveConfig,
  viewport?: { readonly width: number; readonly height: number },
  debugLayers?: boolean,
  debugVerbose?: boolean
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
  // Margin accounts for xMidYMid slice cropping on wide screens.
  const margin = computeSliceMargin(viewBox, viewport);
  clampGroupsToViewport(stoneGroups, viewBox, margin);

  // --- Compute max ring expansions (prevent inter-group ring overlap) ---
  const maxExpansions = computeMaxExpansions(stoneGroups);

  // --- Rake patterns ---
  // Generate per-group ring data, then prune overlaps before merging.
  const perGroupRings = stoneGroups.map((group, i) =>
    generateConcentricRake(prng, group, maxExpansions[i])
  );
  pruneOverlappingRings(stoneGroups, perGroupRings);

  // --- Debug logging (#debug=verbose) ---
  if (debugVerbose) {
    for (let i = 0; i < stoneGroups.length; i++) {
      const g = stoneGroups[i];
      const r = perGroupRings[i];
      console.log(
        `[debug] group ${i}: centre=(${g.center.x.toFixed(1)}, ${g.center.y.toFixed(1)})` +
          ` stones=${g.stones.length} boundingRadius=${g.boundingRadius.toFixed(1)}` +
          ` ringCount=${r.paths.length}` +
          ` outermostRadius=${r.radiusPerRing.length > 0 ? r.radiusPerRing[r.radiusPerRing.length - 1].toFixed(1) : 'none'}` +
          ` radiusPerRing=[${r.radiusPerRing.map((v) => v.toFixed(1)).join(', ')}]`
      );
    }
  }

  // Merge pruned per-group data into a single RakePattern.
  const concentricPaths: string[] = [];
  const concentricOpacities: number[] = [];
  for (const rings of perGroupRings) {
    concentricPaths.push(...rings.paths);
    concentricOpacities.push(...rings.opacities);
  }
  const concentricRake: RakePattern = { paths: concentricPaths, opacities: concentricOpacities };

  // Exclusion polygons from the outermost ring of each group — the 5px gap
  // is applied inside the polygon clipper, so the shape matches exactly.
  const exclusionPolygons: ExclusionPolygon[] = perGroupRings.map((rings) => ({
    points:
      rings.pointsPerRing.length > 0 ? rings.pointsPerRing[rings.pointsPerRing.length - 1] : [],
  }));
  const parallelRake = generateParallelRake(prng, viewBox, rakeSpacing, exclusionPolygons);

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
    debugLayers,
    debugVerbose,
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
 * Computes the safe margin for viewport clamping, accounting for
 * `preserveAspectRatio="xMidYMid slice"` cropping.
 *
 * When the viewport is wider than the viewBox aspect ratio, the SVG is
 * scaled to fill width and the top/bottom are cropped. The margin must
 * keep stones inside the visible region, not just inside the viewBox.
 */
function computeSliceMargin(
  viewBox: { readonly width: number; readonly height: number },
  viewport?: { readonly width: number; readonly height: number }
): number {
  const BASE_MARGIN = 20;
  if (!viewport) return BASE_MARGIN;

  const svgAspect = viewBox.width / viewBox.height;
  const vpAspect = viewport.width / viewport.height;

  // If viewport aspect <= viewBox aspect, Y axis is not cropped.
  if (vpAspect <= svgAspect) return BASE_MARGIN;

  // viewBox units cropped from top (and bottom) by xMidYMid slice.
  const cropVB = (viewBox.height * (1 - svgAspect / vpAspect)) / 2;
  return Math.max(BASE_MARGIN, Math.ceil(cropVB) + 15);
}

/**
 * Computes the maximum ring expansion budget per group, preventing
 * inter-group ring overlap.
 *
 * Default expansion = boundingRadius × 1.0 (rings extend to 2× bounding radius).
 * When two groups' rings would overlap, the available gap (clearance minus
 * 10px buffer) is split proportionally by bounding radius — larger groups
 * get more expansion, smaller groups get less.
 */
function computeMaxExpansions(groups: readonly StoneGroup[]): number[] {
  const expansions = groups.map((g) => g.boundingRadius * 1.0);

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const dx = groups[i].center.x - groups[j].center.x;
      const dy = groups[i].center.y - groups[j].center.y;
      const dist = Math.sqrt(dx ** 2 + dy ** 2);
      const clearance = dist - groups[i].boundingRadius - groups[j].boundingRadius;
      const budget = Math.max(0, clearance - 10);

      // Would both groups' rings overlap in the shared space?
      if (expansions[i] + expansions[j] > budget) {
        // Split proportionally by bounding radius so larger groups get more.
        const totalBR = groups[i].boundingRadius + groups[j].boundingRadius;
        const shareI = budget * (groups[i].boundingRadius / totalBR);
        const shareJ = budget * (groups[j].boundingRadius / totalBR);
        expansions[i] = Math.min(expansions[i], Math.max(20, shareI));
        expansions[j] = Math.min(expansions[j], Math.max(20, shareJ));
      }
    }
  }

  return expansions;
}

/**
 * Post-generation overlap pruning. Checks every pair of groups — if
 * the sum of their outermost ring radii exceeds the centre-to-centre
 * distance, removes outermost rings from the SMALLER group until a
 * minimum 20px gap exists between nearest rings of adjacent groups.
 * Recomputes opacities after pruning so the new outermost ring fades correctly.
 */
function pruneOverlappingRings(
  groups: readonly StoneGroup[],
  rings: {
    paths: string[];
    opacities: number[];
    radiusPerRing: number[];
    outermostRadius: number;
    pointsPerRing: Array<Array<{ x: number; y: number }>>;
  }[]
): void {
  const MIN_GAP = 20;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const dx = groups[i].center.x - groups[j].center.x;
      const dy = groups[i].center.y - groups[j].center.y;
      const dist = Math.sqrt(dx ** 2 + dy ** 2);

      // Determine which group is smaller (fewer stones = subordinate).
      const smallerIdx = groups[i].stones.length <= groups[j].stones.length ? i : j;
      const largerIdx = smallerIdx === i ? j : i;

      // Remove outermost rings from smaller group until gap is sufficient.
      // Floor at 2 rings — allow slight overlap rather than stripping a group bare.
      while (rings[smallerIdx].radiusPerRing.length > 2) {
        const radiusSmall =
          rings[smallerIdx].radiusPerRing[rings[smallerIdx].radiusPerRing.length - 1];
        const radiusLarge =
          rings[largerIdx].radiusPerRing.length > 0
            ? rings[largerIdx].radiusPerRing[rings[largerIdx].radiusPerRing.length - 1]
            : 0;
        const gap = dist - radiusSmall - radiusLarge;
        if (gap >= MIN_GAP) break;

        rings[smallerIdx].paths.pop();
        rings[smallerIdx].opacities.pop();
        rings[smallerIdx].radiusPerRing.pop();
        rings[smallerIdx].pointsPerRing.pop();
      }
    }
  }

  // Recompute opacities: new outermost → 0.3, second-to-last → 0.6, rest → 1.0.
  for (const ring of rings) {
    const count = ring.opacities.length;
    for (let k = 0; k < count; k++) {
      const fromEnd = count - 1 - k;
      ring.opacities[k] = fromEnd === 0 ? 0.3 : fromEnd === 1 ? 0.6 : 1.0;
    }
  }
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
 * Extracts the minimum and maximum Y coordinates from an SVG path string.
 * Paths use alternating (x, y) pairs — every odd-indexed number is a Y value.
 * Includes Bézier control points, giving a conservative bounding box.
 */
function pathExtentsY(path: string): { minY: number; maxY: number } {
  let minY = Infinity;
  let maxY = -Infinity;
  let index = 0;
  path.replace(/-?\d+\.\d+/g, (match) => {
    if (index % 2 === 1) {
      const y = Number.parseFloat(match);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    index++;
    return match;
  });
  return { minY, maxY };
}

/**
 * Ensures no stone in any group extends above `margin` or below
 * `viewBox.height - margin`. Uses actual SVG path extents (not the
 * simple y ± h/2 estimate) so rotated/perturbed stones are caught.
 * Shifts entire groups vertically when needed.
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
      const extents = pathExtentsY(stone.path);
      minY = Math.min(minY, extents.minY);
      maxY = Math.max(maxY, extents.maxY);
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
