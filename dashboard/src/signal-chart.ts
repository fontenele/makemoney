import type { StrategySignal } from './api';

export interface SignalChartPoint {
  x: number;
  shortY: number;
  longY: number;
  action: StrategySignal['action'];
  evaluatedAt: string;
}

export interface SignalChart {
  shortPath: string;
  longPath: string;
  points: SignalChartPoint[];
  minimum: string;
  maximum: string;
}

const WIDTH = 100;
const HEIGHT = 44;
const PADDING = 3;

export function buildSignalChart(
  newestFirstSignals: readonly StrategySignal[],
): SignalChart | null {
  const values = newestFirstSignals
    .map((signal) => ({
      signal,
      short: Number(signal.currentShortAverage),
      long: Number(signal.currentLongAverage),
    }))
    .filter(
      (value) =>
        value.signal.currentShortAverage !== null &&
        value.signal.currentLongAverage !== null &&
        Number.isFinite(value.short) &&
        Number.isFinite(value.long),
    )
    .reverse();

  if (values.length === 0) return null;
  const allAverages = values.flatMap((value) => [value.short, value.long]);
  const minimum = Math.min(...allAverages);
  const maximum = Math.max(...allAverages);
  const range = maximum === minimum ? 1 : maximum - minimum;
  const chartWidth = WIDTH - PADDING * 2;
  const chartHeight = HEIGHT - PADDING * 2;

  const points = values.map((value, index): SignalChartPoint => ({
    x:
      values.length === 1
        ? WIDTH / 2
        : PADDING + (index / (values.length - 1)) * chartWidth,
    shortY: PADDING + ((maximum - value.short) / range) * chartHeight,
    longY: PADDING + ((maximum - value.long) / range) * chartHeight,
    action: value.signal.action,
    evaluatedAt: value.signal.evaluatedAt,
  }));

  return {
    shortPath: path(points, 'shortY'),
    longPath: path(points, 'longY'),
    points,
    minimum: minimum.toFixed(2),
    maximum: maximum.toFixed(2),
  };
}

function path(
  points: readonly SignalChartPoint[],
  key: 'shortY' | 'longY',
): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point[key].toFixed(3)}`,
    )
    .join(' ');
}
