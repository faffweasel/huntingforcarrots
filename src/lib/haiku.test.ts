import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Line1Fragment,
  Line2Fragment,
  Line3Fragment,
  SemanticCluster,
} from '../data/haiku-fragments';
import { line1Fragments, line2Fragments, line3Fragments } from '../data/haiku-fragments';
import { generateHaiku, isOppositeTimeOfDay, isSeasonForward, seasonFromSeed } from './haiku';
import { createPrng } from './prng';

// Helper: build a PRNG from a numeric seed
function prng(seed: number) {
  return createPrng(seed);
}

// Build fragment lookup maps once
const l1Map = new Map<string, Line1Fragment>();
const l2Map = new Map<string, Line2Fragment>();
const l3Map = new Map<string, Line3Fragment>();
for (const f of line1Fragments) l1Map.set(f.text, f);
for (const f of line2Fragments) l2Map.set(f.text, f);
for (const f of line3Fragments) l3Map.set(f.text, f);

function getFragments(haiku: { line1: string; line2: string; line3: string }) {
  const f1 = l1Map.get(haiku.line1);
  const f2 = l2Map.get(haiku.line2);
  const f3 = l3Map.get(haiku.line3);
  return { f1, f2, f3 };
}

function sharesCluster(a: readonly SemanticCluster[], b: readonly SemanticCluster[]): boolean {
  // Safe: SemanticCluster is a string literal union — widening to string[] for .includes() membership check
  return a.some((c) => (b as readonly string[]).includes(c));
}

// --- seasonFromSeed ---

describe('seasonFromSeed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses YYYY-MM-DD and returns correct season for summer', () => {
    expect(seasonFromSeed('2026-07-15')).toBe('summer');
  });

  it('parses YYYY-MM-DD and returns correct season for winter', () => {
    expect(seasonFromSeed('2026-12-01')).toBe('winter');
  });

  it('parses spring month correctly', () => {
    expect(seasonFromSeed('2025-03-20')).toBe('spring');
  });

  it('parses autumn month correctly', () => {
    expect(seasonFromSeed('2025-09-01')).toBe('autumn');
  });

  it('rejects partial date "2026-07" and falls back to current month', () => {
    const currentSeason = seasonFromSeed('not-a-date');
    expect(seasonFromSeed('2026-07')).toBe(currentSeason);
  });

  it('rejects word "march" and falls back to current month', () => {
    const currentSeason = seasonFromSeed('not-a-date');
    expect(seasonFromSeed('march')).toBe(currentSeason);
  });

  it('non-date seed "dave" falls back to current month season', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1)); // July
    expect(seasonFromSeed('dave')).toBe('summer');
    vi.useRealTimers();
  });
});

// --- Determinism ---

