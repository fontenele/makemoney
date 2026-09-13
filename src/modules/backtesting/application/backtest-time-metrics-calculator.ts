import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  BacktestClosedTrade,
  BacktestOpenPosition,
} from '../domain/backtest-simulation';
import { BacktestTimeMetrics } from '../domain/backtest-time-metrics';
import { HistoricalCandle } from '../domain/historical-candle';

const TimeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestTimeMetricsCalculator {
  calculate(
    candles: readonly HistoricalCandle[],
    closedTrades: readonly BacktestClosedTrade[],
    openPosition: BacktestOpenPosition | null,
  ): BacktestTimeMetrics {
    const firstCandle = candles[0];
    const lastCandle = candles.at(-1);
    if (!firstCandle || !lastCandle) {
      return {
        periodStartedAt: null,
        periodEndedAt: null,
        periodDurationMs: 0,
        timeInMarketMs: 0,
        exposureRate: null,
        closedTradeHoldingDurations: [],
        averageClosedTradeHoldingDurationMs: null,
      };
    }

    const periodStartedAt = firstCandle.openTime;
    const periodEndedAt = lastCandle.closeTime;
    const periodDurationMs = this.duration(periodStartedAt, periodEndedAt);
    const closedTradeHoldingDurations = closedTrades.map((trade) => ({
      enteredAt: trade.entry.filledAt,
      exitedAt: trade.exit.filledAt,
      durationMs: this.duration(trade.entry.filledAt, trade.exit.filledAt),
    }));
    const closedTime = closedTradeHoldingDurations.reduce(
      (sum, trade) => sum + trade.durationMs,
      0,
    );
    const openTime = openPosition
      ? this.duration(openPosition.entry.filledAt, periodEndedAt)
      : 0;
    const timeInMarketMs = closedTime + openTime;

    if (timeInMarketMs > periodDurationMs) {
      throw new Error('Backtest time in market exceeds the tested period');
    }

    return {
      periodStartedAt,
      periodEndedAt,
      periodDurationMs,
      timeInMarketMs,
      exposureRate:
        periodDurationMs === 0
          ? null
          : new TimeDecimal(timeInMarketMs)
              .dividedBy(periodDurationMs)
              .toFixed(),
      closedTradeHoldingDurations,
      averageClosedTradeHoldingDurationMs:
        closedTradeHoldingDurations.length === 0
          ? null
          : new TimeDecimal(closedTime)
              .dividedBy(closedTradeHoldingDurations.length)
              .toFixed(),
    };
  }

  private duration(startedAt: Date, endedAt: Date): number {
    const durationMs = endedAt.getTime() - startedAt.getTime();
    if (!Number.isSafeInteger(durationMs) || durationMs < 0) {
      throw new Error('Invalid backtest time interval');
    }
    return durationMs;
  }
}
