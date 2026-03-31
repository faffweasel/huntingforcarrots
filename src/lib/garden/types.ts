export type StonePosture = 'taido' | 'reisho' | 'shigyo' | 'shintai' | 'kikyaku';

export interface ColourShift {
  /** Brightness multiplier offset. Dominant: -0.12 to -0.04; companion: +0.02 to +0.10. */
  readonly lightness: number;
  /** Hue rotation in degrees (±8). Positive = warmer (brown), negative = cooler (grey). */
  readonly hue: number;
  /** Saturation multiplier (0.9–1.1). */
  readonly saturation: number;
}

export interface Stone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Subtle rotation in degrees — range -10° to 10°. */
  readonly rotation: number;
  /** Per-stone tonal variation from the base --stone colour. */
  readonly colourShift: ColourShift;
  /** SVG path data for the perturbed stone shape. */
  readonly path: string;
  readonly posture: StonePosture;
}

export interface StoneGroup {
  readonly stones: readonly Stone[];
  readonly center: { readonly x: number; readonly y: number };
  readonly boundingRadius: number;
}

export interface MossPatch {
  readonly x: number;
  readonly y: number;
  /** Diameter in px — range 10–30. */
  readonly size: number;
  /** Opacity — range 0.6–0.8. */
  readonly opacity: number;
  readonly blobs: readonly { readonly cx: number; readonly cy: number; readonly r: number }[];
}

export interface RakePattern {
  /** SVG path data, one string per rake line. */
  readonly paths: readonly string[];
  /** Per-path stroke opacity (0–1). Absent means all paths at full opacity. */
  readonly opacities?: readonly number[];
}

export type CompositionMode = 'landscape' | 'portrait';

/** Viewport-dependent limits passed into compose(). */
export interface ResponsiveConfig {
  /** Allowed total stone counts — must be odd values only. */
  readonly stoneTotals: readonly number[];
  /** Min/max parallel rake line spacing in px. */
  readonly rakeSpacing: { readonly min: number; readonly max: number };
}

/** Axis-aligned rectangle in viewBox coordinates. */
export interface ViewBoxRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Composition {
  readonly mode: CompositionMode;
  readonly viewBox: { readonly width: number; readonly height: number };
  readonly stoneGroups: readonly StoneGroup[];
  readonly moss: readonly MossPatch[];
  readonly concentricRake: RakePattern;
  readonly parallelRake: RakePattern;
  /** Largest empty sand area — haiku renderer uses this to constrain text. */
  readonly haikuArea: ViewBoxRect;
  /** Centre of the haiku area — convenience alias for positioning. */
  readonly haikuPosition: { readonly x: number; readonly y: number };
  /** Colour-codes SVG layers when #debug=layers is in the URL hash. */
  readonly debugLayers?: boolean;
  /** Enables console output for geometry diagnostics when #debug=verbose. */
  readonly debugVerbose?: boolean;
}
