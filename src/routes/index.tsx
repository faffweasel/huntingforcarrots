import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { GardenCanvas } from '../components/garden/GardenCanvas';
import { RegenerateButton } from '../components/garden/RegenerateButton';
import { rootRoute } from './root';

function getSeed(): string {
  const match = window.location.hash.match(/^#s=([^&]+)/);
  if (match) return match[1];

  const seed = Date.now().toString(16);
  writeSeedToHash(seed);
  return seed;
}

function writeSeedToHash(seed: string): void {
  history.replaceState(null, '', `#s=${seed}`);
}

function GardenPage(): ReactElement {
  const [seed, setSeed] = useState(getSeed);

  useEffect(() => {
    function handleHashChange() {
      setSeed(getSeed());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function handleRegenerate() {
    const newSeed = Math.random().toString(16).slice(2, 8);
    writeSeedToHash(newSeed);
    setSeed(newSeed);
  }

  return (
    <>
      <GardenCanvas seed={seed} />
      <RegenerateButton onRegenerate={handleRegenerate} />
    </>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GardenPage,
});
