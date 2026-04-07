import type {
  Line1Fragment,
  Line2Fragment,
  Line3Fragment,
  NounEntry,
  Season,
  SemanticCluster,
  Setting,
  TimeOfDay,
} from '../data/haiku-fragments';
import { line1Fragments, line2Fragments, line3Fragments } from '../data/haiku-fragments';

export interface Haiku {
  readonly line1: string;
  readonly line2: string;
  readonly line3: string;
}

const FALLBACK_HAIKU: Haiku = {
  line1: 'soft dusk fills the room',
  line2: 'candles flicker in darkness',
  line3: 'dust settles on wood',
};

const NEXT_SEASON: Readonly<Record<Season, Season>> = {
  spring: 'summer',
  summer: 'autumn',
  autumn: 'winter',
  winter: 'spring',
  none: 'none',
};

const OPPOSITE_TIMES: Readonly<Record<TimeOfDay, readonly TimeOfDay[]>> = {
  dawn: ['night', 'dusk'],
  day: ['night'],
  dusk: ['dawn'],
  night: ['dawn', 'day'],
  none: [],
};

const MAX_REROLLS = 10;

// --- Season helpers ---

function monthToSeason(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function seasonFromSeed(seed: string): Season {
  const match = seed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const month = parseInt(match[2], 10) - 1;
    return monthToSeason(month);
  }
  return monthToSeason(new Date().getMonth());
}

// --- Filtering helpers ---

function sharesCluster(a: readonly SemanticCluster[], b: readonly SemanticCluster[]): boolean {
  for (const c of a) {
    if (b.includes(c)) return true;
  }
  return false;
}

function sharedClusters(
  a: readonly SemanticCluster[],
  b: readonly SemanticCluster[]
): SemanticCluster[] {
  const result: SemanticCluster[] = [];
  for (const c of a) {
    if (b.includes(c)) result.push(c);
  }
  return result;
}

export function isSeasonForward(from: Season, to: Season): boolean {
  if (from === 'none' || to === 'none') return true;
  if (from === to) return true;
  return NEXT_SEASON[from] === to;
}

export function isOppositeTimeOfDay(a: TimeOfDay, b: TimeOfDay): boolean {
  if (a === 'none' || b === 'none') return false;
  return OPPOSITE_TIMES[a].includes(b);
}

function hasNounConflictAdjacent(a: readonly NounEntry[], b: readonly NounEntry[]): boolean {
  for (const na of a) {
    for (const nb of b) {
      if (na.word === nb.word) return true;
    }
  }
  return false;
}

function hasStrongNounConflict(a: readonly NounEntry[], b: readonly NounEntry[]): boolean {
  for (const na of a) {
    for (const nb of b) {
      if (na.word === nb.word && (na.strength === 'strong' || nb.strength === 'strong')) {
        return true;
      }
    }
  }
  return false;
}

function hasConceptualGroupConflict(
  groupA: string | undefined,
  groupB: string | undefined
): boolean {
  return groupA !== undefined && groupB !== undefined && groupA === groupB;
}

function isJarringSettingTransition(a: Setting, b: Setting): boolean {
  return (a === 'natural' && b === 'urban') || (a === 'urban' && b === 'natural');
}

// --- Season-weighted selection ---

function seasonWeightedPick<T extends { readonly season: Season }>(
  prng: () => number,
  pool: readonly T[],
  season: Season
): T {
  if (prng() < 0.6) {
    const seasonal = pool.filter((f) => f.season === season || f.season === 'none');
    if (seasonal.length > 0) {
      return seasonal[Math.floor(prng() * seasonal.length)];
    }
  }
  return pool[Math.floor(prng() * pool.length)];
}

// --- Main engine ---

export function generateHaiku(prng: () => number, seed: string): Haiku {
  const l1Bank = line1Fragments;
  const l2Bank = line2Fragments;
  const l3Bank = line3Fragments;

  if (l1Bank.length === 0 || l2Bank.length === 0 || l3Bank.length === 0) {
    return FALLBACK_HAIKU;
  }

  const sparse = l1Bank.length < 3 || l2Bank.length < 3 || l3Bank.length < 3;
  const season = seasonFromSeed(seed);

  const line1 = seasonWeightedPick(prng, l1Bank, season);

  let bestResult: Haiku = FALLBACK_HAIKU;

  for (let attempt = 0; attempt < MAX_REROLLS; attempt++) {
    const line2 = selectLine2(prng, line1, l2Bank, season, sparse);
    const line3 = selectLine3(prng, line1, line2, l3Bank, season, sparse);

    const result: Haiku = {
      line1: line1.text,
      line2: line2.text,
      line3: line3.text,
    };

    if (attempt === 0) bestResult = result;

    if (sparse || validateCombination(line1, line2, line3)) {
      return result;
    }
  }

  return bestResult;
}

