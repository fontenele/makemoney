import { describe, expect, it } from 'vitest';
import type { ListingPerformance } from './api';
import { buildListingPerformanceChart } from './listing-performance-chart';

describe('buildListingPerformanceChart', () => {
  it('plots checkpoint returns chronologically around an explicit zero line', () => {
    const chart = buildListingPerformanceChart(
      performance([
        ['T+0', '0'],
        ['T+5m', '0.1'],
        ['T+15m', '-0.05'],
      ]),
    );

    expect(chart).not.toBeNull();
    expect(chart?.points.map((point) => point.label)).toEqual([
      'T+0',
      'T+5m',
      'T+15m',
    ]);
    expect(chart?.minimumPercent).toBe('-5.00');
    expect(chart?.maximumPercent).toBe('10.00');
    expect(chart?.points[0]?.y).toBe(chart?.zeroY);
    expect(chart?.path).toMatch(/^M 3\.000/);
  });

  it('returns null when no checkpoint contains a finite return', () => {
    expect(
      buildListingPerformanceChart(performance([['T+0', 'invalid']])),
    ).toBe(null);
  });
});

function performance(
  points: Array<[label: string, rate: string]>,
): ListingPerformance {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baselineLabel: 'T+0',
    baselinePrice: '1',
    points: points.map(([label, rate], index) => ({
      label,
      offsetMs: index * 300_000,
      targetAt: `2026-09-26T12:${String(index * 5).padStart(2, '0')}:00.000Z`,
      completedAt: `2026-09-26T12:${String(index * 5).padStart(2, '0')}:01.000Z`,
      lastPrice: '1',
      absolutePriceChange: '0',
      priceReturnRate: rate,
    })),
  };
}
