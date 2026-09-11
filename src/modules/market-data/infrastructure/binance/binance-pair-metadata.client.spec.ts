import { jest } from '@jest/globals';
import { BinancePairMetadataClient } from './binance-pair-metadata.client';

const validPayload = (filterType: 'MIN_NOTIONAL' | 'NOTIONAL') => ({
  timezone: 'UTC',
  symbols: [
    {
      symbol: 'BTCUSDT',
      status: 'TRADING',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      filters: [
        {
          filterType: 'PRICE_FILTER',
          minPrice: '0.01000000',
          maxPrice: '1000000.00000000',
          tickSize: '0.01000000',
        },
        {
          filterType: 'LOT_SIZE',
          minQty: '0.00001000',
          maxQty: '9000.00000000',
          stepSize: '0.00001000',
        },
        {
          filterType,
          minNotional: '5.00000000',
        },
      ],
    },
  ],
});

describe('BinancePairMetadataClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');

  it.each(['MIN_NOTIONAL', 'NOTIONAL'] as const)(
    'normalizes the %s filter',
    (filterType) => {
      const client = new BinancePairMetadataClient(
        'https://data-api.binance.vision',
        fetch,
        () => receivedAt,
      );

      expect(client.normalize(validPayload(filterType))).toEqual({
        provider: 'binance',
        symbol: 'BTC/USDT',
        status: 'TRADING',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        minPrice: '0.01000000',
        maxPrice: '1000000.00000000',
        tickSize: '0.01000000',
        minQuantity: '0.00001000',
        maxQuantity: '9000.00000000',
        stepSize: '0.00001000',
        minNotional: '5.00000000',
        receivedAt,
      });
    },
  );

  it('rejects missing required filters and invalid decimal values', () => {
    const client = new BinancePairMetadataClient(
      'https://data-api.binance.vision',
    );
    const missingFilter = validPayload('MIN_NOTIONAL');
    missingFilter.symbols[0].filters.pop();
    const invalidDecimal = validPayload('MIN_NOTIONAL');
    invalidDecimal.symbols[0].filters[0].tickSize = '-0.01';

    expect(client.normalize(missingFilter)).toBeNull();
    expect(client.normalize(invalidDecimal)).toBeNull();
  });

  it('requests the public BTCUSDT exchange information endpoint', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(
      new Response(JSON.stringify(validPayload('NOTIONAL')), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new BinancePairMetadataClient(
      'https://data-api.binance.vision/',
      httpClient,
      () => receivedAt,
    );

    await expect(client.load()).resolves.toMatchObject({ symbol: 'BTC/USDT' });
    expect(httpClient.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/exchangeInfo?symbol=BTCUSDT',
    );
    expect(httpClient.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws when Binance returns a non-success response', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(new Response(null, { status: 429 }));
    const client = new BinancePairMetadataClient(
      'https://data-api.binance.vision',
      httpClient,
    );

    await expect(client.load()).rejects.toThrow(
      'Binance exchange info request failed: 429',
    );
  });
});
