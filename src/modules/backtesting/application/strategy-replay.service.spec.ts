import { jest } from '@jest/globals';
import {
  Strategy,
  StrategyCandle,
  StrategyInput,
  StrategySignal,
} from '../../strategies/domain/strategy';
import { MovingAverageCrossoverStrategy } from '../../strategies/application/moving-average-crossover.strategy';
import { StrategyReplayService } from './strategy-replay.service';

describe('StrategyReplayService', () => {
  it('returns an empty deterministic result without evaluating', () => {
    const strategy = mockStrategy();
    const service = new StrategyReplayService(strategy);

    expect(service.run([])).toEqual({
      symbol: 'BTC/USDT',
      interval: '1m',
      candleCount: 0,
      startedAt: null,
      endedAt: null,
      signalCount: 0,
      buySignalCount: 0,
      sellSignalCount: 0,
      holdSignalCount: 0,
      signals: [],
    });
    expect(strategy.analyze.mock.calls).toHaveLength(0);
  });

  it('evaluates each candle without exposing future candles', () => {
    const strategy = mockStrategy(3);
    const service = new StrategyReplayService(strategy);
    const candles = [candle(0), candle(1), candle(2), candle(3)];

    const result = service.run(candles);

    expect(strategy.analyze.mock.calls).toHaveLength(4);
    expect(
      strategy.analyze.mock.calls.map(([input]) => input.candles.length),
    ).toEqual([1, 2, 3, 3]);
    expect(
      strategy.analyze.mock.calls.map(([input]) =>
        input.candles.at(-1)?.closeTime.getTime(),
      ),
    ).toEqual(candles.map((value) => value.closeTime.getTime()));
    expect(
      strategy.analyze.mock.calls.map(([input]) => input.evaluatedAt.getTime()),
    ).toEqual(candles.map((value) => value.closeTime.getTime()));
    expect(result).toMatchObject({
      candleCount: 4,
      signalCount: 4,
      buySignalCount: 0,
      sellSignalCount: 0,
      holdSignalCount: 4,
      startedAt: candles[0]?.openTime,
      endedAt: candles.at(-1)?.closeTime,
    });
  });

  it('produces the same timeline for the same candles', () => {
    const candles = ['5', '4', '3', '2', '1', '10'].map((price, index) =>
      candle(index, true, price),
    );

    const first = new StrategyReplayService(
      new MovingAverageCrossoverStrategy(),
    ).run(candles);
    const second = new StrategyReplayService(
      new MovingAverageCrossoverStrategy(),
    ).run(candles);

    expect(second).toEqual(first);
    expect(first.signals.at(-1)).toMatchObject({
      action: 'buy',
      reason: 'bullish_moving_average_crossover',
    });
    expect(first.buySignalCount).toBe(1);
  });

  it.each([[candle(0, false)], [candle(1), candle(0)], [candle(0), candle(0)]])(
    'rejects open, out-of-order, or duplicate candles',
    (candles) => {
      expect(() =>
        new StrategyReplayService(mockStrategy()).run(candles),
      ).toThrow();
    },
  );
});

function mockStrategy(requiredCandleCount = 6): Strategy & {
  analyze: jest.Mock<(input: StrategyInput) => StrategySignal>;
} {
  return {
    requiredCandleCount,
    analyze: jest.fn((input: StrategyInput) => ({
      strategy: 'moving_average_crossover',
      symbol: input.symbol,
      action: 'hold',
      reason: 'insufficient_closed_candles',
      shortPeriod: 3,
      longPeriod: 5,
      previousShortAverage: null,
      previousLongAverage: null,
      currentShortAverage: null,
      currentLongAverage: null,
      latestCandleCloseTime: input.candles.at(-1)?.closeTime ?? null,
      evaluatedAt: input.evaluatedAt,
    })),
  };
}

function candle(
  index: number,
  isClosed = true,
  closePrice = String(100 + index),
): StrategyCandle {
  const openTime = new Date(Date.UTC(2026, 8, 12, 12, index));
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    closePrice,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed,
  };
}
