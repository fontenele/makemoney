import type { EChartsCoreOption } from 'echarts/core';
import type { PolymarketPriceHistoryPage } from './api';

export interface PolymarketPriceChartPoint {
  timestamp: string;
  price: string;
  value: number;
}

export interface PolymarketPriceChart {
  option: EChartsCoreOption;
  yesPoints: PolymarketPriceChartPoint[];
  noPoints: PolymarketPriceChartPoint[];
}

export function buildPolymarketPriceChart(
  yes: PolymarketPriceHistoryPage | null,
  no: PolymarketPriceHistoryPage | null,
): PolymarketPriceChart | null {
  const yesPoints = validPoints(yes);
  const noPoints = validPoints(no);
  if (yesPoints.length === 0 && noPoints.length === 0) return null;

  const series = [
    buildSeries('YES', yesPoints, '#38e88f'),
    buildSeries('NO', noPoints, '#ef6f6c'),
  ].filter((item) => item !== null);

  return {
    yesPoints,
    noPoints,
    option: {
      animation: false,
      aria: { enabled: true, decal: { show: true } },
      grid: { left: 8, right: 8, top: 12, bottom: 10 },
      tooltip: { trigger: 'axis', valueFormatter: formatProbability },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        show: false,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        show: false,
        splitLine: { show: true, lineStyle: { color: '#24312d' } },
      },
      series,
    },
  };
}

function validPoints(
  page: PolymarketPriceHistoryPage | null,
): PolymarketPriceChartPoint[] {
  if (page === null) return [];
  return page.points
    .map((point): PolymarketPriceChartPoint | null => {
      const value = Number(point.price);
      const timestamp = new Date(point.timestamp).getTime();
      return Number.isFinite(value) &&
        value >= 0 &&
        value <= 1 &&
        Number.isFinite(timestamp)
        ? { timestamp: point.timestamp, price: point.price, value }
        : null;
    })
    .filter((point): point is PolymarketPriceChartPoint => point !== null);
}

function buildSeries(
  name: string,
  points: readonly PolymarketPriceChartPoint[],
  color: string,
): Record<string, unknown> | null {
  if (points.length === 0) return null;
  return {
    name,
    type: 'line',
    data: points.map((point) => [point.timestamp, point.value]),
    symbol: points.length === 1 ? 'circle' : 'none',
    symbolSize: 7,
    lineStyle: { color, width: 2 },
    itemStyle: { color },
  };
}

function formatProbability(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : 'Unavailable';
}
