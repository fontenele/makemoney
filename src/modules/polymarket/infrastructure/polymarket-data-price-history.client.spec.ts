import { jest } from '@jest/globals';
import {
  PredictionMarketHistoricalPriceUnavailableError,
  PredictionMarketPriceHistoryUnavailableError,
} from '../domain/prediction-market-price-history';
import { PolymarketDataPriceHistoryClient } from './polymarket-data-price-history.client';

describe('PolymarketDataPriceHistoryClient', () => {
  const query = {
    start: new Date('2026-09-27T00:00:00Z'),
    end: new Date('2026-09-28T00:00:00Z'),
    resolution: '5m' as const,
    limit: 2,
  };

  it('requests and normalizes one bounded oldest-first page', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        Response.json({
          data: [
            { timestamp: 1790467200, price: 0.25, resolution_seconds: 300 },
            { timestamp: 1790467500, price: '0.2500', resolution_seconds: 300 },
          ],
          pagination: {
            limit: 2,
            offset: 0,
            has_more: true,
            next_cursor: 'next',
          },
        }),
      );
    const receivedAt = new Date('2026-09-28T08:00:00Z');
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getPriceHistory('111', query)).resolves.toEqual({
      provider: 'polymarket',
      tokenId: '111',
      start: query.start,
      end: query.end,
      resolution: query.resolution,
      points: [
        {
          timestamp: new Date('2026-09-27T00:00:00Z'),
          price: '0.25',
          resolutionSeconds: 300,
        },
        {
          timestamp: new Date('2026-09-27T00:05:00Z'),
          price: '0.2500',
          resolutionSeconds: 300,
        },
      ],
      nextCursor: 'next',
      source: 'data-api-price-history',
      receivedAt,
      executable: false,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.polymarket.com/v2/prices-history?token_id=111&start=1790467200&end=1790553600&bucket_seconds=300&limit=2',
    );
  });

  it('sends an opaque continuation cursor with the same bounded cohort', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        Response.json({
          data: [],
          pagination: {
            limit: 2,
            offset: 2,
            has_more: false,
            next_cursor: null,
          },
        }),
      );
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
      http,
    );

    await client.getPriceHistory('111', { ...query, afterCursor: 'next/page' });
    expect(http.mock.calls[0]?.[0]).toContain('&cursor=next%2Fpage');
  });

  it('maps documented null data to explicit unavailability', () => {
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
    );
    expect(() =>
      client.normalize('111', query, {
        data: null,
        pagination: { has_more: false, next_cursor: null },
      }),
    ).toThrow(PredictionMarketPriceHistoryUnavailableError);
  });

  it.each([
    {},
    { data: [], pagination: { has_more: true, next_cursor: null } },
    { data: [], pagination: { has_more: false, next_cursor: 'unexpected' } },
    {
      data: [{ timestamp: 1790467200, price: -1, resolution_seconds: 300 }],
      pagination: { has_more: false, next_cursor: null },
    },
    {
      data: [{ timestamp: 1790467200, price: 1.1, resolution_seconds: 300 }],
      pagination: { has_more: false, next_cursor: null },
    },
    {
      data: [{ timestamp: 1790467200, price: 0.5, resolution_seconds: -1 }],
      pagination: { has_more: false, next_cursor: null },
    },
    {
      data: [{ timestamp: 1790467100, price: 0.5, resolution_seconds: 300 }],
      pagination: { has_more: false, next_cursor: null },
    },
    {
      data: [
        { timestamp: 1790467500, price: 0.5, resolution_seconds: 300 },
        { timestamp: 1790467200, price: 0.5, resolution_seconds: 300 },
      ],
      pagination: { has_more: false, next_cursor: null },
    },
  ])('rejects malformed price-history payload %#', (payload) => {
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
    );
    expect(() => client.normalize('111', query, payload)).toThrow(
      'Invalid Polymarket price-history payload',
    );
  });

  it('rejects invalid token identity before HTTP', async () => {
    const http = jest.fn<(input: string) => Promise<Response>>();
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
      http,
    );
    await expect(client.getPriceHistory('01', query)).rejects.toThrow(
      'Invalid Polymarket token identity',
    );
    expect(http).not.toHaveBeenCalled();
  });

  it('requests and normalizes the latest observation at or before one instant', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        Response.json({
          data: [
            { timestamp: 1790467500, price: '0.25', resolution_seconds: 300 },
          ],
          pagination: {
            limit: 1,
            offset: 0,
            has_more: false,
            next_cursor: null,
          },
        }),
      );
    const receivedAt = new Date('2026-09-28T09:00:00Z');
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(
      client.getPriceAt('111', new Date('2026-09-27T00:07:00Z')),
    ).resolves.toEqual({
      provider: 'polymarket',
      tokenId: '111',
      requestedAt: new Date('2026-09-27T00:07:00Z'),
      observedAt: new Date('2026-09-27T00:05:00Z'),
      price: '0.25',
      resolutionSeconds: 300,
      exactTimestamp: false,
      source: 'data-api-price-history',
      receivedAt,
      executable: false,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.polymarket.com/v2/prices-history?token_id=111&as_of=1790467620&limit=1',
    );
  });

  it('marks an observation at the exact requested timestamp', () => {
    const at = new Date('2026-09-27T00:05:00Z');
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
    );
    expect(
      client.normalizePriceAt('111', at, {
        data: [{ timestamp: 1790467500, price: 0, resolution_seconds: 0 }],
        pagination: {
          limit: 1,
          offset: 0,
          has_more: false,
          next_cursor: null,
        },
      }).exactTimestamp,
    ).toBe(true);
  });

  it.each([null, []])(
    'maps documented as-of absence to explicit unavailability',
    (data) => {
      const client = new PolymarketDataPriceHistoryClient(
        'https://data-api.polymarket.com',
      );
      expect(() =>
        client.normalizePriceAt('111', new Date('2026-09-27T00:07:00Z'), {
          data,
        }),
      ).toThrow(PredictionMarketHistoricalPriceUnavailableError);
    },
  );

  it.each([
    { data: [{ timestamp: 1790467500, price: 0.5, resolution_seconds: 300 }] },
    {
      data: [{ timestamp: 1790467700, price: 0.5, resolution_seconds: 300 }],
      pagination: { limit: 1, offset: 0, has_more: false, next_cursor: null },
    },
    {
      data: [{ timestamp: 1790467500, price: 0.5, resolution_seconds: 300 }],
      pagination: { limit: 1, offset: 0, has_more: true, next_cursor: 'next' },
    },
  ])('rejects malformed as-of payload %#', (payload) => {
    const client = new PolymarketDataPriceHistoryClient(
      'https://data-api.polymarket.com',
    );
    expect(() =>
      client.normalizePriceAt('111', new Date('2026-09-27T00:07:00Z'), payload),
    ).toThrow('Invalid Polymarket price-history payload');
  });
});
