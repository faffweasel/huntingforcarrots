import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { GardenCanvas } from '../components/garden/GardenCanvas';
import { rootRoute } from './root';

/** Reads the seed from the URL hash, or uses today's date. */
function readSeed(): string {
  const match = window.location.hash.match(/^#s=([^&]+)/);
  if (match) return match[1];
  return new Date().toISOString().slice(0, 10);
}

function writeSeedToHash(seed: string): void {
  history.replaceState(null, '', `#s=${seed}`);
}

function GardenPage(): ReactElement {
  const [seed] = useState(readSeed);

  // Write the seed to the URL hash so the link is shareable.
  useEffect(() => {
    if (!window.location.hash.match(/^#s=/)) {
      writeSeedToHash(seed);
    }
  }, [seed]);

  // Honour external hash changes (e.g. shared links pasted in).
  const [liveSeed, setLiveSeed] = useState(seed);
  useEffect(() => {
    function handleHashChange() {
      setLiveSeed(readSeed());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return <GardenCanvas seed={liveSeed} />;
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GardenPage,
});
