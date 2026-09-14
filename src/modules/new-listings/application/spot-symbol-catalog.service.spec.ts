import { jest } from '@jest/globals';
import { SpotSymbolCatalogProvider } from '../domain/spot-symbol-catalog';
import { SpotSymbolCatalogService } from './spot-symbol-catalog.service';

describe('SpotSymbolCatalogService', () => {
  it('retains the startup catalog as the in-memory baseline', async () => {
    const catalog = {
      symbols: [],
      receivedAt: new Date('2026-09-14T00:00:00.000Z'),
    };
    const provider: SpotSymbolCatalogProvider = {
      load: jest.fn(() => Promise.resolve(catalog)),
    };
    const newlyObserved = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      baseAsset: 'NEW',
      quoteAsset: 'USDT' as const,
      status: 'TRADING',
      spotTradingAllowed: true,
    };
    const repository = {
      observe: jest.fn(() => Promise.resolve([newlyObserved])),
    };
    const service = new SpotSymbolCatalogService(provider, repository, 60_000);
    service.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.latest()).toBe(catalog);
    expect(service.latestNewlyObserved()).toEqual([newlyObserved]);
    expect(repository.observe).toHaveBeenCalledWith(catalog);
    service.onModuleDestroy();
  });

  it('keeps the baseline unavailable when startup loading fails', async () => {
    const provider: SpotSymbolCatalogProvider = {
      load: jest.fn(() => Promise.reject(new Error('network'))),
    };
    const service = new SpotSymbolCatalogService(
      provider,
      { observe: jest.fn(() => Promise.resolve([])) },
      60_000,
    );
    service.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.latest()).toBeUndefined();
    expect(service.latestNewlyObserved()).toEqual([]);
    service.onModuleDestroy();
  });

  it('refreshes sequentially at the configured interval', async () => {
    jest.useFakeTimers();
    try {
      const first = {
        symbols: [],
        receivedAt: new Date('2026-09-14T00:00:00.000Z'),
      };
      const second = {
        symbols: [],
        receivedAt: new Date('2026-09-14T00:01:00.000Z'),
      };
      const load = jest
        .fn<SpotSymbolCatalogProvider['load']>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);
      const provider: SpotSymbolCatalogProvider = { load };
      const repository = { observe: jest.fn(() => Promise.resolve([])) };
      const service = new SpotSymbolCatalogService(provider, repository, 5000);

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.latest()).toBe(first);
      await jest.advanceTimersByTimeAsync(5000);
      expect(service.latest()).toBe(second);
      expect(load).toHaveBeenCalledTimes(2);

      service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(5000);
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
