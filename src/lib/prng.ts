// Mulberry32 — fast, deterministic PRNG with good distribution for visual output.
// Original algorithm by Tommy Ettinger.
export function createPrng(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// Integer in [min, max] inclusive.
export function randomInt(prng: () => number, min: number, max: number): number {
  return Math.floor(prng() * (max - min + 1)) + min;
}

// Float in [min, max].
export function randomFloat(prng: () => number, min: number, max: number): number {
  return prng() * (max - min) + min;
}

// Random element from array. Array must be non-empty.
export function pick<T>(prng: () => number, array: readonly T[]): T {
  return array[Math.floor(prng() * array.length)];
}

// Shuffled copy using Fisher-Yates. Does not mutate the input.
export function shuffle<T>(prng: () => number, array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
