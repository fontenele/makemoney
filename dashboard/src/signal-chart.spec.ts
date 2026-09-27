import { describe, expect, it } from 'vitest';
import type { StrategySignal } from './api';
import { buildSignalChart } from './signal-chart';

describe('buildSignalChart', () => {
  it('plots newest-first signals chronologically with shared scaling', () => {
    const chart = buildSignalChart([
      signal('2026-09-26T12:01:00.000Z', 'sell', '12', '11'),
      signal('2026-09-26T12:00:00.000Z', 'buy', '9', '10'),
    ]);

    expect(chart).not.toBeNull();
    expect(chart?.minimum).toBe('9.00');
    expect(chart?.maximum).toBe('12.00');
    expect(chart?.points.map((point) => point.action)).toEqual(['buy', 'sell']);
    expect(chart?.points.map((point) => point.shortAverage)).toEqual([9, 12]);
    expect(seriesData(chart?.option, 0)).toEqual([9, 12]);
    expect(seriesData(chart?.option, 1)).toEqual([10, 11]);
    expect(seriesData(chart?.option, 2)).toHaveLength(2);
  });

  it('returns null when no signal has both averages', () => {
    expect(
      buildSignalChart([
        {
          ...signal('2026-09-26T12:00:00.000Z', 'hold', '1', '1'),
          currentLongAverage: null,
        },
      ]),
    ).toBeNull();
  });
});

function seriesData(option: unknown, index: number): unknown {
  return (option as { series: Array<{ data: unknown }> }).series[index]?.data;
}

function signal(
  evaluatedAt: string,
  action: StrategySignal['action'],
  short: string,
  long: string,
): StrategySignal {
  return {
    strategy: 'moving_average_crossover',
    symbol: 'BTC/USDT',
    action,
    reason: 'no_moving_average_crossover',
    shortPeriod: 3,
    longPeriod: 5,
    previousShortAverage: short,
    previousLongAverage: long,
    currentShortAverage: short,
    currentLongAverage: long,
    latestCandleCloseTime: evaluatedAt,
    evaluatedAt,
  };
}
