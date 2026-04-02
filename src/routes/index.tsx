import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { GardenCanvas } from '../components/garden/GardenCanvas';
import { rootRoute } from './root';

/** Reads the seed from the URL hash, or uses today's date. */
function readSeed(): string {
  const match = window.location.hash.match(/^#s=([^&]+)/);
  if (match && match[1].length <= 64) return match[1];
  return new Date().toISOString().slice(0, 10);
}

function writeSeedToHash(seed: string): void {
  history.replaceState(null, '', `#s=${seed}`);
}

function GardenPage(): ReactElement {
  const [seed, setSeed] = useState(() => {
    const s = readSeed();
    // Write seed to hash on first load so the link is shareable.
    if (!window.location.hash.match(/^#s=/)) {
      writeSeedToHash(s);
    }
    return s;
  });

  // Honour external hash changes (e.g. shared links pasted in).
  useEffect(() => {
    function handleHashChange() {
      setSeed(readSeed());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return <GardenCanvas seed={seed} />;
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GardenPage,
});
