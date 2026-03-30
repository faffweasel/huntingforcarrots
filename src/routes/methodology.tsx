import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';

export const methodologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/methodology',
  component: () => <p>Methodology</p>,
});
