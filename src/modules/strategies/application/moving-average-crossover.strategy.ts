import Decimal from 'decimal.js';
import {
  Strategy,
  StrategyCandle,
  StrategyInput,
  StrategySignal,
} from '../domain/strategy';

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const StrategyDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class MovingAverageCrossoverStrategy implements Strategy {
  readonly requiredCandleCount: number;

  constructor(
    private readonly shortPeriod = 3,
    private readonly longPeriod = 5,
  ) {
    if (
      !Number.isSafeInteger(shortPeriod) ||
      !Number.isSafeInteger(longPeriod) ||
      shortPeriod <= 0 ||
      longPeriod <= shortPeriod
    ) {
      throw new Error(
        'Moving-average periods must be positive safe integers and shortPeriod must be less than longPeriod',
      );
    }
    this.requiredCandleCount = longPeriod + 1;
  }

  analyze(input: StrategyInput): StrategySignal {
    this.validateInput(input);

    const closedCandles = input.candles.filter((candle) => candle.isClosed);
    const base = {
      strategy: 'moving_average_crossover' as const,
      symbol: input.symbol,
      shortPeriod: this.shortPeriod,
      longPeriod: this.longPeriod,
      latestCandleCloseTime: closedCandles.at(-1)?.closeTime ?? null,
      evaluatedAt: input.evaluatedAt,
    };

    if (closedCandles.length < this.longPeriod + 1) {
      return {
        ...base,
        action: 'hold',
        reason: 'insufficient_closed_candles',
        previousShortAverage: null,
        previousLongAverage: null,
        currentShortAverage: null,
        currentLongAverage: null,
      };
    }

    const prices = closedCandles.map(
      (candle) => new StrategyDecimal(candle.closePrice),
    );
    const previousPrices = prices.slice(0, -1);
    const previousShort = this.average(previousPrices, this.shortPeriod);
    const previousLong = this.average(previousPrices, this.longPeriod);
    const currentShort = this.average(prices, this.shortPeriod);
    const currentLong = this.average(prices, this.longPeriod);

    const bullish =
      previousShort.lessThanOrEqualTo(previousLong) &&
      currentShort.greaterThan(currentLong);
    const bearish =
      previousShort.greaterThanOrEqualTo(previousLong) &&
      currentShort.lessThan(currentLong);

    return {
      ...base,
      action: bullish ? 'buy' : bearish ? 'sell' : 'hold',
      reason: bullish
        ? 'bullish_moving_average_crossover'
        : bearish
          ? 'bearish_moving_average_crossover'
          : 'no_moving_average_crossover',
      previousShortAverage: previousShort.toFixed(),
      previousLongAverage: previousLong.toFixed(),
      currentShortAverage: currentShort.toFixed(),
      currentLongAverage: currentLong.toFixed(),
    };
  }

  private average(prices: readonly Decimal[], period: number): Decimal {
    return prices
      .slice(-period)
      .reduce((sum, price) => sum.plus(price), new StrategyDecimal(0))
      .dividedBy(period);
  }

  private validateInput(input: StrategyInput): void {
    if (
      input.symbol !== 'BTC/USDT' ||
      Number.isNaN(input.evaluatedAt.getTime())
    ) {
      throw new Error('Invalid strategy input');
    }

    let previousCloseTime = Number.NEGATIVE_INFINITY;
    for (const candle of input.candles) {
      this.validateCandle(candle);
      const closeTime = candle.closeTime.getTime();
      if (closeTime <= previousCloseTime) {
        throw new Error(
          'Strategy candles must be ordered by unique close time',
        );
      }
      previousCloseTime = closeTime;
    }
  }

  private validateCandle(candle: StrategyCandle): void {
    const openTime = candle.openTime.getTime();
    const closeTime = candle.closeTime.getTime();
    if (
      candle.symbol !== 'BTC/USDT' ||
      candle.interval !== '1m' ||
      Number.isNaN(openTime) ||
      Number.isNaN(closeTime) ||
      closeTime <= openTime ||
      (candle.isClosed &&
        (!DECIMAL_PATTERN.test(candle.closePrice) ||
          !new StrategyDecimal(candle.closePrice).greaterThan(0)))
    ) {
      throw new Error('Invalid strategy candle');
    }
  }
}
