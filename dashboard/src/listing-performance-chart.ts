import type { ListingPerformance } from './api';

export interface ListingPerformanceChartPoint {
  x: number;
  y: number;
  label: string;
  rate: string;
}

export interface ListingPerformanceChart {
  path: string;
  points: ListingPerformanceChartPoint[];
  zeroY: number;
  minimumPercent: string;
  maximumPercent: string;
}

const WIDTH = 100;
const HEIGHT = 44;
const PADDING = 3;

export function buildListingPerformanceChart(
  performance: ListingPerformance,
): ListingPerformanceChart | null {
  const values = performance.points
    .map((point) => ({ point, rate: Number(point.priceReturnRate) }))
    .filter((value) => Number.isFinite(value.rate));

  if (values.length === 0) return null;

  let minimum = Math.min(0, ...values.map((value) => value.rate));
  let maximum = Math.max(0, ...values.map((value) => value.rate));
  if (minimum === maximum) {
    minimum = -0.01;
    maximum = 0.01;
  }

  const range = maximum - minimum;
  const chartWidth = WIDTH - PADDING * 2;
  const chartHeight = HEIGHT - PADDING * 2;
  const y = (rate: number) =>
    PADDING + ((maximum - rate) / range) * chartHeight;

  const points = values.map((value, index): ListingPerformanceChartPoint => ({
    x:
      values.length === 1
        ? WIDTH / 2
        : PADDING + (index / (values.length - 1)) * chartWidth,
    y: y(value.rate),
    label: value.point.label,
    rate: value.point.priceReturnRate,
  }));

  return {
    path: points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)}`,
      )
      .join(' '),
    points,
    zeroY: y(0),
    minimumPercent: (minimum * 100).toFixed(2),
    maximumPercent: (maximum * 100).toFixed(2),
  };
}
