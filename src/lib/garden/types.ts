export type StonePosture = 'taido' | 'reisho' | 'shigyo' | 'shintai' | 'kikyaku';

export interface Stone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Subtle rotation in degrees — range -10° to 10°. */
  readonly rotation: number;
  /** Lightness shift applied to the stone colour — range -0.05 to 0.05. */
  readonly colourVariation: number;
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
  /** Temporary debug flag — colour-codes SVG layers and logs geometry. */
  readonly debugLayers?: boolean;
}
