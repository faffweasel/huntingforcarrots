import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { compose } from '../../lib/garden/compose';
import { buildAriaLabel, renderGarden } from '../../lib/garden/render';
import type { CompositionMode, ResponsiveConfig } from '../../lib/garden/types';
import type { Haiku } from '../../lib/haiku';
import { generateHaiku } from '../../lib/haiku';
import { createPrng } from '../../lib/prng';
import { hashSeed } from '../../lib/seed';
import { HaikuOverlay } from './HaikuOverlay';

interface GardenCanvasProps {
  readonly seed: string;
}

function getMode(): CompositionMode {
  return window.innerWidth / window.innerHeight >= 1 ? 'landscape' : 'portrait';
}

function getResponsiveConfig(width: number): ResponsiveConfig {
  if (width > 1024) return { stoneTotals: [3, 5, 7], rakeSpacing: { min: 10, max: 12 } };
  if (width >= 768) return { stoneTotals: [3, 5], rakeSpacing: { min: 12, max: 14 } };
  return { stoneTotals: [3, 5], rakeSpacing: { min: 14, max: 17 } };
}

interface Scene {
  readonly svg: string;
  readonly ariaLabel: string;
  readonly haiku: Haiku;
  readonly haikuPosition: { readonly x: number; readonly y: number };
  readonly viewBox: { readonly width: number; readonly height: number };
}

function buildScene(seed: string): Scene {
  const mode = getMode();
  const config = getResponsiveConfig(window.innerWidth);
  const prng = createPrng(hashSeed(seed));
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const hash = window.location.hash;
  const debugLayers = hash.includes('debug=layers');
  const debugVerbose = hash.includes('debug=verbose');
  // Order matters: garden consumes PRNG values first, then haiku consumes the next ones.
  const t0 = performance.now();
  const composition = compose(prng, mode, config, viewport, debugLayers, debugVerbose);
  const svg = renderGarden(composition);
  const ariaLabel = buildAriaLabel(composition);
  const haiku = generateHaiku(prng, seed);
  const t1 = performance.now();
  if (import.meta.env.DEV) console.log(`Garden + haiku generation: ${(t1 - t0).toFixed(1)}ms`);
  return {
    svg,
    ariaLabel,
    haiku,
    haikuPosition: composition.haikuPosition,
    viewBox: composition.viewBox,
  };
}

/**
 * Full-viewport generative zen garden. Reads seed from props,
 * composes deterministically, and renders as a single SVG background.
 *
 * Re-composes when the viewport crosses the landscape/portrait boundary
 * (instant, debounced 200ms).
 */
export function GardenCanvas({ seed }: GardenCanvasProps): ReactElement {
  const [scene, setScene] = useState<Scene | null>(null);
  const svgRef = useRef('');

  // Build scene on mount and rebuild when seed changes.
  useEffect(() => {
    const next = buildScene(seed);
    svgRef.current = next.svg;
    setScene(next);
  }, [seed]);

  // Re-compose when aspect-ratio class flips (landscape <-> portrait).
  useEffect(() => {
    let currentMode = getMode();
    let timer: ReturnType<typeof setTimeout> | undefined;

    function handleResize() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const newMode = getMode();
        if (newMode !== currentMode) {
          currentMode = newMode;
          const next = buildScene(seed);
          svgRef.current = next.svg;
          setScene(next);
        }
      }, 200);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [seed]);

  if (!scene) return <div className="fixed inset-0 -z-10" />;

  return (
    <>
      <div
        className="fixed inset-0 -z-10"
        role="img"
        aria-label={scene.ariaLabel}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user content
        dangerouslySetInnerHTML={{ __html: scene.svg }}
      />
      <HaikuOverlay haiku={scene.haiku} position={scene.haikuPosition} viewBox={scene.viewBox} />
    </>
  );
}
