import { describe, expect, it } from 'vitest';
import type { BacktestEquityPoint } from './api';
import { buildEquityChart } from './equity-chart';

describe('buildEquityChart', () => {
  it('plots the backend equity curve in its existing chronological order', () => {
    const chart = buildEquityChart([
      point('2026-09-26T12:00:00.000Z', '1000'),
      point('2026-09-26T12:01:00.000Z', '990'),
      point('2026-09-26T12:02:00.000Z', '1015'),
    ]);

    expect(chart).not.toBeNull();
    expect(chart?.minimum).toBe('990.00');
    expect(chart?.maximum).toBe('1015.00');
    expect(chart?.points.map((item) => item.equityUsdt)).toEqual([
      '1000',
      '990',
      '1015',
    ]);
    expect(chart?.points.map((item) => item.value)).toEqual([1000, 990, 1015]);
    expect(seriesData(chart?.option)).toEqual([1000, 990, 1015]);
  });

  it('centers a constant curve instead of inventing variation', () => {
    const chart = buildEquityChart([point('2026-09-26T12:00:00.000Z', '1000')]);

    expect(chart?.minimum).toBe('1000.00');
    expect(chart?.maximum).toBe('1000.00');
    expect(chart?.points[0]).toMatchObject({ value: 1000 });
    expect(chart?.option).toMatchObject({
      yAxis: { min: 990, max: 1010 },
    });
  });

  it('returns null when no point contains finite equity', () => {
    expect(
      buildEquityChart([point('2026-09-26T12:00:00.000Z', 'invalid')]),
    ).toBeNull();
  });
});

function seriesData(option: unknown): unknown {
  return (option as { series: Array<{ data: unknown }> }).series[0]?.data;
}

function point(markedAt: string, equityUsdt: string): BacktestEquityPoint {
  return {
    markedAt,
    equityUsdt,
    drawdownRate: '0',
  };
}
