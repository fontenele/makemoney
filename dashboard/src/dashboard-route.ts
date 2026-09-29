export type DashboardRoute = 'overview' | 'polymarket' | 'new-listings';

const routes: Record<string, DashboardRoute> = {
  '/': 'overview',
  '/overview': 'overview',
  '/polymarket': 'polymarket',
  '/new-listings': 'new-listings',
};

export function dashboardRouteFromHash(hash: string): DashboardRoute {
  const path = hash.replace(/^#/, '').replace(/\/$/, '') || '/';
  return routes[path] ?? 'overview';
}

export function dashboardRouteHref(route: DashboardRoute): string {
  return route === 'overview' ? '#/' : `#/${route}`;
}
