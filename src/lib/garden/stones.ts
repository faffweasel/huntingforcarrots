import { pick, randomFloat } from '../prng';
import { generateStone } from './primitives';
import type { Stone, StoneGroup, StonePosture } from './types';

// ─── Posture profiles ────────────────────────────────────────────────────────

interface PostureProfile {
  readonly widthRange: { readonly min: number; readonly max: number };
  /** Height as a ratio of width. Values >1 produce stones taller than wide. */
  readonly heightRatio: { readonly min: number; readonly max: number };
  readonly rotationRange: { readonly min: number; readonly max: number };
  readonly perturbation: { readonly min: number; readonly max: number };
}

// Posture-specific ratios intentionally exceed the original spec range of 0.4–0.8×.
// Each posture defines a distinct stone character type — see CLAUDE.md stone rules.
const PROFILES: Record<StonePosture, PostureProfile> = {
  taido: {
    widthRange: { min: 40, max: 70 },
    heightRatio: { min: 1.3, max: 2.0 },
    rotationRange: { min: -5, max: 5 },
    perturbation: { min: 0.05, max: 0.12 },
  },
  reisho: {
    widthRange: { min: 35, max: 60 },
    heightRatio: { min: 1.0, max: 1.4 },
    rotationRange: { min: -5, max: 5 },
    perturbation: { min: 0.05, max: 0.12 },
  },
  shigyo: {
    widthRange: { min: 40, max: 65 },
    heightRatio: { min: 1.0, max: 1.5 },
    rotationRange: { min: 15, max: 25 },
    perturbation: { min: 0.06, max: 0.15 },
  },
  shintai: {
    widthRange: { min: 50, max: 100 },
    heightRatio: { min: 0.4, max: 0.65 },
    rotationRange: { min: -8, max: 8 },
    perturbation: { min: 0.05, max: 0.12 },
  },
  kikyaku: {
    widthRange: { min: 60, max: 120 },
    heightRatio: { min: 0.25, max: 0.45 },
    rotationRange: { min: -5, max: 5 },
    perturbation: { min: 0.04, max: 0.1 },
  },
};

