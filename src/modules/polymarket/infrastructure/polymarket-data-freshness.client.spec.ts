import { jest } from '@jest/globals';
import { PolymarketDataFreshnessClient } from './polymarket-data-freshness.client';

const RECEIVED_AT = new Date('2026-09-27T22:00:02.000Z');

describe('PolymarketDataFreshnessClient', () => {
  it('loads the unauthenticated Data API status with a timeout signal', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(payload())));
    const client = new PolymarketDataFreshnessClient(
      'https://data-api.polymarket.com/',
      http,
      () => RECEIVED_AT,
    );

    await expect(client.getFreshness()).resolves.toEqual(observation());
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.polymarket.com/v2/status',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('normalizes the documented serving and ingestion freshness snapshot', () => {
    const client = new PolymarketDataFreshnessClient(
      'https://example.com',
      fetch,
      () => RECEIVED_AT,
    );

    expect(client.normalize(payload())).toEqual(observation());
  });

  it.each([
    {},
    { data: null },
    payload({ age_seconds: -1 }),
    payload({ computed_at: 'invalid' }),
    payload({ ingestion: { ...ingestion(), chain_id: 0 } }),
    payload({ ingestion: { ...ingestion(), cursors: 0 } }),
    payload({
      ingestion: { ...ingestion(), min_synced_block: 104 },
    }),
    payload({
      ingestion: {
        ...ingestion(),
        lagging: [laggingCursor(), laggingCursor()],
      },
    }),
    payload({ serving: { ...serving(), mechanisms: [] } }),
    payload({ serving: { ...serving(), worst: 'missing' } }),
    payload({
      serving: {
        ...serving(),
        mechanisms: [mechanism(), mechanism()],
      },
    }),
  ])('rejects malformed or incoherent payload %#', (value) => {
    const client = new PolymarketDataFreshnessClient('https://example.com');

    expect(() => client.normalize(value)).toThrow(
      'Invalid Polymarket data freshness payload',
    );
  });

  it('rejects oversized provider collections', () => {
    const client = new PolymarketDataFreshnessClient('https://example.com');

    expect(() =>
      client.normalize(
        payload({
          ingestion: {
            ...ingestion(),
            cursors: 1_001,
            lagging: Array.from({ length: 1_001 }, (_, index) => ({
              ...laggingCursor(),
              source: `source-${index}`,
            })),
          },
        }),
      ),
    ).toThrow('Invalid Polymarket data freshness payload');
  });

  it.each([429, 503])('rejects provider HTTP %i', async (status) => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status }));

    await expect(
      new PolymarketDataFreshnessClient(
        'https://example.com',
        http,
      ).getFreshness(),
    ).rejects.toThrow(String(status));
  });
});

function payload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      age_seconds: 2,
      computed_at: '2026-09-27T22:00:00Z',
      ingestion: ingestion(),
      serving: serving(),
      ...overrides,
    },
  };
}

function ingestion() {
  return {
    chain_id: 137,
    cursors: 2,
    lagging: [laggingCursor()],
    max_synced_block: 103,
    min_synced_block: 100,
    most_lagged: laggingCursor(),
    network: 'polygon',
  };
}

function laggingCursor() {
  return { behind_max: 3, block: 100, source: 'orders' };
}

function serving() {
  return {
    mechanisms: [mechanism()],
    lag_seconds: 4,
    worst: 'activity_feed',
  };
}

function mechanism() {
  return { age_seconds: 4, name: 'activity_feed', blocks_behind: 1 };
}

function observation() {
  return {
    provider: 'polymarket',
    snapshotAgeSeconds: 2,
    computedAt: '2026-09-27T22:00:00Z',
    ingestion: {
      chainId: 137,
      cursorCount: 2,
      lagging: [{ behindMax: 3, block: 100, source: 'orders' }],
      maxSyncedBlock: 103,
      minSyncedBlock: 100,
      mostLagged: { behindMax: 3, block: 100, source: 'orders' },
      network: 'polygon',
    },
    serving: {
      mechanisms: [{ ageSeconds: 4, name: 'activity_feed', blocksBehind: 1 }],
      lagSeconds: 4,
      worst: 'activity_feed',
    },
    source: 'data-api-status',
    receivedAt: RECEIVED_AT,
  };
}
