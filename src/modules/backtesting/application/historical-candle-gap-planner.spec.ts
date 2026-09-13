import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';
import { HistoricalCandleCoverage } from './historical-candle-coverage';
import { HistoricalCandleGapPlanner } from './historical-candle-gap-planner';

describe('HistoricalCandleGapPlanner', () => {
  const planner = new HistoricalCandleGapPlanner(
    new HistoricalCandleCoverage(),
  );

  it('groups only consecutive missing minutes into bounded requests', () => {
    const request = range('12:00', '12:05', 6);

    expect(planner.plan(request, [candle('12:00'), candle('12:03')])).toEqual([
      range('12:01', '12:02', 2),
      range('12:04', '12:05', 2),
    ]);
  });

  it('returns no requests for complete stored coverage', () => {
    const request = range('12:00', '12:01', 2);
    expect(planner.plan(request, [candle('12:00'), candle('12:01')])).toEqual(
      [],
    );
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
    startTime: new Date(`2026-09-12T${start}:00.000Z`),
    endTime: new Date(`2026-09-12T${end}:00.000Z`),
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
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '50',
    tradeCount: 10,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed: true,
  };
}
