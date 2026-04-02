import { createPrng, pick, randomInt, shuffle } from './prng';

describe('createPrng', () => {
  it('same seed produces same sequence', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createPrng(42);
    const b = createPrng(43);
    const as = Array.from({ length: 20 }, () => a());
    const bs = Array.from({ length: 20 }, () => b());
    expect(as).not.toEqual(bs);
  });

  it('output is in [0, 1)', () => {
    const prng = createPrng(1);
    for (let i = 0; i < 1000; i++) {
      const n = prng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('stays within bounds over 1000 iterations', () => {
    const prng = createPrng(123);
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(prng, 3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });
});

describe('shuffle', () => {
  it('produces a permutation of the input', () => {
    const prng = createPrng(99);
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(prng, input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
  });

  it('does not mutate the input array', () => {
    const prng = createPrng(99);
    const input = [1, 2, 3, 4, 5];
    shuffle(prng, input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('pick', () => {
  it('always returns an element from the array', () => {
    const prng = createPrng(7);
    const array = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i++) {
      expect(array).toContain(pick(prng, array));
    }
  });
});