describe('determinism', () => {
  it('same PRNG seed + same seed string produces same haiku', () => {
    const a = generateHaiku(prng(42), '2026-04-15');
    const b = generateHaiku(prng(42), '2026-04-15');
    expect(a).toEqual(b);
  });

  it('different PRNG seeds produce different haiku', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const h = generateHaiku(prng(i * 1000), '2026-04-15');
      results.add(`${h.line1}|${h.line2}|${h.line3}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

// --- Cluster compatibility ---

describe('cluster compatibility', () => {
  it('L1 and L2 share at least one cluster', () => {
    for (let seed = 0; seed < 50; seed++) {
      const h = generateHaiku(prng(seed), '2026-06-01');
      const { f1, f2 } = getFragments(h);
      if (f1 && f2) {
        expect(sharesCluster(f1.clusters, f2.clusters)).toBe(true);
      }
    }
  });

  it('L3 shares a cluster with L1 or L2', () => {
    for (let seed = 0; seed < 50; seed++) {
      const h = generateHaiku(prng(seed), '2026-06-01');
      const { f1, f2, f3 } = getFragments(h);
      if (f1 && f2 && f3) {
        expect(
          sharesCluster(f1.clusters, f3.clusters) || sharesCluster(f2.clusters, f3.clusters)
        ).toBe(true);
      }
    }
  });
});

// --- Empty banks ---

describe('empty banks', () => {
  it('returns fallback haiku when banks are empty', async () => {
    vi.resetModules();
    vi.doMock('../data/haiku-fragments', () => ({
      line1Fragments: [],
      line2Fragments: [],
      line3Fragments: [],
    }));

    const { generateHaiku: gen } = await import('./haiku');
    const h = gen(prng(1), 'test');
    expect(h.line1).toBe('soft dusk fills the room');
    expect(h.line2).toBe('candles flicker in darkness');
    expect(h.line3).toBe('dust settles on wood');

    vi.doUnmock('../data/haiku-fragments');
    vi.resetModules();
  });
});

// --- Noun filtering ---

describe('noun filtering', () => {
  it('strong noun in L1 never appears in L2 or L3', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;

      const strongL1 = f1.nouns.filter((n) => n.strength === 'strong').map((n) => n.word);
      const l2Words = f2.nouns.map((n) => n.word);
      const l3Words = f3.nouns.map((n) => n.word);

      for (const word of strongL1) {
        expect(l2Words).not.toContain(word);
        expect(l3Words).not.toContain(word);
      }
    }
  });

  it('weak noun in L1 never appears in L2 (adjacent)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;

      const weakL1 = f1.nouns.filter((n) => n.strength === 'weak').map((n) => n.word);
      const l2Words = f2.nouns.map((n) => n.word);

      for (const word of weakL1) {
        expect(l2Words).not.toContain(word);
      }
    }
  });

  it('weak noun in L1 MAY appear in L3 (non-adjacent, allowed)', () => {
    let foundWeakEcho = false;
    for (let seed = 0; seed < 500; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f3 } = getFragments(h);
      if (!f1 || !f3) continue;

      const weakL1 = f1.nouns.filter((n) => n.strength === 'weak').map((n) => n.word);
      const l3Words = f3.nouns.map((n) => n.word);

      if (weakL1.some((w) => l3Words.includes(w))) {
        foundWeakEcho = true;
        break;
      }
    }
    expect(foundWeakEcho).toBe(true);
  });

  it('strong noun in L2 never appears in L3', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f2, f3 } = getFragments(h);
      if (!f2 || !f3) continue;

      const strongL2 = f2.nouns.filter((n) => n.strength === 'strong').map((n) => n.word);
      const l3Words = f3.nouns.map((n) => n.word);

      for (const word of strongL2) {
        expect(l3Words).not.toContain(word);
      }
    }
  });

  it('weak noun in L2 never appears in L3 (adjacent)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f2, f3 } = getFragments(h);
      if (!f2 || !f3) continue;

      const weakL2 = f2.nouns.filter((n) => n.strength === 'weak').map((n) => n.word);
      const l3Words = f3.nouns.map((n) => n.word);

      for (const word of weakL2) {
        expect(l3Words).not.toContain(word);
      }
    }
  });
});

// --- Directional season filtering ---

describe('directional season filtering', () => {
  it('spring L1 + summer L2 → accepted (one step forward)', () => {
    expect(isSeasonForward('spring', 'summer')).toBe(true);
  });

  it('summer L1 + autumn L2 → accepted (one step forward)', () => {
    expect(isSeasonForward('summer', 'autumn')).toBe(true);
  });

  it('autumn L1 + winter L2 → accepted (one step forward)', () => {
    expect(isSeasonForward('autumn', 'winter')).toBe(true);
  });

  it('winter L1 + spring L2 → accepted (wraps forward)', () => {
    expect(isSeasonForward('winter', 'spring')).toBe(true);
  });

  it('summer L1 + spring L2 → rejected (backwards)', () => {
    expect(isSeasonForward('summer', 'spring')).toBe(false);
  });

  it('autumn L1 + summer L2 → rejected (backwards)', () => {
    expect(isSeasonForward('autumn', 'summer')).toBe(false);
  });

  it('spring L1 + autumn L2 → rejected (two steps forward)', () => {
    expect(isSeasonForward('spring', 'autumn')).toBe(false);
  });

  it('spring L1 + summer L2 + autumn L3 → accepted (each pair one step)', () => {
    expect(isSeasonForward('spring', 'summer')).toBe(true);
    expect(isSeasonForward('summer', 'autumn')).toBe(true);
    // L1↔L3 check only applies when L2 is 'none'; with real L2, adjacent checks suffice
  });

  it('spring L1 + none L2 + autumn L3 → rejected (L1↔L3 two steps)', () => {
    expect(isSeasonForward('spring', 'none')).toBe(true);
    expect(isSeasonForward('none', 'autumn')).toBe(true);
    expect(isSeasonForward('spring', 'autumn')).toBe(false);
  });

  it('spring L1 + none L2 + summer L3 → accepted (L1↔L3 one step)', () => {
    expect(isSeasonForward('spring', 'none')).toBe(true);
    expect(isSeasonForward('none', 'summer')).toBe(true);
    expect(isSeasonForward('spring', 'summer')).toBe(true);
  });

  it('none L1 + any L2 + any L3 → season check passes (none is transparent)', () => {
    expect(isSeasonForward('none', 'spring')).toBe(true);
    expect(isSeasonForward('none', 'summer')).toBe(true);
    expect(isSeasonForward('none', 'autumn')).toBe(true);
    expect(isSeasonForward('none', 'winter')).toBe(true);
    expect(isSeasonForward('none', 'none')).toBe(true);
  });

  it('same season across all three lines → accepted', () => {
    expect(isSeasonForward('spring', 'spring')).toBe(true);
    expect(isSeasonForward('summer', 'summer')).toBe(true);
    expect(isSeasonForward('autumn', 'autumn')).toBe(true);
    expect(isSeasonForward('winter', 'winter')).toBe(true);
  });
});

// --- Setting validation ---

describe('setting validation', () => {
  it('all three lines with same setting are rejected (re-rolled)', () => {
    let allSameCount = 0;
    for (let seed = 0; seed < 200; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;
      if (f1.setting === f2.setting && f2.setting === f3.setting) {
        allSameCount++;
      }
    }
    // Re-rolling should prevent most all-same combos; a few slip through
    // when the 10-attempt cap is hit and best-available is returned.
    expect(allSameCount).toBeLessThan(10);
  });

  it('two lines same setting + one different is accepted', () => {
    let foundTwoSame = false;
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;
      const unique = new Set([f1.setting, f2.setting, f3.setting]);
      if (unique.size === 2) {
        foundTwoSame = true;
        break;
      }
    }
    expect(foundTwoSame).toBe(true);
  });
});

// --- Adjacent setting compatibility ---

describe('adjacent setting compatibility', () => {
  it('natural L1 + urban L2 is rejected', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;
      if (f1.setting === 'natural') {
        expect(f2.setting).not.toBe('urban');
      }
    }
  });

  it('urban L1 + natural L2 is rejected', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;
      if (f1.setting === 'urban') {
        expect(f2.setting).not.toBe('natural');
      }
    }
  });

  it('natural L1 + domestic L2 is accepted', () => {
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;
      if (f1.setting === 'natural' && f2.setting === 'domestic') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('domestic L1 + urban L2 is accepted', () => {
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;
      if (f1.setting === 'domestic' && f2.setting === 'urban') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('natural + domestic + urban is accepted (domestic bridges)', () => {
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;
      if (f1.setting === 'natural' && f2.setting === 'domestic' && f3.setting === 'urban') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('natural + urban + domestic is rejected (L1↔L2 fails)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;
      if (f1.setting === 'natural' && f3.setting === 'domestic') {
        expect(f2.setting).not.toBe('urban');
      }
    }
  });
});

// --- Cluster diversity validation ---

describe('cluster diversity', () => {
  it('haiku almost always has at least two distinct connecting clusters', () => {
    let failCount = 0;
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2, f3 } = getFragments(h);
      if (!f1 || !f2 || !f3) continue;

      // Safe: SemanticCluster is a string literal union — widening to string[] for .includes() membership check
      const connecting = new Set<string>();
      for (const c of f1.clusters) {
        if ((f2.clusters as readonly string[]).includes(c)) connecting.add(c);
      }
      for (const c of f2.clusters) {
        if ((f3.clusters as readonly string[]).includes(c)) connecting.add(c);
      }
      for (const c of f1.clusters) {
        if ((f3.clusters as readonly string[]).includes(c)) connecting.add(c);
      }

      if (connecting.size < 2) failCount++;
    }
    // A few may slip through when the 10-attempt re-roll cap is hit
    expect(failCount).toBeLessThan(5);
  });
});

// --- Conceptual group filtering ---

describe('conceptual group filtering', () => {
  it('adjacent lines (L1↔L2) never share a conceptual group', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f2 } = getFragments(h);
      if (!f1 || !f2) continue;
      if (f1.conceptual_group && f2.conceptual_group) {
        expect(f1.conceptual_group).not.toBe(f2.conceptual_group);
      }
    }
  });

  it('adjacent lines (L2↔L3) never share a conceptual group', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f2, f3 } = getFragments(h);
      if (!f2 || !f3) continue;
      if (f2.conceptual_group && f3.conceptual_group) {
        expect(f2.conceptual_group).not.toBe(f3.conceptual_group);
      }
    }
  });

  it('L1 and L3 never share a conceptual group (treated as strong)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const h = generateHaiku(prng(seed), '2026-04-01');
      const { f1, f3 } = getFragments(h);
      if (!f1 || !f3) continue;
      if (f1.conceptual_group && f3.conceptual_group) {
        expect(f1.conceptual_group).not.toBe(f3.conceptual_group);
      }
    }
  });
});

// --- Time-of-day filtering ---

describe('time-of-day filtering', () => {
  it('dawn L1 + night L2 → rejected', () => {
    expect(isOppositeTimeOfDay('dawn', 'night')).toBe(true);
  });

  it('night L1 + dawn L2 → rejected', () => {
    expect(isOppositeTimeOfDay('night', 'dawn')).toBe(true);
  });

  it('dawn L1 + day L2 → accepted', () => {
    expect(isOppositeTimeOfDay('dawn', 'day')).toBe(false);
  });

  it('dusk L1 + night L2 → accepted', () => {
    expect(isOppositeTimeOfDay('dusk', 'night')).toBe(false);
  });

  it('day L1 + night L2 → rejected', () => {
    expect(isOppositeTimeOfDay('day', 'night')).toBe(true);
  });

  it('dawn L1 + none L2 + night L3 → rejected (L1↔L3 opposite)', () => {
    expect(isOppositeTimeOfDay('dawn', 'night')).toBe(true);
    expect(isOppositeTimeOfDay('dawn', 'none')).toBe(false);
    expect(isOppositeTimeOfDay('none', 'night')).toBe(false);
  });

  it('none L1 + none L2 + none L3 → accepted', () => {
    expect(isOppositeTimeOfDay('none', 'none')).toBe(false);
  });
});

// --- Re-roll cap ---

describe('re-roll cap', () => {
  it('returns a haiku even if validation keeps failing', () => {
    const h = generateHaiku(prng(12345), '2026-04-01');
    expect(h.line1).toBeTruthy();
    expect(h.line2).toBeTruthy();
    expect(h.line3).toBeTruthy();
  });
});
