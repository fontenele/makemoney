import { describe, expect, it, vi } from 'vitest';
import {
  dashboardApiPath,
  loadDashboard,
  loadListingPerformance,
  loadPolymarketEventDetails,
  loadPolymarketEventLiveVolume,
  loadPolymarketEventTags,
  loadPolymarketMarketResearch,
  loadPolymarketRelatedTags,
  loadPolymarketSearch,
  updatePolymarketSettings,
} from './api';

describe('loadPolymarketSearch', () => {
  it('searches the provider catalog with a bounded encoded query', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          query: 'bitcoin & fed',
          page: 2,
          events: [{ id: '84', title: 'Bitcoin and the Fed' }],
          hasMore: true,
          totalResults: 12,
          receivedAt: '2026-09-29T23:00:00.000Z',
        }),
      ),
    );

    await expect(
      loadPolymarketSearch('bitcoin & fed', 2, request),
    ).resolves.toMatchObject({
      status: 'available',
      data: { query: 'bitcoin & fed', page: 2, totalResults: 12 },
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/search?q=bitcoin+%26+fed&limit=8&page=2',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('keeps a search provider failure isolated', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Polymarket search is unavailable' },
          { status: 503 },
        ),
      ),
    );

    await expect(loadPolymarketSearch('bitcoin', 1, request)).resolves.toEqual({
      status: 'unavailable',
      message: 'Polymarket search is unavailable',
    });
  });
});

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
                      : path.endsWith('/polymarket/open-interest')
                        ? {
                            provider: 'polymarket',
                            openInterestUsdc: '1234567.89',
                            source: 'data-api-open-interest',
                            receivedAt: '2026-09-29T18:00:01.000Z',
                            executable: false,
                          }
                        : path.includes('/polymarket/events')
                          ? {
                              events: [
                                {
                                  provider: 'polymarket',
                                  id: '84',
                                  title: '2028 Democratic nominee',
                                  active: true,
                                  closed: false,
                                  archived: false,
                                  restricted: false,
                                },
                              ],
                              nextCursor: null,
                              receivedAt: '2026-09-29T18:00:01.000Z',
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

    expect(request).toHaveBeenCalledTimes(13);
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
    expect(snapshot.polymarketGlobalOpenInterest).toMatchObject({
      status: 'available',
      data: {
        openInterestUsdc: '1234567.89',
        executable: false,
      },
    });
    expect(snapshot.polymarketEvents).toMatchObject({
      status: 'available',
      data: { events: [{ id: '84', closed: false }] },
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
    expect(snapshot.polymarketGlobalOpenInterest.status).toBe('unavailable');
    expect(snapshot.polymarketEvents.status).toBe('unavailable');
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

  it('keeps global open-interest failure isolated from provider freshness and discovery', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().endsWith('/polymarket/open-interest')) {
        return Promise.resolve(
          Response.json(
            { message: 'Polymarket global open interest is unavailable' },
            { status: 503 },
          ),
        );
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.polymarketGlobalOpenInterest).toEqual({
      status: 'unavailable',
      message: 'Polymarket global open interest is unavailable',
    });
    expect(snapshot.polymarketDataFreshness.status).toBe('available');
    expect(snapshot.polymarketMarkets.status).toBe('available');
    expect(snapshot.health.status).toBe('available');
  });

  it('keeps event discovery failure isolated from active markets', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      if (input.toString().includes('/polymarket/events')) {
        return Promise.resolve(
          Response.json(
            { message: 'Polymarket event discovery is unavailable' },
            { status: 503 },
          ),
        );
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.polymarketEvents).toEqual({
      status: 'unavailable',
      message: 'Polymarket event discovery is unavailable',
    });
    expect(snapshot.polymarketMarkets.status).toBe('available');
    expect(snapshot.polymarketDataFreshness.status).toBe('available');
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

describe('loadPolymarketEventDetails', () => {
  it('loads one explicitly selected public event', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          provider: 'polymarket',
          id: '84',
          title: '2028 Democratic nominee',
          description: 'Resolves according to the published rules.',
          resolutionSource: 'https://example.com/rules',
          active: true,
          closed: false,
          archived: false,
          restricted: false,
          markets: [{ id: '42', question: 'Will candidate A win?' }],
          receivedAt: '2026-09-29T18:00:01.000Z',
        }),
      ),
    );

    await expect(
      loadPolymarketEventDetails('84', request),
    ).resolves.toMatchObject({
      status: 'available',
      data: { id: '84', markets: [{ id: '42' }] },
    });
    expect(request).toHaveBeenCalledWith('/api/polymarket/events/84', {
      headers: { Accept: 'application/json' },
    });
  });

  it('encodes identity and preserves a bounded provider diagnostic', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Polymarket event detail is unavailable' },
          { status: 503 },
        ),
      ),
    );

    await expect(
      loadPolymarketEventDetails('84/path', request),
    ).resolves.toEqual({
      status: 'unavailable',
      message: 'Polymarket event detail is unavailable',
    });
    expect(request).toHaveBeenCalledWith('/api/polymarket/events/84%2Fpath', {
      headers: { Accept: 'application/json' },
    });
  });
});

