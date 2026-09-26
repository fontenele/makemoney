import type { BacktestEquityPoint } from './api';

export interface EquityChartPoint {
  x: number;
  y: number;
  markedAt: string;
  equityUsdt: string;
}

export interface EquityChart {
  path: string;
  points: EquityChartPoint[];
  minimum: string;
  maximum: string;
}

const WIDTH = 100;
const HEIGHT = 44;
const PADDING = 3;

export function buildEquityChart(
  curve: readonly BacktestEquityPoint[],
): EquityChart | null {
  const values = curve
    .map((point) => ({ point, equity: Number(point.equityUsdt) }))
    .filter((value) => Number.isFinite(value.equity));

  if (values.length === 0) return null;

  const observedMinimum = Math.min(...values.map((value) => value.equity));
  const observedMaximum = Math.max(...values.map((value) => value.equity));
  const scalePadding =
    observedMinimum === observedMaximum
      ? Math.max(Math.abs(observedMinimum) * 0.01, 1)
      : 0;
  const scaleMinimum = observedMinimum - scalePadding;
  const scaleMaximum = observedMaximum + scalePadding;
  const range = scaleMaximum - scaleMinimum;
  const chartWidth = WIDTH - PADDING * 2;
  const chartHeight = HEIGHT - PADDING * 2;

  const points = values.map((value, index): EquityChartPoint => ({
    x:
      values.length === 1
        ? WIDTH / 2
        : PADDING + (index / (values.length - 1)) * chartWidth,
    y: PADDING + ((scaleMaximum - value.equity) / range) * chartHeight,
    markedAt: value.point.markedAt,
    equityUsdt: value.point.equityUsdt,
  }));

  return {
    path: points
      .map(
        (point, index) =>
          (index === 0 ? 'M' : 'L') +
          ' ' +
          point.x.toFixed(3) +
          ' ' +
          point.y.toFixed(3),
      )
      .join(' '),
    points,
    minimum: observedMinimum.toFixed(2),
    maximum: observedMaximum.toFixed(2),
  };
}
