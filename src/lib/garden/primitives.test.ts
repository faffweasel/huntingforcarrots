import { createPrng } from '../prng';
import type { StoneParams } from './primitives';
import {
  generateConcentricRake,
  generateMoss,
  generateParallelRake,
  generateStone,
  getStoneShadow,
} from './primitives';
import type { StoneGroup } from './types';

const BASE_PARAMS: StoneParams = { x: 500, y: 350, width: 80, height: 40, viewBoxHeight: 700 };

describe('generateStone', () => {
  it('produces valid SVG path data', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    expect(stone.path).toMatch(/^M /);
    expect(stone.path).toContain(' C ');
    expect(stone.path).toMatch(/Z$/);
  });

  it('rotation is within -10° to 10°', () => {
    const prng = createPrng(123);
    for (let i = 0; i < 50; i++) {
      const stone = generateStone(prng, BASE_PARAMS);
      expect(stone.rotation).toBeGreaterThanOrEqual(-10);
      expect(stone.rotation).toBeLessThanOrEqual(10);
    }
  });

  it('colourShift fields are within expected ranges (companion stone)', () => {
    const prng = createPrng(456);
    for (let i = 0; i < 50; i++) {
      const stone = generateStone(prng, BASE_PARAMS);
      expect(stone.colourShift.lightness).toBeGreaterThanOrEqual(0.02);
      expect(stone.colourShift.lightness).toBeLessThanOrEqual(0.1);
      expect(stone.colourShift.hue).toBeGreaterThanOrEqual(-8);
      expect(stone.colourShift.hue).toBeLessThanOrEqual(8);
      expect(stone.colourShift.saturation).toBeGreaterThanOrEqual(0.9);
      expect(stone.colourShift.saturation).toBeLessThanOrEqual(1.1);
    }
  });

  it('applies depth scale: lower y produces larger dimensions', () => {
    // Same seed — same PRNG sequence — so rotation/perturbation are identical.
    // Only width/height differ due to depth scaling.
    const upperStone = generateStone(createPrng(7), { ...BASE_PARAMS, y: 100 });
    const lowerStone = generateStone(createPrng(7), { ...BASE_PARAMS, y: 600 });
    expect(lowerStone.width).toBeGreaterThan(upperStone.width);
    expect(lowerStone.height).toBeGreaterThan(upperStone.height);
  });

  it('depth scale at y=0 is 0.85 and at y=700 is 1.0', () => {
    const topStone = generateStone(createPrng(1), { ...BASE_PARAMS, y: 0 });
    const botStone = generateStone(createPrng(1), { ...BASE_PARAMS, y: 700 });
    expect(topStone.width).toBeCloseTo(BASE_PARAMS.width * 0.85, 5);
    expect(botStone.width).toBeCloseTo(BASE_PARAMS.width * 1.0, 5);
  });

  it('same seed produces identical stone', () => {
    const stone1 = generateStone(createPrng(99), BASE_PARAMS);
    const stone2 = generateStone(createPrng(99), BASE_PARAMS);
    expect(stone1).toEqual(stone2);
  });
});

describe('getStoneShadow', () => {
  it('shadow dimensions match spec formulae', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const shadow = getStoneShadow(stone);
    expect(shadow.rx).toBeCloseTo((stone.width * 1.1) / 2);
    expect(shadow.ry).toBeCloseTo((stone.height * 0.3) / 2);
    expect(shadow.opacity).toBe(0.4);
  });

  it('shadow is offset 4px right and 5px down from stone centre', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const shadow = getStoneShadow(stone);
    expect(shadow.cx).toBe(stone.x + 4);
    expect(shadow.cy).toBe(stone.y + 5);
  });
});

describe('generateMoss', () => {
  it('produces 3–6 blobs', () => {
    const prng = createPrng(42);
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    for (let i = 0; i < 30; i++) {
      const moss = generateMoss(prng, stone);
      expect(moss.blobs.length).toBeGreaterThanOrEqual(3);
      expect(moss.blobs.length).toBeLessThanOrEqual(6);
    }
  });

  it('positions patch at base of anchor stone', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const moss = generateMoss(createPrng(7), stone);
    expect(moss.x).toBeCloseTo(stone.x);
    expect(moss.y).toBeCloseTo(stone.y + stone.height * 0.4);
  });

  it('opacity is within 0.6–0.8', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const prng = createPrng(77);
    for (let i = 0; i < 30; i++) {
      const moss = generateMoss(prng, stone);
      expect(moss.opacity).toBeGreaterThanOrEqual(0.6);
      expect(moss.opacity).toBeLessThanOrEqual(0.8);
    }
  });

  it('blob radii are within 3–8px', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const prng = createPrng(13);
    for (let i = 0; i < 20; i++) {
      const moss = generateMoss(prng, stone);
      for (const blob of moss.blobs) {
        expect(blob.r).toBeGreaterThanOrEqual(3);
        expect(blob.r).toBeLessThanOrEqual(8);
      }
    }
  });

  it('same seed produces identical moss', () => {
    const stone = generateStone(createPrng(42), BASE_PARAMS);
    const moss1 = generateMoss(createPrng(100), stone);
    const moss2 = generateMoss(createPrng(100), stone);
    expect(moss1).toEqual(moss2);
  });
});

