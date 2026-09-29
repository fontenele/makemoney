import { describe, expect, it, vi } from 'vitest';
import {
  dashboardApiPath,
  loadDashboard,
  loadListingPerformance,
  loadPolymarketMarketResearch,
  updatePolymarketSettings,
} from './api';

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
                    : path.endsWith('/polymarket/settings')
                      ? {
                          enabled: false,
                          startupDefault: false,
                          source: 'startup',
                          changedAt: null,
                        }
                      : path.includes('/polymarket/markets')
                        ? {
                            markets: [
                              {
                                provider: 'polymarket',
                                id: '42',
                                question: 'Will this market resolve YES?',
                                closed: false,
                              },
                            ],
                            nextCursor: null,
                          }
                        : path.endsWith('/polymarket/data-freshness')
                          ? {
                              provider: 'polymarket',
                              snapshotAgeSeconds: 3,
                              computedAt: '2026-09-29T18:00:00.000Z',
                              ingestion: {
                                chainId: 137,
                                cursorCount: 4,
                                lagging: [],
                                maxSyncedBlock: 100,
                                minSyncedBlock: 98,
                                mostLagged: {
                                  behindMax: 2,
                                  block: 98,
                                  source: 'positions',
                                },
                                network: 'polygon',
                              },
                              serving: {
                                mechanisms: [],
                                lagSeconds: 5,
                                worst: 'trades',
                              },
                              source: 'data-api-status',
                              receivedAt: '2026-09-29T18:00:01.000Z',
                            }
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

    expect(request).toHaveBeenCalledTimes(11);
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
    expect(snapshot.polymarketSettings).toMatchObject({
      status: 'available',
      data: { enabled: false, source: 'startup' },
    });
    expect(snapshot.polymarketDataFreshness).toMatchObject({
      status: 'available',
      data: {
        snapshotAgeSeconds: 3,
        serving: { lagSeconds: 5, worst: 'trades' },
        ingestion: { network: 'polygon' },
      },
    });
    expect(snapshot.polymarketMarkets).toMatchObject({
      status: 'available',
      data: { markets: [{ id: '42', closed: false }] },
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
    expect(snapshot.polymarketMarkets.status).toBe('available');
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
    expect(snapshot.polymarketMarkets.status).toBe('available');
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
    expect(snapshot.polymarketMarkets.status).toBe('available');
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
    expect(snapshot.polymarketSettings.status).toBe('unavailable');
    expect(snapshot.polymarketDataFreshness.status).toBe('unavailable');
    expect(snapshot.polymarketMarkets.status).toBe('unavailable');
  });

  it('shows a bounded diagnostic returned by the local API', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().includes('/polymarket/markets')) {
        return Promise.resolve(
          Response.json(
            {
              message:
                'Polymarket market discovery is unavailable because provider DNS resolution failed',
            },
            { status: 503 },
          ),
        );
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.polymarketMarkets).toEqual({
      status: 'unavailable',
      message:
        'Polymarket market discovery is unavailable because provider DNS resolution failed',
    });
  });

  it('keeps Data API freshness failure isolated from market discovery', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().endsWith('/polymarket/data-freshness')) {
        return Promise.resolve(
          Response.json(
            { message: 'Polymarket Data API freshness is unavailable' },
            { status: 503 },
          ),
        );
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.polymarketDataFreshness).toEqual({
      status: 'unavailable',
      message: 'Polymarket Data API freshness is unavailable',
    });
    expect(snapshot.polymarketMarkets.status).toBe('available');
    expect(snapshot.health.status).toBe('available');
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
    expect(snapshot.polymarketMarkets.status).toBe('available');
  });
});

describe('updatePolymarketSettings', () => {
  it('sends an explicit acknowledged runtime change', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          enabled: true,
          startupDefault: false,
          source: 'runtime',
          changedAt: '2026-09-29T14:00:00.000Z',
        }),
      ),
    );

    await expect(
      updatePolymarketSettings(true, true, request),
    ).resolves.toMatchObject({
      status: 'available',
      data: { enabled: true, source: 'runtime' },
    });
    expect(request).toHaveBeenCalledWith('/api/polymarket/settings', {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true, accessConfirmed: true }),
    });
  });

  it('surfaces a bounded settings error', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Access confirmation is required' },
          { status: 400 },
        ),
      ),
    );

    await expect(
      updatePolymarketSettings(true, false, request),
    ).resolves.toEqual({
      status: 'unavailable',
      message: 'Access confirmation is required',
    });
  });
});

