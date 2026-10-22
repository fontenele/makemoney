import { jest } from '@jest/globals';
import { MarketTicker } from '../domain/market-ticker';
import { TickerStream } from '../domain/ticker-stream';
import { TickerSnapshotProvider } from '../domain/ticker-snapshot-provider';
import { PublicTickerService } from './public-ticker.service';
import { LatestMarketPriceService } from './latest-market-price.service';

describe('PublicTickerService', () => {
  it('starts and stops the configured ticker stream with the module lifecycle', async () => {
    const start = jest.fn<(handler: (ticker: MarketTicker) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TickerStream = { start, stop };
    const latestMarketPrice = new LatestMarketPriceService();
    const snapshot = snapshotProvider(null);
    const service = new PublicTickerService(
      stream,
      snapshot,
      latestMarketPrice,
    );

    await service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('retains a received ticker as the latest market price', async () => {
    let handler: ((ticker: MarketTicker) => void) | undefined;
    const stream: TickerStream = {
      start: (receivedHandler) => {
        handler = receivedHandler;
      },
      stop: jest.fn(),
    };
    const latestMarketPrice = new LatestMarketPriceService();
    const service = new PublicTickerService(
      stream,
      snapshotProvider(null),
      latestMarketPrice,
    );
    const ticker: MarketTicker = {
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '77777.12',
      eventTime: new Date('2026-09-11T12:00:00.000Z'),
      receivedAt: new Date('2026-09-11T12:00:00.100Z'),
    };

    await service.onModuleInit();
    handler?.(ticker);

    expect(latestMarketPrice.getLatest()).toBe(ticker);
  });

  it('warms the latest price from REST before module initialization completes', async () => {
    const stream: TickerStream = { start: jest.fn(), stop: jest.fn() };
    const latestMarketPrice = new LatestMarketPriceService();
    const initialTicker = ticker('77654.32');
    const snapshot = snapshotProvider(initialTicker);
    const service = new PublicTickerService(
      stream,
      snapshot,
      latestMarketPrice,
    );

    await service.onModuleInit();

    expect(snapshot.load.mock.calls).toHaveLength(1);
    expect(snapshot.load.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
    expect(latestMarketPrice.getLatest()).toBe(initialTicker);
  });

  it('does not replace a streaming ticker that arrives while REST is loading', async () => {
    const streamedTicker = ticker('78000');
    const snapshotTicker = ticker('77000');
    let handler: ((ticker: MarketTicker) => void) | undefined;
    const stream: TickerStream = {
      start: (receivedHandler) => {
        handler = receivedHandler;
      },
      stop: jest.fn(),
    };
    const snapshot: TickerSnapshotProvider = {
      load: jest.fn(() => {
        handler?.(streamedTicker);
        return Promise.resolve(snapshotTicker);
      }),
    };
    const latestMarketPrice = new LatestMarketPriceService();
    const service = new PublicTickerService(
      stream,
      snapshot,
      latestMarketPrice,
    );

    await service.onModuleInit();

    expect(latestMarketPrice.getLatest()).toBe(streamedTicker);
  });

  it('still starts the stream when the initial REST request fails', async () => {
    const start = jest.fn<TickerStream['start']>();
    const stream: TickerStream = { start, stop: jest.fn() };
    const snapshot: TickerSnapshotProvider = {
      load: jest.fn(() => Promise.reject(new Error('network unavailable'))),
    };
    const latestMarketPrice = new LatestMarketPriceService();
    const service = new PublicTickerService(
      stream,
      snapshot,
      latestMarketPrice,
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(start).toHaveBeenCalledTimes(1);
    expect(latestMarketPrice.getLatest()).toBeUndefined();
  });
});

function snapshotProvider(
  ticker: MarketTicker | null,
): TickerSnapshotProvider & {
  load: jest.MockedFunction<TickerSnapshotProvider['load']>;
} {
  return {
    load: jest.fn(() => Promise.resolve(ticker)),
  };
}

function ticker(lastPrice: string): MarketTicker {
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    lastPrice,
    eventTime: new Date('2026-09-11T12:00:00.000Z'),
    receivedAt: new Date('2026-09-11T12:00:00.100Z'),
  };
}