// Companion posture options for pairs and triads.
const PAIR_COMPANIONS: readonly StonePosture[] = ['reisho', 'shintai', 'kikyaku'];
const TRIAD_COMPANIONS: ReadonlyArray<readonly [StonePosture, StonePosture]> = [
  ['reisho', 'shintai'],
  ['reisho', 'kikyaku'],
  ['shigyo', 'kikyaku'],
  ['shigyo', 'shintai'],
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Composes a stone group using traditional karesansui posture rules.
 *
 * - Singleton (1): taido
 * - Pair (2): taido + companion (reisho | shintai | kikyaku)
 * - Triad (3): taido + two companions in triangular arrangement
 *
 * Stones are ground-aligned: all bases sit on the group's ground line.
 * The dominant stone is offset from the group centre (never centred).
 */
export function composeGroup(
  prng: () => number,
  groupSize: number,
  cx: number,
  cy: number,
  viewBoxHeight: number
): StoneGroup {
  if (groupSize === 1) return composeSingleton(prng, cx, cy, viewBoxHeight);
  if (groupSize === 2) return composePair(prng, cx, cy, viewBoxHeight);
  return composeTriad(prng, cx, cy, viewBoxHeight);
}

// ─── Group composition ───────────────────────────────────────────────────────

function composeSingleton(
  prng: () => number,
  cx: number,
  groundY: number,
  viewBoxHeight: number
): StoneGroup {
  const stone = placeStone(prng, 'taido', cx, groundY, 1.0, viewBoxHeight, true);
  return buildGroupBounds([stone], cx, groundY);
}

function composePair(
  prng: () => number,
  cx: number,
  groundY: number,
  viewBoxHeight: number
): StoneGroup {
  const companion = pick(prng, PAIR_COMPANIONS);

  // Dominant offset from group centre (never centred in group)
  const dir = prng() < 0.5 ? -1 : 1;
  const domOffset = randomFloat(prng, 20, 40);
  const compOffset = randomFloat(prng, 5, 20);
  const compScale = randomFloat(prng, 0.5, 0.8);
  // Slight depth stagger — companion sits a few px forward or back
  const compGroundOff = randomFloat(prng, -12, 8);

  const dominant = placeStone(
    prng,
    'taido',
    cx + dir * domOffset,
    groundY,
    1.0,
    viewBoxHeight,
    true
  );
  const comp = placeStone(
    prng,
    companion,
    cx - dir * compOffset,
    groundY + compGroundOff,
    compScale,
    viewBoxHeight,
    false
  );

  return buildGroupBounds([dominant, comp], cx, groundY);
}

function composeTriad(
  prng: () => number,
  cx: number,
  groundY: number,
  viewBoxHeight: number
): StoneGroup {
  const [secondPosture, thirdPosture] = pick(prng, TRIAD_COMPANIONS);

  // Dominant: offset from centre, ground slightly above group base
  const dir = prng() < 0.5 ? -1 : 1;
  const domXOff = randomFloat(prng, 10, 30);
  const domGroundOff = randomFloat(prng, -10, 0);

  // Second: opposite side, roughly level
  const secXOff = randomFloat(prng, 25, 50);
  const secGroundOff = randomFloat(prng, -5, 5);
  const secScale = randomFloat(prng, 0.55, 0.8);

  // Third: same side as dominant but lower and offset, completing the triangle
  const thirdXOff = randomFloat(prng, 15, 35);
  const thirdGroundOff = randomFloat(prng, 0, 10);
  const thirdScale = randomFloat(prng, 0.4, 0.65);

  const dominant = placeStone(
    prng,
    'taido',
    cx + dir * domXOff,
    groundY + domGroundOff,
    1.0,
    viewBoxHeight,
    true
  );
  const sec = placeStone(
    prng,
    secondPosture,
    cx - dir * secXOff,
    groundY + secGroundOff,
    secScale,
    viewBoxHeight,
    false
  );
  const thr = placeStone(
    prng,
    thirdPosture,
    cx + dir * thirdXOff,
    groundY + thirdGroundOff,
    thirdScale,
    viewBoxHeight,
    false
  );

  return buildGroupBounds([dominant, sec, thr], cx, groundY);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a single stone with posture-specific dimensions and places it
 * so its base sits on the given ground line.
 */
function placeStone(
  prng: () => number,
  posture: StonePosture,
  x: number,
  groundY: number,
  scale: number,
  viewBoxHeight: number,
  isDominant: boolean
): Stone {
  const profile = PROFILES[posture];
  const baseW = randomFloat(prng, profile.widthRange.min, profile.widthRange.max) * scale;
  const baseH = baseW * randomFloat(prng, profile.heightRatio.min, profile.heightRatio.max);

  // Solve for centreY such that centreY + scaledH/2 = groundY exactly,
  // where scaledH = baseH * (0.85 + centreY/viewBoxHeight * 0.15).
  // This avoids the double-depth-scale error where stones float above ground.
  const centreY = (groundY - (baseH * 0.85) / 2) / (1 + (baseH * 0.15) / (2 * viewBoxHeight));

  // Shigyo leans randomly left or right
  let rotRange = profile.rotationRange;
  if (posture === 'shigyo') {
    const lean = prng() < 0.5 ? 1 : -1;
    rotRange =
      lean === 1
        ? profile.rotationRange
        : { min: -profile.rotationRange.max, max: -profile.rotationRange.min };
  }

  return generateStone(prng, {
    x,
    y: centreY,
    width: baseW,
    height: baseH,
    viewBoxHeight,
    rotationRange: rotRange,
    perturbation: profile.perturbation,
    lowerHalfBoost: isDominant ? 0.05 : 0,
    posture,
  });
}

/**
 * Builds a StoneGroup using the placement position as the group centre.
 *
 * In karesansui, concentric rings emanate from the stone base (ground level),
 * so we anchor the group centre at the original placement position rather
 * than the visual centroid of the stones.
 */
function buildGroupBounds(stones: readonly Stone[], cx: number, cy: number): StoneGroup {
  let boundingRadius = 0;
  for (const stone of stones) {
    const dx = stone.x - cx;
    const dy = stone.y - cy;
    const stoneR = Math.sqrt((stone.width / 2) ** 2 + (stone.height / 2) ** 2);
    boundingRadius = Math.max(boundingRadius, Math.sqrt(dx ** 2 + dy ** 2) + stoneR);
  }

  return { stones, center: { x: cx, y: cy }, boundingRadius };
}
