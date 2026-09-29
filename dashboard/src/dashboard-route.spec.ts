import { describe, expect, it } from 'vitest';
import { dashboardRouteFromHash, dashboardRouteHref } from './dashboard-route';

describe('dashboard routes', () => {
  it.each([
    ['', 'overview'],
    ['#/', 'overview'],
    ['#/overview', 'overview'],
    ['#/polymarket', 'polymarket'],
    ['#/new-listings', 'new-listings'],
    ['#/new-listings/', 'new-listings'],
    ['#/unknown', 'overview'],
  ] as const)('maps %s to %s', (hash, route) => {
    expect(dashboardRouteFromHash(hash)).toBe(route);
  });

  it('builds stable route links', () => {
    expect(dashboardRouteHref('overview')).toBe('#/');
    expect(dashboardRouteHref('polymarket')).toBe('#/polymarket');
    expect(dashboardRouteHref('new-listings')).toBe('#/new-listings');
  });
});
