import { createRouter, RouterProvider } from '@tanstack/react-router';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routes/route-tree';
import './index.css';

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
