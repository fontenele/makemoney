import { jest } from '@jest/globals';
import { MarketCandleFeedService } from '../../market-data/application/market-candle-feed.service';
import { MarketCandle } from '../../market-data/domain/market-candle';
import { StrategyInput, StrategySignal } from '../domain/strategy';
import { LiveStrategyEvaluationService } from './live-strategy-evaluation.service';
import { MovingAverageCrossoverStrategy } from './moving-average-crossover.strategy';
import { StrategySignalReadModelService } from './strategy-signal-read-model.service';

describe('LiveStrategyEvaluationService', () => {
  it('evaluates every new closed candle and retains only six', () => {
    const { feed, strategy, service, signalReadModel } = setup();
    service.onModuleInit();

    for (let index = 0; index < 7; index += 1) {
      feed.publish(candle(index));
    }

    expect(strategy.analyze).toHaveBeenCalledTimes(7);
    const latestInput = strategy.analyze.mock.calls.at(-1)?.[0];
    expect(latestInput?.candles).toHaveLength(6);
    expect(latestInput?.candles[0]?.closeTime).toEqual(candle(1).closeTime);
    expect(latestInput?.candles.at(-1)?.closeTime).toEqual(candle(6).closeTime);
    expect(latestInput?.evaluatedAt).toEqual(candle(6).receivedAt);
    expect(signalReadModel.getLatest()).toBe(
      strategy.analyze.mock.results.at(-1)?.value,
    );
  });

  it('ignores open, duplicate, and out-of-order candles', () => {
    const { feed, strategy, service } = setup();
    service.onModuleInit();

    feed.publish(candle(1, false));
    feed.publish(candle(2));
    feed.publish(candle(2));
    feed.publish(candle(1));

    expect(strategy.analyze).toHaveBeenCalledTimes(1);
  });

  it('bounds history to the strategy declared requirement', () => {
    const { feed, strategy, service } = setup(3);
    service.onModuleInit();

    for (let index = 0; index < 5; index += 1) {
      feed.publish(candle(index));
    }

    const latestInput = strategy.analyze.mock.calls.at(-1)?.[0];
    expect(latestInput?.candles).toHaveLength(3);
    expect(latestInput?.candles[0]?.closeTime).toEqual(candle(2).closeTime);
  });

  it('stops receiving candles on module destruction', () => {
    const { feed, strategy, service } = setup();
    service.onModuleInit();
    service.onModuleDestroy();

    feed.publish(candle(0));

    expect(strategy.analyze).not.toHaveBeenCalled();
  });

  it('generates a crossover signal from the live closed-candle sequence', () => {
    const feed = new MarketCandleFeedService();
    const strategy = new MovingAverageCrossoverStrategy();
    const analyze = jest.spyOn(strategy, 'analyze');
    const service = new LiveStrategyEvaluationService(
      feed,
      strategy,
      new StrategySignalReadModelService(),
    );
    service.onModuleInit();

    ['5', '4', '3', '2', '1', '10'].forEach((price, index) =>
      feed.publish(candle(index, true, price)),
    );

    expect(analyze.mock.results.at(-1)?.value).toMatchObject({
      action: 'buy',
      reason: 'bullish_moving_average_crossover',
    });
  });
});

function setup(requiredCandleCount = 6): {
  feed: MarketCandleFeedService;
  strategy: {
    requiredCandleCount: number;
    analyze: jest.Mock<(input: StrategyInput) => StrategySignal>;
  };
  service: LiveStrategyEvaluationService;
  signalReadModel: StrategySignalReadModelService;
} {
  const feed = new MarketCandleFeedService();
  const analyze = jest.fn<(input: StrategyInput) => StrategySignal>(
    (input) => ({
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
    }),
  );
  const strategy = { requiredCandleCount, analyze };
  const signalReadModel = new StrategySignalReadModelService();
  return {
    feed,
    strategy,
    signalReadModel,
    service: new LiveStrategyEvaluationService(feed, strategy, signalReadModel),
  };
}

function candle(
  index: number,
  isClosed = true,
  closePrice = String(100 + index),
): MarketCandle {
  const openTime = new Date(Date.UTC(2026, 8, 12, 12, index));
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '99',
    highPrice: '101',
    lowPrice: '98',
    closePrice,
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '50',
    tradeCount: 10,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed,
    eventTime: new Date(openTime.getTime() + 60_000),
    receivedAt: new Date(openTime.getTime() + 60_100),
  };
}