// ─── Rake pattern tests ───────────────────────────────────────────────────────

// A minimal stone group for rake tests: one stone at the centre.
function makeGroup(cx: number, cy: number, boundingRadius: number): StoneGroup {
  const stone = generateStone(createPrng(1), {
    x: cx,
    y: cy,
    width: 60,
    height: 30,
    viewBoxHeight: 700,
  });
  return { stones: [stone], center: { x: cx, y: cy }, boundingRadius };
}

const VIEWBOX = { width: 1000, height: 700 };

describe('generateConcentricRake', () => {
  it('produces ring paths scaled to bounding radius', () => {
    // ringCount = clamp(2–7, floor((maxExpansion - 10) / 10)).
    // boundingRadius=80, maxExpansion=80 → available=70 → 7 rings.
    for (const seed of [1, 42, 99, 256, 1000]) {
      const group = makeGroup(500, 350, 80);
      const rake = generateConcentricRake(createPrng(seed), group, group.boundingRadius);
      expect(rake.paths.length).toBeGreaterThanOrEqual(2);
      expect(rake.paths.length).toBeLessThanOrEqual(7);
    }
  });

  it('every ring path is a valid closed SVG path', () => {
    const group = makeGroup(500, 350, 80);
    const rake = generateConcentricRake(createPrng(7), group, group.boundingRadius);
    for (const path of rake.paths) {
      expect(path).toMatch(/^M /);
      expect(path).toContain(' C ');
      expect(path).toMatch(/Z$/);
    }
  });

  it('rings expand outward — later rings are larger than earlier ones', () => {
    const group = makeGroup(500, 350, 80);
    const rake = generateConcentricRake(createPrng(42), group, group.boundingRadius);
    // Rough size proxy: path string length grows as rings get larger.
    // A more reliable check: compare the bounding x-extent of successive rings.
    // Extract all x coordinates from each path and compare max values.
    function maxX(path: string): number {
      return Math.max(
        ...[...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x]) => parseFloat(x))
      );
    }
    for (let i = 1; i < rake.paths.length; i++) {
      expect(maxX(rake.paths[i])).toBeGreaterThan(maxX(rake.paths[i - 1]));
    }
  });

  it('same seed produces identical rake', () => {
    const group = makeGroup(500, 350, 80);
    const r1 = generateConcentricRake(createPrng(99), group, group.boundingRadius);
    const r2 = generateConcentricRake(createPrng(99), group, group.boundingRadius);
    expect(r1).toEqual(r2);
  });

  it('returns per-ring opacities with outer rings fading out', () => {
    // Use a large bounding radius to ensure enough room for multiple rings.
    const group = makeGroup(500, 350, 200);
    const rake = generateConcentricRake(createPrng(42), group, group.boundingRadius);
    const opacities = rake.opacities ?? [];
    expect(opacities.length).toBe(rake.paths.length);
    // Outermost ring should be 0.3.
    expect(opacities[opacities.length - 1]).toBe(0.3);
    // Second-to-last should be 0.6 (if at least 2 rings).
    if (opacities.length >= 2) {
      expect(opacities[opacities.length - 2]).toBe(0.6);
    }
    // All others should be 1.0.
    for (let i = 0; i < opacities.length - 2; i++) {
      expect(opacities[i]).toBe(1.0);
    }
  });
});

describe('generateParallelRake', () => {
  it('produces full-width paths across the viewport', () => {
    const rake = generateParallelRake(createPrng(1), VIEWBOX);
    expect(rake.paths.length).toBeGreaterThan(0);
    for (const path of rake.paths) {
      expect(path).toMatch(/^M /);
      // Each line should span from x=0 to x=viewBox.width.
      expect(path).toMatch(/^M 0\.00/);
      expect(path).toMatch(/1000\.00/);
    }
  });

  it('same seed produces identical rake', () => {
    const r1 = generateParallelRake(createPrng(7), VIEWBOX);
    const r2 = generateParallelRake(createPrng(7), VIEWBOX);
    expect(r1).toEqual(r2);
  });
});
