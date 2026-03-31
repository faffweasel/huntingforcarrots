import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { compose } from '../../lib/garden/compose';
import { renderGarden } from '../../lib/garden/render';
import type { CompositionMode, ResponsiveConfig } from '../../lib/garden/types';
import { createPrng } from '../../lib/prng';
import { hashSeed } from '../../lib/seed';

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

function isDebugLayers(): boolean {
  return window.location.hash.includes('debug=layers');
}

function buildSvg(seed: string): string {
  const mode = getMode();
  const config = getResponsiveConfig(window.innerWidth);
  const prng = createPrng(hashSeed(seed));
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const debug = isDebugLayers();
  return renderGarden(compose(prng, mode, config, viewport, debug));
}

const CROSSFADE_MS = 300;
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Full-viewport generative zen garden. Reads seed from props,
 * composes deterministically, and renders as a single SVG background.
 *
 * Re-composes on seed change (with crossfade) and when the viewport
 * crosses the landscape/portrait boundary (instant, debounced).
 */
export function GardenCanvas({ seed }: GardenCanvasProps): ReactElement {
  const [currentSvg, setCurrentSvg] = useState('');
  const [previousSvg, setPreviousSvg] = useState('');
  const [fadeIn, setFadeIn] = useState(true);
  const mountedRef = useRef(false);
  const currentSvgRef = useRef('');

  // Compose on seed change, crossfade if not first render.
  useEffect(() => {
    const svg = buildSvg(seed);

    if (!mountedRef.current) {
      currentSvgRef.current = svg;
      setCurrentSvg(svg);
      mountedRef.current = true;
      return;
    }

    if (reducedMotion) {
      currentSvgRef.current = svg;
      setCurrentSvg(svg);
      return;
    }

    // Crossfade: show old behind, fade in new over 300ms.
    setPreviousSvg(currentSvgRef.current);
    currentSvgRef.current = svg;
    setCurrentSvg(svg);
    setFadeIn(false);

    // Double rAF ensures the browser paints opacity:0 before transitioning.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });

    const timer = setTimeout(() => setPreviousSvg(''), CROSSFADE_MS + 50);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
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
          const svg = buildSvg(seed);
          currentSvgRef.current = svg;
          setCurrentSvg(svg);
        }
      }, 200);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [seed]);

  if (!currentSvg) return <div className="fixed inset-0 -z-10" />;

  return (
    <>
      {previousSvg && (
        <div
          className="fixed inset-0 -z-10"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user content
          dangerouslySetInnerHTML={{ __html: previousSvg }}
        />
      )}
      <div
        className="fixed inset-0 -z-10"
        style={{
          opacity: fadeIn ? 1 : 0,
          transition: fadeIn ? `opacity ${CROSSFADE_MS}ms ease` : 'none',
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user content
        dangerouslySetInnerHTML={{ __html: currentSvg }}
      />
    </>
  );
}
