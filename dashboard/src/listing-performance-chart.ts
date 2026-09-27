import type { EChartsCoreOption } from 'echarts/core';
import type { ListingPerformance } from './api';

export interface ListingPerformanceChartPoint {
  label: string;
  rate: string;
  percent: number;
}

export interface ListingPerformanceChart {
  option: EChartsCoreOption;
  points: ListingPerformanceChartPoint[];
  minimumPercent: string;
  maximumPercent: string;
}

export function buildListingPerformanceChart(
  performance: ListingPerformance,
): ListingPerformanceChart | null {
  const points = performance.points
    .map((point): ListingPerformanceChartPoint | null => {
      const rate = Number(point.priceReturnRate);
      return Number.isFinite(rate)
        ? {
            label: point.label,
            rate: point.priceReturnRate,
            percent: rate * 100,
          }
        : null;
    })
    .filter((point): point is ListingPerformanceChartPoint => point !== null);

  if (points.length === 0) return null;
  let minimum = Math.min(0, ...points.map((point) => point.percent));
  let maximum = Math.max(0, ...points.map((point) => point.percent));
  if (minimum === maximum) {
    minimum = -1;
    maximum = 1;
  }

  return {
    minimumPercent: minimum.toFixed(2),
    maximumPercent: maximum.toFixed(2),
    points,
    option: {
      animation: false,
      aria: { enabled: true, decal: { show: true } },
      grid: { left: 8, right: 8, top: 12, bottom: 22 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => `${String(value)}%`,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((point) => point.label),
        axisLine: { lineStyle: { color: '#33413c' } },
        axisLabel: { color: '#7f918a', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        min: minimum,
        max: maximum,
        show: false,
        splitLine: { show: true, lineStyle: { color: '#24312d' } },
      },
      series: [
        {
          name: 'Return from T+0',
          type: 'line',
          data: points.map((point) => point.percent),
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: '#f0be5b', width: 2 },
          itemStyle: {
            color: '#f0be5b',
            borderColor: '#07110f',
            borderWidth: 1,
          },
        },
        {
          name: 'Zero',
          type: 'line',
          data: points.map(() => 0),
          symbol: 'none',
          silent: true,
          tooltip: { show: false },
          lineStyle: { color: '#33413c', width: 1, type: 'dashed' },
        },
      ],
    },
  };
}
