import { aboutRoute } from './about';
import { indexRoute } from './index';
import { privacyRoute } from './privacy';
import { rootRoute } from './root';

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, privacyRoute]);
