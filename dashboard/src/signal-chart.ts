import type { EChartsCoreOption } from 'echarts/core';
import type { StrategySignal } from './api';

export interface SignalChartPoint {
  action: StrategySignal['action'];
  evaluatedAt: string;
  shortAverage: number;
  longAverage: number;
}

export interface SignalChart {
  option: EChartsCoreOption;
  points: SignalChartPoint[];
  minimum: string;
  maximum: string;
}

export function buildSignalChart(
  newestFirstSignals: readonly StrategySignal[],
): SignalChart | null {
  const points = newestFirstSignals
    .map((signal): SignalChartPoint | null => {
      if (
        signal.currentShortAverage === null ||
        signal.currentLongAverage === null
      ) {
        return null;
      }
      const shortAverage = Number(signal.currentShortAverage);
      const longAverage = Number(signal.currentLongAverage);
      return Number.isFinite(shortAverage) && Number.isFinite(longAverage)
        ? {
            action: signal.action,
            evaluatedAt: signal.evaluatedAt,
            shortAverage,
            longAverage,
          }
        : null;
    })
    .filter((point): point is SignalChartPoint => point !== null)
    .reverse();

  if (points.length === 0) return null;
  const values = points.flatMap((point) => [
    point.shortAverage,
    point.longAverage,
  ]);
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
        data: points.map((point) => point.evaluatedAt),
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
          name: 'Short average',
          type: 'line',
          data: points.map((point) => point.shortAverage),
          symbol: 'none',
          lineStyle: { color: '#7fffc4', width: 2 },
        },
        {
          name: 'Long average',
          type: 'line',
          data: points.map((point) => point.longAverage),
          symbol: 'none',
          lineStyle: { color: '#86a6ff', width: 2 },
        },
        {
          name: 'Signal',
          type: 'scatter',
          symbolSize: 9,
          data: points.map((point) =>
            point.action === 'hold'
              ? null
              : {
                  name: point.action,
                  value: [point.evaluatedAt, point.shortAverage],
                  itemStyle: {
                    color: point.action === 'buy' ? '#7fffc4' : '#ff6b73',
                    borderColor: '#07110f',
                    borderWidth: 1,
                  },
                },
          ),
        },
      ],
    },
  };
}
