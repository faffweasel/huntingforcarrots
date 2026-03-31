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

function buildSvg(seed: string): string {
  const mode = getMode();
  const config = getResponsiveConfig(window.innerWidth);
  const prng = createPrng(hashSeed(seed));
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const hash = window.location.hash;
  const debugLayers = hash.includes('debug=layers');
  const debugVerbose = hash.includes('debug=verbose');
  return renderGarden(compose(prng, mode, config, viewport, debugLayers, debugVerbose));
}

/**
 * Full-viewport generative zen garden. Reads seed from props,
 * composes deterministically, and renders as a single SVG background.
 *
 * Re-composes when the viewport crosses the landscape/portrait boundary
 * (instant, debounced 200ms).
 */
export function GardenCanvas({ seed }: GardenCanvasProps): ReactElement {
  const [svg, setSvg] = useState(() => buildSvg(seed));
  const svgRef = useRef(svg);

  // Re-compose when seed changes.
  useEffect(() => {
    const next = buildSvg(seed);
    svgRef.current = next;
    setSvg(next);
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
          const next = buildSvg(seed);
          svgRef.current = next;
          setSvg(next);
        }
      }, 200);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [seed]);

  if (!svg) return <div className="fixed inset-0 -z-10" />;

  return (
    <div
      className="fixed inset-0 -z-10"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user content
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
