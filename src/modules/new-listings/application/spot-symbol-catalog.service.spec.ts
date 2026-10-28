import { jest } from '@jest/globals';
import {
  SpotSymbolCatalogProvider,
  SpotSymbolCatalogRateLimitError,
} from '../domain/spot-symbol-catalog';
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
    const newlyActivated = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      baseAsset: 'NEW',
      quoteAsset: 'USDT' as const,
      status: 'TRADING',
      spotTradingAllowed: true,
    };
    const repository = {
      observe: jest.fn(() => Promise.resolve([newlyActivated])),
      listDetected: jest.fn(() => Promise.resolve([])),
    };
    const service = new SpotSymbolCatalogService(provider, repository, 60_000);
    service.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.latest()).toBe(catalog);
    expect(service.latestNewlyActivated()).toEqual([newlyActivated]);
    expect(repository.observe).toHaveBeenCalledWith(catalog);
    service.onModuleDestroy();
  });

  it('keeps the baseline unavailable when startup loading fails', async () => {
    const provider: SpotSymbolCatalogProvider = {
      load: jest.fn(() => Promise.reject(new Error('network'))),
    };
    const service = new SpotSymbolCatalogService(
      provider,
      {
        observe: jest.fn(() => Promise.resolve([])),
        listDetected: jest.fn(() => Promise.resolve([])),
      },
      60_000,
    );
    service.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.latest()).toBeUndefined();
    expect(service.latestNewlyActivated()).toEqual([]);
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
      const repository = {
        observe: jest.fn(() => Promise.resolve([])),
        listDetected: jest.fn(() => Promise.resolve([])),
      };
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

  it('uses the rapid interval when the provider budget has headroom', async () => {
    jest.useFakeTimers();
    try {
      const now = new Date('2026-10-27T12:00:00.000Z');
      const load = jest.fn<SpotSymbolCatalogProvider['load']>(() =>
        Promise.resolve({
          symbols: [],
          receivedAt: now,
          requestWeight: {
            usedWeight: 20,
            limit: 6000,
            intervalMs: 60_000,
            observedAt: now,
          },
        }),
      );
      const service = new SpotSymbolCatalogService(
        { load },
        {
          observe: jest.fn(() => Promise.resolve([])),
          listDetected: jest.fn(() => Promise.resolve([])),
        },
        1000,
      );

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.status()).toMatchObject({
        state: 'waiting_for_activation',
        monitoredSymbolCount: 0,
        effectivePollIntervalMs: 1000,
        consecutiveFailures: 0,
        requestWeight: { usedWeight: 20, limit: 6000 },
      });
      await jest.advanceTimersByTimeAsync(1000);
      expect(load).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses unknown streamed activity to replace a pending timer with an immediate catalog refresh', async () => {
    jest.useFakeTimers();
    try {
      const now = new Date('2026-10-28T12:00:00.000Z');
      const catalog = {
        symbols: [
          {
            provider: 'binance' as const,
            symbol: 'BTCUSDT',
            baseAsset: 'BTC',
            quoteAsset: 'USDT' as const,
            status: 'TRADING',
            spotTradingAllowed: true,
          },
        ],
        receivedAt: now,
        requestWeight: {
          usedWeight: 20,
          limit: 6000,
          intervalMs: 60_000,
          observedAt: now,
        },
      };
      const load = jest.fn<SpotSymbolCatalogProvider['load']>(() =>
        Promise.resolve(catalog),
      );
      const service = new SpotSymbolCatalogService(
        { load },
        {
          observe: jest.fn(() => Promise.resolve([])),
          listDetected: jest.fn(() => Promise.resolve([])),
        },
        1000,
      );

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.requestActivityRefresh('BTCUSDT')).toBe(false);
      expect(service.requestActivityRefresh('NEWUSDT')).toBe(true);
      await jest.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(999);
      expect(load).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(3);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('retains the conservative fallback when request-budget evidence is incomplete', async () => {
    jest.useFakeTimers();
    try {
      const load = jest.fn<SpotSymbolCatalogProvider['load']>(() =>
        Promise.resolve({ symbols: [], receivedAt: new Date() }),
      );
      const service = new SpotSymbolCatalogService(
        { load },
        {
          observe: jest.fn(() => Promise.resolve([])),
          listDetected: jest.fn(() => Promise.resolve([])),
        },
        1000,
      );

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.status().effectivePollIntervalMs).toBe(5000);
      await jest.advanceTimersByTimeAsync(4999);
      expect(load).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('waits a complete provider interval when request-weight usage reaches 80 percent', async () => {
    jest.useFakeTimers();
    try {
      const now = new Date('2026-10-27T12:00:00.000Z');
      const load = jest.fn<SpotSymbolCatalogProvider['load']>(() =>
        Promise.resolve({
          symbols: [],
          receivedAt: now,
          requestWeight: {
            usedWeight: 4800,
            limit: 6000,
            intervalMs: 60_000,
            observedAt: now,
          },
        }),
      );
      const service = new SpotSymbolCatalogService(
        { load },
        {
          observe: jest.fn(() => Promise.resolve([])),
          listDetected: jest.fn(() => Promise.resolve([])),
        },
        1000,
      );

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.status().effectivePollIntervalMs).toBe(60_000);
      expect(service.requestActivityRefresh('NEWUSDT')).toBe(false);
      await jest.advanceTimersByTimeAsync(59_999);
      expect(load).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('backs off for the provider Retry-After duration and reports degradation', async () => {
    jest.useFakeTimers();
    try {
      const now = new Date('2026-10-27T12:00:00.000Z');
      const load = jest
        .fn<SpotSymbolCatalogProvider['load']>()
        .mockRejectedValueOnce(new SpotSymbolCatalogRateLimitError(429, 12_000))
        .mockResolvedValueOnce({ symbols: [], receivedAt: now });
      const service = new SpotSymbolCatalogService(
        { load },
        {
          observe: jest.fn(() => Promise.resolve([])),
          listDetected: jest.fn(() => Promise.resolve([])),
        },
        1000,
      );

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.status()).toMatchObject({
        state: 'degraded',
        effectivePollIntervalMs: 12_000,
        consecutiveFailures: 1,
        lastFailureCode: 'provider_rate_limited',
      });
      await jest.advanceTimersByTimeAsync(11_999);
      expect(load).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });
});
