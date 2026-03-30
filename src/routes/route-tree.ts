import { aboutRoute } from './about';
import { indexRoute } from './index';
import { methodologyRoute } from './methodology';
import { rootRoute } from './root';

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, methodologyRoute]);
