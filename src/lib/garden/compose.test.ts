import { createPrng } from '../prng';
import { compose } from './compose';

const SEEDS = [1, 42, 99, 256, 777, 1234, 5000];

describe('compose', () => {
  it('same seed + mode produces identical composition', () => {
    const a = compose(createPrng(42), 'landscape');
    const b = compose(createPrng(42), 'landscape');
    expect(a).toEqual(b);

    const c = compose(createPrng(42), 'portrait');
    const d = compose(createPrng(42), 'portrait');
    expect(c).toEqual(d);
  });

  it('different modes produce different compositions', () => {
    const land = compose(createPrng(42), 'landscape');
    const port = compose(createPrng(42), 'portrait');
    expect(land.viewBox).not.toEqual(port.viewBox);
  });

  it('total stone count is 3, 5, or 7', () => {
    for (const seed of SEEDS) {
      for (const mode of ['landscape', 'portrait'] as const) {
        const comp = compose(createPrng(seed), mode);
        const total = comp.stoneGroups.reduce((sum, g) => sum + g.stones.length, 0);
        expect([3, 5, 7]).toContain(total);
      }
    }
  });

  it('each group has 1, 2, or 3 stones (karesansui composition)', () => {
    for (const seed of SEEDS) {
      for (const mode of ['landscape', 'portrait'] as const) {
        const comp = compose(createPrng(seed), mode);
        for (const group of comp.stoneGroups) {
          expect([1, 2, 3]).toContain(group.stones.length);
        }
      }
    }
  });

  it('group count is 1, 2, or 3', () => {
    for (const seed of SEEDS) {
      const comp = compose(createPrng(seed), 'landscape');
      expect([1, 2, 3]).toContain(comp.stoneGroups.length);
    }
  });

  it('40% empty space rule holds (occupied ≤ 60%)', () => {
    for (const seed of SEEDS) {
      for (const mode of ['landscape', 'portrait'] as const) {
        const comp = compose(createPrng(seed), mode);
        const totalArea = comp.viewBox.width * comp.viewBox.height;
        let occupied = 0;
        for (const group of comp.stoneGroups) {
          occupied += Math.PI * group.boundingRadius ** 2;
        }
        expect(occupied / totalArea).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('no group centred in the viewport', () => {
    for (const seed of SEEDS) {
      for (const mode of ['landscape', 'portrait'] as const) {
        const comp = compose(createPrng(seed), mode);
        const thirdW = comp.viewBox.width / 3;
        const thirdH = comp.viewBox.height / 3;
        for (const group of comp.stoneGroups) {
          // Group centre must NOT be in the centre cell of the 3×3 grid.
          const inCentreX = group.center.x > thirdW && group.center.x < thirdW * 2;
          const inCentreY = group.center.y > thirdH && group.center.y < thirdH * 2;
          expect(inCentreX && inCentreY).toBe(false);
        }
      }
    }
  });

  it('haikuPosition is within viewport bounds', () => {
    for (const seed of SEEDS) {
      for (const mode of ['landscape', 'portrait'] as const) {
        const comp = compose(createPrng(seed), mode);
        expect(comp.haikuPosition.x).toBeGreaterThanOrEqual(0);
        expect(comp.haikuPosition.x).toBeLessThanOrEqual(comp.viewBox.width);
        expect(comp.haikuPosition.y).toBeGreaterThanOrEqual(0);
        expect(comp.haikuPosition.y).toBeLessThanOrEqual(comp.viewBox.height);
      }
    }
  });

  it('haikuArea has positive dimensions and haikuPosition is its centre', () => {
    const comp = compose(createPrng(42), 'landscape');
    expect(comp.haikuArea.width).toBeGreaterThan(0);
    expect(comp.haikuArea.height).toBeGreaterThan(0);
    expect(comp.haikuPosition.x).toBeCloseTo(comp.haikuArea.x + comp.haikuArea.width / 2);
    expect(comp.haikuPosition.y).toBeCloseTo(comp.haikuArea.y + comp.haikuArea.height / 2);
  });

  it('produces concentric and parallel rake paths', () => {
    const comp = compose(createPrng(42), 'landscape');
    expect(comp.concentricRake.paths.length).toBeGreaterThan(0);
    expect(comp.parallelRake.paths.length).toBeGreaterThan(0);
  });

  it('moss count is 0–3', () => {
    for (const seed of SEEDS) {
      const comp = compose(createPrng(seed), 'landscape');
      expect(comp.moss.length).toBeGreaterThanOrEqual(0);
      expect(comp.moss.length).toBeLessThanOrEqual(3);
    }
  });
});
