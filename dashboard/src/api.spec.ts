import { describe, expect, it, vi } from 'vitest';
import { dashboardApiPath, loadDashboard, loadListingPerformance } from './api';

describe('dashboardApiPath', () => {
  it('uses the Vite proxy only during development', () => {
    expect(dashboardApiPath('/health', true)).toBe('/api/health');
    expect(dashboardApiPath('/health', false)).toBe('/health');
  });
});

describe('loadDashboard', () => {
  it('loads every read-only resource independently', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      const body = path.endsWith('/health')
        ? { status: 'ok', services: { api: 'up', postgres: 'up', redis: 'up' } }
        : path.endsWith('/valuation')
          ? { totalValue: '1025.5' }
          : path.endsWith('/position')
            ? { symbol: 'BTC/USDT', totalPnl: '25.5' }
            : path.endsWith('/performance')
              ? { symbol: 'BTC/USDT', executionCount: 4 }
              : path.includes('/executions')
                ? [
                    {
                      id: 'execution-1',
                      symbol: 'BTC/USDT',
                      side: 'buy',
                      quantity: '0.001',
                    },
                  ]
                : path.includes('/new-listings')
                  ? [
                      {
                        provider: 'binance',
                        symbol: 'NEWUSDT',
                        detectedAt: '2026-09-26T12:00:00.000Z',
                      },
                    ]
                  : path.includes('/backtesting/runs')
                    ? [
                        {
                          id: 'run-1',
                          createdAt: '2026-09-26T12:00:00.000Z',
                        },
                      ]
                    : [
                        {
                          strategy: 'moving_average_crossover',
                          symbol: 'BTC/USDT',
                          action: 'hold',
                        },
                      ];
      return Promise.resolve(Response.json(body));
    });

    const snapshot = await loadDashboard(request);

    expect(request).toHaveBeenCalledTimes(8);
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.valuation).toMatchObject({
      status: 'available',
      data: { totalValue: '1025.5' },
    });
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
    expect(snapshot.executions).toMatchObject({
      status: 'available',
      data: [{ id: 'execution-1', side: 'buy' }],
    });
    expect(snapshot.newListings).toMatchObject({
      status: 'available',
      data: [{ provider: 'binance', symbol: 'NEWUSDT' }],
    });
    expect(snapshot.strategySignals).toMatchObject({
      status: 'available',
      data: [{ action: 'hold' }],
    });
    expect(snapshot.backtestRuns).toMatchObject({
      status: 'available',
      data: [{ id: 'run-1' }],
    });
  });

  it('keeps healthy resources visible when another endpoint is unavailable', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.endsWith('/valuation')) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.valuation).toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
    expect(snapshot.executions.status).toBe('available');
    expect(snapshot.newListings.status).toBe('available');
    expect(snapshot.strategySignals.status).toBe('available');
    expect(snapshot.backtestRuns.status).toBe('available');
  });

  it('keeps the overview available when execution history is unavailable', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().includes('/executions')) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.executions).toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.valuation.status).toBe('available');
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
    expect(snapshot.newListings.status).toBe('available');
    expect(snapshot.strategySignals.status).toBe('available');
    expect(snapshot.backtestRuns.status).toBe('available');
  });

  it('keeps portfolio resources available when new listings are unavailable', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().includes('/new-listings')) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return Promise.resolve(Response.json([]));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.newListings).toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.valuation.status).toBe('available');
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
    expect(snapshot.executions.status).toBe('available');
    expect(snapshot.strategySignals.status).toBe('available');
    expect(snapshot.backtestRuns.status).toBe('available');
  });

  it('reports an unreachable local API without rejecting the refresh', async () => {
    const request = vi.fn(() => Promise.reject(new Error('offline')));

    const snapshot = await loadDashboard(request);

    expect(snapshot.health).toEqual({
      status: 'unavailable',
      message: 'Local API is unreachable',
    });
    expect(snapshot.valuation.status).toBe('unavailable');
    expect(snapshot.position.status).toBe('unavailable');
    expect(snapshot.performance.status).toBe('unavailable');
    expect(snapshot.executions.status).toBe('unavailable');
    expect(snapshot.newListings.status).toBe('unavailable');
    expect(snapshot.strategySignals.status).toBe('unavailable');
    expect(snapshot.backtestRuns.status).toBe('unavailable');
  });

  it('keeps the dashboard available when stored backtests are unavailable', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().includes('/backtesting/runs')) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return Promise.resolve(Response.json([]));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.backtestRuns).toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.valuation.status).toBe('available');
    expect(snapshot.executions.status).toBe('available');
    expect(snapshot.newListings.status).toBe('available');
    expect(snapshot.strategySignals.status).toBe('available');
  });
});

describe('loadListingPerformance', () => {
  it('loads one selected detection through the read-only performance route', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          provider: 'binance',
          symbol: 'NEWUSDT',
          baselineLabel: 'T+0',
          baselinePrice: '1',
          points: [],
        }),
      ),
    );

    await expect(
      loadListingPerformance('binance', 'NEWUSDT', request),
    ).resolves.toMatchObject({
      status: 'available',
      data: { symbol: 'NEWUSDT', baselinePrice: '1' },
    });
    expect(request).toHaveBeenCalledWith(
      '/api/new-listings/binance/NEWUSDT/performance',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('keeps a missing T+0 observation explicit', async () => {
    const request = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );

    await expect(
      loadListingPerformance('binance', 'NEWUSDT', request),
    ).resolves.toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
  });
});
