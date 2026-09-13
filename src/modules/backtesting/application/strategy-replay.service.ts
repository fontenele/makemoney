import { Inject, Injectable } from '@nestjs/common';
import {
  MOVING_AVERAGE_CROSSOVER_STRATEGY,
  Strategy,
  StrategyCandle,
  StrategySignal,
} from '../../strategies/domain/strategy';
import { BacktestResult } from '../domain/backtest';

@Injectable()
export class StrategyReplayService {
  constructor(
    @Inject(MOVING_AVERAGE_CROSSOVER_STRATEGY)
    private readonly strategy: Strategy,
  ) {}

  run(candles: readonly StrategyCandle[]): BacktestResult {
    this.validateCandles(candles);

    const history: StrategyCandle[] = [];
    const signals: StrategySignal[] = [];
    for (const candle of candles) {
      history.push(candle);
      if (history.length > this.strategy.requiredCandleCount) history.shift();
      signals.push(
        this.strategy.analyze({
          symbol: candle.symbol,
          candles: [...history],
          evaluatedAt: candle.closeTime,
        }),
      );
    }

    return {
      symbol: 'BTC/USDT',
      interval: '1m',
      candleCount: candles.length,
      startedAt: candles[0]?.openTime ?? null,
      endedAt: candles.at(-1)?.closeTime ?? null,
      signalCount: signals.length,
      buySignalCount: this.count(signals, 'buy'),
      sellSignalCount: this.count(signals, 'sell'),
      holdSignalCount: this.count(signals, 'hold'),
      signals,
    };
  }

  private count(
    signals: readonly StrategySignal[],
    action: StrategySignal['action'],
  ): number {
    return signals.filter((signal) => signal.action === action).length;
  }

  private validateCandles(candles: readonly StrategyCandle[]): void {
    let previousCloseTime = Number.NEGATIVE_INFINITY;
    for (const candle of candles) {
      const openTime = candle.openTime.getTime();
      const closeTime = candle.closeTime.getTime();
      if (
        candle.symbol !== 'BTC/USDT' ||
        candle.interval !== '1m' ||
        !candle.isClosed ||
        Number.isNaN(openTime) ||
        Number.isNaN(closeTime) ||
        closeTime <= openTime
      ) {
        throw new Error('Backtest requires valid closed BTC/USDT 1m candles');
      }
      if (closeTime <= previousCloseTime) {
        throw new Error(
          'Backtest candles must be ordered by unique close time',
        );
      }
      previousCloseTime = closeTime;
    }
  }
}
