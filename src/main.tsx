import { createRouter, RouterProvider } from '@tanstack/react-router';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { applyDuskMode } from './lib/dusk';
import { routeTree } from './routes/route-tree';
import './index.css';

// Set data-theme="dusk" on <html> if local time is 20:00–05:59. Runs once
// before render so the correct palette is in place before first paint.
applyDuskMode();

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Lazily load devtools so they are excluded from production bundles entirely.
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    )
  : null;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
    {TanStackRouterDevtools !== null && (
      <Suspense>
        <TanStackRouterDevtools router={router} />
      </Suspense>
    )}
  </StrictMode>
);