describe('loadPolymarketMarketResearch', () => {
  it('loads identity, market statistics, current observations, and bounded 24-hour history', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.endsWith('/open-interest')) {
        return Promise.resolve(Response.json({ openInterestUsdc: '12500' }));
      }
      if (path.endsWith('/midpoint-complement')) {
        return Promise.resolve(
          Response.json({
            outcomes: { yes: { price: '0.62' }, no: { price: '0.38' } },
          }),
        );
      }
      if (path.includes('/price-change?')) {
        return Promise.resolve(
          Response.json({
            requestedFrom: '2026-09-28T12:34:56.000Z',
            requestedTo: '2026-09-29T12:34:56.000Z',
            outcomes: {
              yes: { priceChange: '0.04', direction: 'up' },
              no: { priceChange: '-0.04', direction: 'down' },
            },
          }),
        );
      }
      if (path.includes('/outcomes/111/price-history?')) {
        return Promise.resolve(
          Response.json({
            tokenId: '111',
            resolution: '30m',
            points: [{ timestamp: '2026-09-29T12:00:00.000Z', price: '0.62' }],
          }),
        );
      }
      if (path.includes('/outcomes/222/price-history?')) {
        return Promise.resolve(
          Response.json({
            tokenId: '222',
            resolution: '30m',
            points: [{ timestamp: '2026-09-29T12:00:00.000Z', price: '0.38' }],
          }),
        );
      }
      if (path.includes('/outcomes/111/top-of-book')) {
        return Promise.resolve(
          Response.json({ bid: { price: '0.61', quantity: '120' } }),
        );
      }
      if (path.includes('/outcomes/222/top-of-book')) {
        return Promise.resolve(
          Response.json({ ask: { price: '0.39', quantity: '95' } }),
        );
      }
      if (path.includes('/outcomes/111/last-trade')) {
        return Promise.resolve(Response.json({ price: '0.62', side: 'buy' }));
      }
      if (path.includes('/outcomes/222/last-trade')) {
        return Promise.resolve(Response.json({ price: '0.38', side: 'sell' }));
      }
      return Promise.resolve(
        Response.json({
          id: '42',
          outcomes: {
            yes: { label: 'Yes', tokenId: '111' },
            no: { label: 'No', tokenId: '222' },
          },
        }),
      );
    });

    const research = await loadPolymarketMarketResearch(
      '42',
      request,
      new Date('2026-09-29T12:34:56.789Z'),
    );

    expect(request).toHaveBeenCalledTimes(10);
    expect(research.details.status).toBe('available');
    expect(research.openInterest).toMatchObject({
      status: 'available',
      data: { openInterestUsdc: '12500' },
    });
    expect(research.midpointComplement).toMatchObject({
      status: 'available',
      data: { outcomes: { yes: { price: '0.62' } } },
    });
    expect(research.yesTopOfBook).toMatchObject({
      status: 'available',
      data: { bid: { price: '0.61', quantity: '120' } },
    });
    expect(research.noTopOfBook).toMatchObject({
      status: 'available',
      data: { ask: { price: '0.39', quantity: '95' } },
    });
    expect(research.yesLastTrade).toMatchObject({
      status: 'available',
      data: { price: '0.62', side: 'buy' },
    });
    expect(research.noLastTrade).toMatchObject({
      status: 'available',
      data: { price: '0.38', side: 'sell' },
    });
    expect(research.priceChange24h).toMatchObject({
      status: 'available',
      data: {
        outcomes: {
          yes: { priceChange: '0.04', direction: 'up' },
          no: { priceChange: '-0.04', direction: 'down' },
        },
      },
    });
    expect(research.yesPriceHistory24h).toMatchObject({
      status: 'available',
      data: { tokenId: '111', resolution: '30m' },
    });
    expect(research.noPriceHistory24h).toMatchObject({
      status: 'available',
      data: { tokenId: '222', resolution: '30m' },
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/markets/42/price-change?from=2026-09-28T12%3A34%3A56.000Z&to=2026-09-29T12%3A34%3A56.000Z',
      { headers: { Accept: 'application/json' } },
    );
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/outcomes/111/price-history?start=2026-09-28T12%3A34%3A56.000Z&end=2026-09-29T12%3A34%3A56.000Z&resolution=30m&limit=100',
      { headers: { Accept: 'application/json' } },
    );
    expect(request).toHaveBeenCalledWith('/api/polymarket/markets/42', {
      headers: { Accept: 'application/json' },
    });
  });

  it('keeps unavailable market statistics isolated', async () => {
    const request = vi.fn((input: string | URL | Request) =>
      input.toString().endsWith('/open-interest')
        ? Promise.resolve(new Response(null, { status: 404 }))
        : Promise.resolve(
            Response.json({
              id: '42',
              outcomes: {
                yes: { label: 'Yes', tokenId: null },
                no: { label: 'No', tokenId: null },
              },
            }),
          ),
    );

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.details.status).toBe('available');
    expect(research.openInterest).toEqual({
      status: 'unavailable',
      message: 'Unavailable (404)',
    });
    expect(research.midpointComplement.status).toBe('available');
    expect(research.yesTopOfBook).toEqual({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
    expect(research.yesLastTrade).toEqual({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
    expect(research.yesPriceHistory24h).toEqual({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
  });

  it('keeps YES and NO order-book failures isolated', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.includes('/outcomes/111/top-of-book')) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      if (path.includes('/outcomes/222/top-of-book')) {
        return Promise.resolve(Response.json({ bid: null, ask: null }));
      }
      if (path.endsWith('/polymarket/markets/42')) {
        return Promise.resolve(
          Response.json({
            id: '42',
            outcomes: {
              yes: { label: 'Yes', tokenId: '111' },
              no: { label: 'No', tokenId: '222' },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({}));
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.yesTopOfBook).toEqual({
      status: 'unavailable',
      message: 'Unavailable (404)',
    });
    expect(research.noTopOfBook.status).toBe('available');
  });

  it('keeps YES and NO latest-trade failures isolated', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.includes('/outcomes/111/last-trade')) {
        return Promise.resolve(
          Response.json(
            { message: 'Polymarket outcome last trade is unavailable' },
            { status: 404 },
          ),
        );
      }
      if (path.includes('/outcomes/222/last-trade')) {
        return Promise.resolve(Response.json({ price: '0.41', side: 'sell' }));
      }
      if (path.endsWith('/polymarket/markets/42')) {
        return Promise.resolve(
          Response.json({
            id: '42',
            outcomes: {
              yes: { label: 'Yes', tokenId: '111' },
              no: { label: 'No', tokenId: '222' },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({}));
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.yesLastTrade).toEqual({
      status: 'unavailable',
      message: 'Polymarket outcome last trade is unavailable',
    });
    expect(research.noLastTrade).toMatchObject({
      status: 'available',
      data: { price: '0.41', side: 'sell' },
    });
  });

  it('keeps the historical change failure isolated from current observations', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.includes('/price-change?')) {
        return Promise.resolve(
          Response.json(
            { message: 'Historical comparison is unavailable' },
            { status: 404 },
          ),
        );
      }
      if (path.endsWith('/polymarket/markets/42')) {
        return Promise.resolve(
          Response.json({
            id: '42',
            outcomes: {
              yes: { label: 'Yes', tokenId: '111' },
              no: { label: 'No', tokenId: '222' },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({}));
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.priceChange24h).toEqual({
      status: 'unavailable',
      message: 'Historical comparison is unavailable',
    });
    expect(research.details.status).toBe('available');
    expect(research.yesTopOfBook.status).toBe('available');
    expect(research.yesLastTrade.status).toBe('available');
  });

  it('keeps YES and NO price-history failures isolated', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.includes('/outcomes/111/price-history?')) {
        return Promise.resolve(
          Response.json(
            { message: 'YES history is unavailable' },
            { status: 404 },
          ),
        );
      }
      if (path.includes('/outcomes/222/price-history?')) {
        return Promise.resolve(
          Response.json({ tokenId: '222', resolution: '30m', points: [] }),
        );
      }
      if (path.endsWith('/polymarket/markets/42')) {
        return Promise.resolve(
          Response.json({
            id: '42',
            outcomes: {
              yes: { label: 'Yes', tokenId: '111' },
              no: { label: 'No', tokenId: '222' },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({}));
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.yesPriceHistory24h).toEqual({
      status: 'unavailable',
      message: 'YES history is unavailable',
    });
    expect(research.noPriceHistory24h).toMatchObject({
      status: 'available',
      data: { tokenId: '222', points: [] },
    });
    expect(research.priceChange24h.status).toBe('available');
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