function selectLine2(
  prng: () => number,
  line1: Line1Fragment,
  bank: readonly Line2Fragment[],
  season: Season,
  sparse: boolean
): Line2Fragment {
  if (sparse) return seasonWeightedPick(prng, bank, season);

  let pool = bank.filter(
    (f) =>
      sharesCluster(line1.clusters, f.clusters) &&
      isSeasonForward(line1.season, f.season) &&
      !isOppositeTimeOfDay(line1.time_of_day, f.time_of_day) &&
      !isJarringSettingTransition(line1.setting, f.setting) &&
      !hasNounConflictAdjacent(line1.nouns, f.nouns) &&
      !hasConceptualGroupConflict(line1.conceptual_group, f.conceptual_group)
  );

  if (pool.length === 0) {
    pool = bank.filter(
      (f) =>
        !hasNounConflictAdjacent(line1.nouns, f.nouns) &&
        isSeasonForward(line1.season, f.season) &&
        !isOppositeTimeOfDay(line1.time_of_day, f.time_of_day) &&
        !isJarringSettingTransition(line1.setting, f.setting)
    );
  }

  if (pool.length === 0) return bank[Math.floor(prng() * bank.length)];

  return seasonWeightedPick(prng, pool, season);
}

function selectLine3(
  prng: () => number,
  line1: Line1Fragment,
  line2: Line2Fragment,
  bank: readonly Line3Fragment[],
  season: Season,
  sparse: boolean
): Line3Fragment {
  if (sparse) return seasonWeightedPick(prng, bank, season);

  let pool = bank.filter((f) => {
    if (!sharesCluster(line1.clusters, f.clusters) && !sharesCluster(line2.clusters, f.clusters)) {
      return false;
    }

    if (!isSeasonForward(line2.season, f.season)) return false;
    if (line2.season === 'none' && !isSeasonForward(line1.season, f.season)) return false;

    if (
      isOppositeTimeOfDay(line1.time_of_day, f.time_of_day) ||
      isOppositeTimeOfDay(line2.time_of_day, f.time_of_day)
    ) {
      return false;
    }

    // L2↔L3: adjacent setting compatibility
    if (isJarringSettingTransition(line2.setting, f.setting)) return false;

    // L1↔L3: strong nouns rejected, weak allowed (non-adjacent)
    if (hasStrongNounConflict(line1.nouns, f.nouns)) return false;

    // L2↔L3: all noun overlap rejected (adjacent)
    if (hasNounConflictAdjacent(line2.nouns, f.nouns)) return false;

    // Conceptual group: L2↔L3 adjacent → reject; L1↔L3 → reject (treated as strong)
    if (hasConceptualGroupConflict(line2.conceptual_group, f.conceptual_group)) return false;
    if (hasConceptualGroupConflict(line1.conceptual_group, f.conceptual_group)) return false;

    return true;
  });

  if (pool.length === 0) {
    pool = bank.filter(
      (f) =>
        !hasNounConflictAdjacent(line2.nouns, f.nouns) &&
        !hasStrongNounConflict(line1.nouns, f.nouns) &&
        isSeasonForward(line2.season, f.season) &&
        (line2.season !== 'none' || isSeasonForward(line1.season, f.season)) &&
        !isOppositeTimeOfDay(line1.time_of_day, f.time_of_day) &&
        !isOppositeTimeOfDay(line2.time_of_day, f.time_of_day) &&
        !isJarringSettingTransition(line2.setting, f.setting)
    );
  }

  if (pool.length === 0) return bank[Math.floor(prng() * bank.length)];

  return seasonWeightedPick(prng, pool, season);
}

function validateCombination(
  line1: Line1Fragment,
  line2: Line2Fragment,
  line3: Line3Fragment
): boolean {
  // Directional season check: seasons must move forward (spring→summer→autumn→winter→spring)
  if (!isSeasonForward(line1.season, line2.season)) return false;
  if (!isSeasonForward(line2.season, line3.season)) return false;
  if (line2.season === 'none' && !isSeasonForward(line1.season, line3.season)) return false;

  // Time-of-day check: opposite pairs rejected across all lines
  if (isOppositeTimeOfDay(line1.time_of_day, line2.time_of_day)) return false;
  if (isOppositeTimeOfDay(line2.time_of_day, line3.time_of_day)) return false;
  if (isOppositeTimeOfDay(line1.time_of_day, line3.time_of_day)) return false;

  // Setting check: all three same → reject
  if (line1.setting === line2.setting && line2.setting === line3.setting) {
    return false;
  }

  // Adjacent setting compatibility: natural ↔ urban rejected (domestic bridges both)
  if (isJarringSettingTransition(line1.setting, line2.setting)) return false;
  if (isJarringSettingTransition(line2.setting, line3.setting)) return false;

  // Cluster diversity: collect all clusters connecting any line pair
  const connecting = new Set<SemanticCluster>();
  for (const c of sharedClusters(line1.clusters, line2.clusters)) connecting.add(c);
  for (const c of sharedClusters(line2.clusters, line3.clusters)) connecting.add(c);
  for (const c of sharedClusters(line1.clusters, line3.clusters)) connecting.add(c);

  if (connecting.size < 2) return false;

  return true;
}
