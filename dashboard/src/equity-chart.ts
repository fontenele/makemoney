import type { EChartsCoreOption } from 'echarts/core';
import type { BacktestEquityPoint } from './api';

export interface EquityChartPoint {
  markedAt: string;
  equityUsdt: string;
  value: number;
}

export interface EquityChart {
  option: EChartsCoreOption;
  points: EquityChartPoint[];
  minimum: string;
  maximum: string;
}

export function buildEquityChart(
  curve: readonly BacktestEquityPoint[],
): EquityChart | null {
  const points = curve
    .map((point): EquityChartPoint | null => {
      const value = Number(point.equityUsdt);
      return Number.isFinite(value) ? { ...point, value } : null;
    })
    .filter((point): point is EquityChartPoint => point !== null);

  if (points.length === 0) return null;
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding =
    minimum === maximum ? Math.max(Math.abs(minimum) * 0.01, 1) : 0;

  return {
    minimum: minimum.toFixed(2),
    maximum: maximum.toFixed(2),
    points,
    option: {
      animation: false,
      aria: { enabled: true, decal: { show: true } },
      grid: { left: 8, right: 8, top: 12, bottom: 10 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((point) => point.markedAt),
        show: false,
      },
      yAxis: {
        type: 'value',
        min: minimum - padding,
        max: maximum + padding,
        show: false,
        splitLine: { show: true, lineStyle: { color: '#24312d' } },
      },
      series: [
        {
          name: 'Fee-adjusted equity',
          type: 'line',
          data: values,
          symbol: points.length === 1 ? 'circle' : 'none',
          symbolSize: 7,
          lineStyle: { color: '#f0be5b', width: 2 },
          itemStyle: { color: '#f0be5b' },
          areaStyle: { color: 'rgba(240, 190, 91, 0.08)' },
        },
      ],
    },
  };
}