describe('loadPolymarketEventTags', () => {
  it('loads direct taxonomy for one explicitly selected event', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          provider: 'polymarket',
          eventId: '84',
          tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
          receivedAt: '2026-09-29T18:00:01.000Z',
        }),
      ),
    );

    await expect(loadPolymarketEventTags('84', request)).resolves.toMatchObject(
      {
        status: 'available',
        data: { eventId: '84', tags: [{ id: '2', label: 'Politics' }] },
      },
    );
    expect(request).toHaveBeenCalledWith('/api/polymarket/events/84/tags', {
      headers: { Accept: 'application/json' },
    });
  });

  it('encodes event identity and isolates taxonomy failure', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Polymarket event tags are unavailable' },
          { status: 503 },
        ),
      ),
    );

    await expect(loadPolymarketEventTags('84/path', request)).resolves.toEqual({
      status: 'unavailable',
      message: 'Polymarket event tags are unavailable',
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/events/84%2Fpath/tags',
      { headers: { Accept: 'application/json' } },
    );
  });
});

describe('loadPolymarketEventLiveVolume', () => {
  it('loads the public aggregate for one explicitly selected event', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          provider: 'polymarket',
          event: { id: '84', title: '2028 Democratic nominee' },
          takerVolumeTotalShares: '1250.5',
          markets: [
            { conditionId: '0xabc', takerVolumeShares: '1000.5' },
            { conditionId: '0xdef', takerVolumeShares: '250' },
          ],
          source: 'data-api-live-volume',
          receivedAt: '2026-09-29T18:00:01.000Z',
          executable: false,
        }),
      ),
    );

    await expect(
      loadPolymarketEventLiveVolume('84', request),
    ).resolves.toMatchObject({
      status: 'available',
      data: {
        takerVolumeTotalShares: '1250.5',
        markets: [
          { takerVolumeShares: '1000.5' },
          { takerVolumeShares: '250' },
        ],
        executable: false,
      },
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/events/84/live-volume',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('encodes event identity and isolates live-volume failure', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Polymarket event live volume is unavailable' },
          { status: 404 },
        ),
      ),
    );

    await expect(
      loadPolymarketEventLiveVolume('84/path', request),
    ).resolves.toEqual({
      status: 'unavailable',
      message: 'Polymarket event live volume is unavailable',
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/events/84%2Fpath/live-volume',
      { headers: { Accept: 'application/json' } },
    );
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
      if (path.endsWith('/resolution')) {
        return Promise.resolve(
          Response.json({
            provider: 'polymarket',
            market: { id: '42' },
            resolution: {
              provider: 'polymarket',
              conditionId: `0x${'a'.repeat(64)}`,
              status: 'resolved',
              extendedReview: false,
              wasDisputed: false,
              wasArbitrated: false,
              resolvedAt: '2026-09-29T12:00:00.000Z',
              source: 'data-api-resolution',
              receivedAt: '2026-09-29T12:34:57.000Z',
            },
            result: 'yes',
            payouts: {
              yes: {
                label: 'Yes',
                tokenId: '111',
                payoutRate: '1',
                status: 'winner',
              },
              no: {
                label: 'No',
                tokenId: '222',
                payoutRate: '0',
                status: 'loser',
              },
            },
            executable: false,
          }),
        );
      }
      if (path.endsWith('/tags')) {
        return Promise.resolve(
          Response.json({
            provider: 'polymarket',
            marketId: '42',
            tags: [
              { id: '7', label: 'Politics', slug: 'politics' },
              { id: '11', label: null, slug: 'elections' },
            ],
            receivedAt: '2026-09-29T12:34:57.000Z',
          }),
        );
      }
      if (path.endsWith('/midpoint-complement')) {
        return Promise.resolve(
          Response.json({
            outcomes: { yes: { price: '0.62' }, no: { price: '0.38' } },
            midpointSum: '1',
            deviationFromOne: '0',
            status: 'balanced',
            atomicSnapshot: false,
            executable: false,
          }),
        );
      }
      if (path.includes('/price-change?')) {
        return Promise.resolve(
          Response.json({
            requestedFrom: '2026-09-28T12:34:56.000Z',
            requestedTo: '2026-09-29T12:34:56.000Z',
            outcomes: {
              yes: {
                priceChange: '0.04',
                direction: 'up',
                observations: {
                  from: {
                    tokenId: '111',
                    observedAt: '2026-09-28T12:30:00.000Z',
                    price: '0.58',
                    resolutionSeconds: 1800,
                    exactTimestamp: false,
                  },
                  to: {
                    tokenId: '111',
                    observedAt: '2026-09-29T12:30:00.000Z',
                    price: '0.62',
                    resolutionSeconds: 1800,
                    exactTimestamp: false,
                  },
                },
              },
              no: {
                priceChange: '-0.04',
                direction: 'down',
                observations: {
                  from: {
                    tokenId: '222',
                    observedAt: '2026-09-28T12:00:00.000Z',
                    price: '0.42',
                    resolutionSeconds: 3600,
                    exactTimestamp: false,
                  },
                  to: {
                    tokenId: '222',
                    observedAt: '2026-09-29T12:00:00.000Z',
                    price: '0.38',
                    resolutionSeconds: 3600,
                    exactTimestamp: false,
                  },
                },
              },
            },
            combinedPriceChange: '0',
            combinedDirection: 'unchanged',
            sameFromObservedTimestamp: true,
            sameToObservedTimestamp: false,
            sameFromResolution: true,
            sameToResolution: false,
            atomicSnapshot: false,
            executable: false,
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

    expect(request).toHaveBeenCalledTimes(12);
    expect(research.details.status).toBe('available');
    expect(research.tags).toMatchObject({
      status: 'available',
      data: {
        marketId: '42',
        tags: [
          { id: '7', label: 'Politics' },
          { id: '11', slug: 'elections' },
        ],
      },
    });
    expect(research.openInterest).toMatchObject({
      status: 'available',
      data: { openInterestUsdc: '12500' },
    });
    expect(research.resolution).toMatchObject({
      status: 'available',
      data: {
        result: 'yes',
        resolution: { status: 'resolved', wasDisputed: false },
        payouts: {
          yes: { payoutRate: '1', status: 'winner' },
          no: { payoutRate: '0', status: 'loser' },
        },
        executable: false,
      },
    });
    expect(research.midpointComplement).toMatchObject({
      status: 'available',
      data: {
        outcomes: { yes: { price: '0.62' } },
        midpointSum: '1',
        deviationFromOne: '0',
        status: 'balanced',
        atomicSnapshot: false,
        executable: false,
      },
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
          yes: {
            priceChange: '0.04',
            direction: 'up',
            observations: {
              from: {
                tokenId: '111',
                observedAt: '2026-09-28T12:30:00.000Z',
                price: '0.58',
                resolutionSeconds: 1800,
                exactTimestamp: false,
              },
              to: {
                tokenId: '111',
                observedAt: '2026-09-29T12:30:00.000Z',
                price: '0.62',
                resolutionSeconds: 1800,
                exactTimestamp: false,
              },
            },
          },
          no: {
            priceChange: '-0.04',
            direction: 'down',
            observations: {
              from: {
                tokenId: '222',
                observedAt: '2026-09-28T12:00:00.000Z',
                price: '0.42',
                resolutionSeconds: 3600,
                exactTimestamp: false,
              },
              to: {
                tokenId: '222',
                observedAt: '2026-09-29T12:00:00.000Z',
                price: '0.38',
                resolutionSeconds: 3600,
                exactTimestamp: false,
              },
            },
          },
        },
        combinedPriceChange: '0',
        combinedDirection: 'unchanged',
        sameFromObservedTimestamp: true,
        sameToObservedTimestamp: false,
        sameFromResolution: true,
        sameToResolution: false,
        atomicSnapshot: false,
        executable: false,
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
    expect(request).toHaveBeenCalledWith('/api/polymarket/markets/42/tags', {
      headers: { Accept: 'application/json' },
    });
    expect(request).toHaveBeenCalledWith(
      '/api/polymarket/markets/42/resolution',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('keeps unavailable market statistics isolated', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      return path.endsWith('/open-interest') || path.endsWith('/resolution')
        ? Promise.resolve(new Response(null, { status: 404 }))
        : Promise.resolve(
            Response.json({
              id: '42',
              outcomes: {
                yes: { label: 'Yes', tokenId: null },
                no: { label: 'No', tokenId: null },
              },
            }),
          );
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.details.status).toBe('available');
    expect(research.openInterest).toEqual({
      status: 'unavailable',
      message: 'Unavailable (404)',
    });
    expect(research.resolution).toEqual({
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

  it('keeps selected-market taxonomy failure isolated from other research', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.endsWith('/polymarket/markets/42/tags')) {
        return Promise.resolve(
          Response.json(
            { message: 'Polymarket market tags are unavailable' },
            { status: 503 },
          ),
        );
      }
      if (path.endsWith('/polymarket/markets/42')) {
        return Promise.resolve(
          Response.json({
            id: '42',
            outcomes: {
              yes: { label: 'Yes', tokenId: null },
              no: { label: 'No', tokenId: null },
            },
          }),
        );
      }
      return Promise.resolve(Response.json({}));
    });

    const research = await loadPolymarketMarketResearch('42', request);

    expect(research.tags).toEqual({
      status: 'unavailable',
      message: 'Polymarket market tags are unavailable',
    });
    expect(research.details.status).toBe('available');
    expect(research.openInterest.status).toBe('available');
    expect(research.midpointComplement.status).toBe('available');
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

describe('loadPolymarketRelatedTags', () => {
  it('loads one explicitly selected first-level relationship set', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json({
          provider: 'polymarket',
          tagId: '7',
          tags: [{ id: '11', label: 'Elections', slug: 'elections' }],
          receivedAt: '2026-09-29T12:34:57.000Z',
        }),
      ),
    );

    await expect(
      loadPolymarketRelatedTags('7', request),
    ).resolves.toMatchObject({
      status: 'available',
      data: { tagId: '7', tags: [{ id: '11', label: 'Elections' }] },
    });
    expect(request).toHaveBeenCalledWith('/api/polymarket/tags/7/related', {
      headers: { Accept: 'application/json' },
    });
  });

  it('preserves a bounded unavailable diagnostic', async () => {
    const request = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { message: 'Polymarket related tags are unavailable' },
          { status: 503 },
        ),
      ),
    );

    await expect(loadPolymarketRelatedTags('7', request)).resolves.toEqual({
      status: 'unavailable',
      message: 'Polymarket related tags are unavailable',
    });
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
