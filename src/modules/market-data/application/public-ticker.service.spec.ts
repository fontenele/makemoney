import { jest } from '@jest/globals';
import { MarketTicker } from '../domain/market-ticker';
import { TickerStream } from '../domain/ticker-stream';
import { PublicTickerService } from './public-ticker.service';
import { LatestMarketPriceService } from './latest-market-price.service';

describe('PublicTickerService', () => {
  it('starts and stops the configured ticker stream with the module lifecycle', () => {
    const start = jest.fn<(handler: (ticker: MarketTicker) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TickerStream = { start, stop };
    const latestMarketPrice = new LatestMarketPriceService();
    const service = new PublicTickerService(stream, latestMarketPrice);

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('retains a received ticker as the latest market price', () => {
    let handler: ((ticker: MarketTicker) => void) | undefined;
    const stream: TickerStream = {
      start: (receivedHandler) => {
        handler = receivedHandler;
      },
      stop: jest.fn(),
    };
    const latestMarketPrice = new LatestMarketPriceService();
    const service = new PublicTickerService(stream, latestMarketPrice);
    const ticker: MarketTicker = {
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '77777.12',
      eventTime: new Date('2026-09-11T12:00:00.000Z'),
      receivedAt: new Date('2026-09-11T12:00:00.100Z'),
    };

    service.onModuleInit();
    handler?.(ticker);

    expect(latestMarketPrice.getLatest()).toBe(ticker);
  });
});
