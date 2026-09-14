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
    const service = new SpotSymbolCatalogService(provider, repository);
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
    const service = new SpotSymbolCatalogService(provider, {
      observe: jest.fn(() => Promise.resolve([])),
    });
    service.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.latest()).toBeUndefined();
    expect(service.latestNewlyObserved()).toEqual([]);
    service.onModuleDestroy();
  });
});
