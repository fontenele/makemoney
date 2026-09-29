import { describe, expect, it } from 'vitest';
import type { PolymarketPriceHistoryPage } from './api';
import { buildPolymarketPriceChart } from './polymarket-price-chart';

describe('buildPolymarketPriceChart', () => {
  it('plots YES and NO in provider chronological order on one fixed scale', () => {
    const chart = buildPolymarketPriceChart(
      page('111', [
        ['2026-09-28T12:00:00.000Z', '0.58'],
        ['2026-09-29T12:00:00.000Z', '0.62'],
      ]),
      page('222', [
        ['2026-09-28T12:00:00.000Z', '0.42'],
        ['2026-09-29T12:00:00.000Z', '0.38'],
      ]),
    );

    expect(chart?.yesPoints.map((point) => point.value)).toEqual([0.58, 0.62]);
    expect(chart?.noPoints.map((point) => point.value)).toEqual([0.42, 0.38]);
    expect(chart?.option).toMatchObject({
      yAxis: { min: 0, max: 1 },
      series: [{ name: 'YES' }, { name: 'NO' }],
    });
  });

  it('keeps a single available outcome visible', () => {
    const chart = buildPolymarketPriceChart(
      page('111', [['2026-09-29T12:00:00.000Z', '0.62']]),
      null,
    );

    expect(chart?.yesPoints).toHaveLength(1);
    expect(chart?.noPoints).toEqual([]);
    expect((chart?.option as { series: unknown[] }).series).toHaveLength(1);
  });

  it('rejects invalid browser plotting values and returns null when empty', () => {
    expect(
      buildPolymarketPriceChart(
        page('111', [
          ['invalid', '0.5'],
          ['2026-09-29T12:00:00.000Z', '1.1'],
        ]),
        null,
      ),
    ).toBeNull();
  });
});

function page(
  tokenId: string,
  values: Array<[timestamp: string, price: string]>,
): PolymarketPriceHistoryPage {
  return {
    provider: 'polymarket',
    tokenId,
    start: '2026-09-28T12:00:00.000Z',
    end: '2026-09-29T12:00:00.000Z',
    resolution: '30m',
    points: values.map(([timestamp, price]) => ({
      timestamp,
      price,
      resolutionSeconds: 1800,
    })),
    nextCursor: null,
    source: 'data-api-price-history',
    receivedAt: '2026-09-29T12:00:01.000Z',
    executable: false,
  };
}
