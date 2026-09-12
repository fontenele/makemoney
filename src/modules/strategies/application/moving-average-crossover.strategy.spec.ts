import { MovingAverageCrossoverStrategy } from './moving-average-crossover.strategy';
import { StrategyCandle } from '../domain/strategy';

const candle = (
  index: number,
  closePrice: string,
  isClosed = true,
): StrategyCandle => ({
  symbol: 'BTC/USDT',
  interval: '1m',
  closePrice,
  openTime: new Date(Date.UTC(2026, 0, 1, 0, index)),
  closeTime: new Date(Date.UTC(2026, 0, 1, 0, index, 59)),
  isClosed,
});

const analyze = (prices: readonly string[], isClosed?: readonly boolean[]) =>
  new MovingAverageCrossoverStrategy(2, 3).analyze({
    symbol: 'BTC/USDT',
    candles: prices.map((price, index) =>
      candle(index, price, isClosed?.[index] ?? true),
    ),
    evaluatedAt: new Date('2026-01-01T01:00:00.000Z'),
  });

describe('MovingAverageCrossoverStrategy', () => {
  it('emits buy when the short average crosses above the long average', () => {
    const signal = analyze(['3', '2', '1', '4']);

    expect(signal).toMatchObject({
      action: 'buy',
      reason: 'bullish_moving_average_crossover',
      previousShortAverage: '1.5',
      previousLongAverage: '2',
      currentShortAverage: '2.5',
      currentLongAverage: '2.333333333333333333333333333333333333333',
    });
  });

  it('emits sell when the short average crosses below the long average', () => {
    const signal = analyze(['1', '2', '3', '0.5']);

    expect(signal.action).toBe('sell');
    expect(signal.reason).toBe('bearish_moving_average_crossover');
  });

  it('emits hold when no crossover occurs', () => {
    const signal = analyze(['1', '2', '3', '4']);

    expect(signal.action).toBe('hold');
    expect(signal.reason).toBe('no_moving_average_crossover');
  });

  it('treats equality followed by divergence as a crossover', () => {
    const signal = analyze(['2', '2', '2', '3']);

    expect(signal.action).toBe('buy');
    expect(signal.previousShortAverage).toBe('2');
    expect(signal.previousLongAverage).toBe('2');
  });

  it('uses closed candles only', () => {
    const signal = analyze(
      ['3', '2', '1', '999', '4'],
      [true, true, true, false, true],
    );

    expect(signal.action).toBe('buy');
    expect(signal.latestCandleCloseTime).toEqual(candle(4, '4').closeTime);
  });

  it('holds with null averages when closed history is insufficient', () => {
    const signal = analyze(['1', '2', '3']);

    expect(signal).toMatchObject({
      action: 'hold',
      reason: 'insufficient_closed_candles',
      previousShortAverage: null,
      currentLongAverage: null,
    });
  });

  it('rejects candles outside strict chronological order', () => {
    const candles = [candle(1, '1'), candle(0, '2')];

    expect(() =>
      new MovingAverageCrossoverStrategy(2, 3).analyze({
        symbol: 'BTC/USDT',
        candles,
        evaluatedAt: new Date(),
      }),
    ).toThrow('ordered by unique close time');
  });

  it.each([
    [0, 3],
    [3, 3],
    [4, 3],
    [1.5, 3],
  ])('rejects invalid periods %s/%s', (shortPeriod, longPeriod) => {
    expect(
      () => new MovingAverageCrossoverStrategy(shortPeriod, longPeriod),
    ).toThrow('Moving-average periods');
  });

  it.each(['', '-1', 'NaN', '1e3'])(
    'rejects invalid closed price %s',
    (price) => {
      expect(() => analyze(['1', '2', '3', price])).toThrow(
        'Invalid strategy candle',
      );
    },
  );
});
