import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';
import { HistoricalCandleCoverage } from './historical-candle-coverage';

describe('HistoricalCandleCoverage', () => {
  const coverage = new HistoricalCandleCoverage();

  it('accepts the complete minute-aligned sequence bounded by the limit', () => {
    const request = range(
      '2026-09-12T12:00:00.001Z',
      '2026-09-12T12:05:00.000Z',
      2,
    );

    expect(
      coverage.isComplete(request, [candle('12:01'), candle('12:02')]),
    ).toBe(true);
  });

  it.each([
    ['a missing minute', [candle('12:00'), candle('12:02')]],
    ['an incomplete tail', [candle('12:00')]],
    [
      'a sequence beginning after the request',
      [candle('12:01'), candle('12:02')],
    ],
  ])('rejects %s', (_case, candles) => {
    expect(
      coverage.isComplete(
        range('2026-09-12T12:00:00.000Z', '2026-09-12T12:01:00.000Z', 2),
        candles,
      ),
    ).toBe(false);
  });
});

function range(
  start: string,
  end: string,
  limit: number,
): HistoricalCandleRequest {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    startTime: new Date(start),
    endTime: new Date(end),
    limit,
  };
}

function candle(time: string): HistoricalCandle {
  const openTime = new Date(`2026-09-12T${time}:00.000Z`);
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '99',
    highPrice: '102',
    lowPrice: '98',
    closePrice: '100',
    baseVolume: '1.5',
    quoteVolume: '150',
    takerBuyBaseVolume: '0.75',
    takerBuyQuoteVolume: '75',
    tradeCount: 10,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed: true,
  };
}
