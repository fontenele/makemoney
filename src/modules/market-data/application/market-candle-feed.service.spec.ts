import { jest } from '@jest/globals';
import { MarketCandle } from '../domain/market-candle';
import { MarketCandleFeedService } from './market-candle-feed.service';

describe('MarketCandleFeedService', () => {
  it('publishes normalized candles until the subscriber unsubscribes', () => {
    const feed = new MarketCandleFeedService();
    const handler = jest.fn<(candle: MarketCandle) => void>();
    const value = candle();

    const unsubscribe = feed.subscribe(handler);
    feed.publish(value);
    unsubscribe();
    feed.publish(value);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(value);
  });

  it('isolates a failing subscriber from the remaining subscribers', () => {
    const feed = new MarketCandleFeedService();
    const remaining = jest.fn<(candle: MarketCandle) => void>();
    feed.subscribe(() => {
      throw new Error('failed');
    });
    feed.subscribe(remaining);

    feed.publish(candle());

    expect(remaining).toHaveBeenCalledTimes(1);
  });
});

function candle(): MarketCandle {
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '99',
    highPrice: '101',
    lowPrice: '98',
    closePrice: '100',
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '50',
    tradeCount: 10,
    openTime: new Date('2026-09-12T12:00:00.000Z'),
    closeTime: new Date('2026-09-12T12:00:59.999Z'),
    isClosed: true,
    eventTime: new Date('2026-09-12T12:01:00.000Z'),
    receivedAt: new Date('2026-09-12T12:01:00.100Z'),
  };
}
