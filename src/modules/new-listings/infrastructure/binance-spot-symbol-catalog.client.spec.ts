import { jest } from '@jest/globals';
import { SpotSymbolCatalogRateLimitError } from '../domain/spot-symbol-catalog';
import { BinanceSpotSymbolCatalogClient } from './binance-spot-symbol-catalog.client';

describe('BinanceSpotSymbolCatalogClient', () => {
  const receivedAt = new Date('2026-09-14T00:00:00.000Z');

  it('normalizes and sorts only USDT symbols', () => {
    const client = new BinanceSpotSymbolCatalogClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );
    expect(
      client.normalize({
        symbols: [
          symbol('ETHUSDT', 'ETH'),
          symbol('BTCUSDT', 'BTC'),
          { ...symbol('BTCUSDC', 'BTC'), quoteAsset: 'USDC' },
        ],
      }),
    ).toEqual({
      receivedAt,
      symbols: [
        {
          provider: 'binance',
          symbol: 'BTCUSDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          status: 'TRADING',
          spotTradingAllowed: true,
        },
        {
          provider: 'binance',
          symbol: 'ETHUSDT',
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
          status: 'TRADING',
          spotTradingAllowed: true,
        },
      ],
    });
  });

  it('rejects malformed USDT symbol data', () => {
    const client = new BinanceSpotSymbolCatalogClient('https://example.com');
    expect(() =>
      client.normalize({
        symbols: [{ ...symbol('BTCUSDT', 'BTC'), isSpotTradingAllowed: 'yes' }],
      }),
    ).toThrow('Invalid Binance USDT Spot symbol');
  });

  it('preserves canonical Unicode symbols returned by Binance', () => {
    const client = new BinanceSpotSymbolCatalogClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(
      client.normalize({
        symbols: [
          symbol('币安人生USDT', '币安人生'),
          symbol('牛来USDT', '牛来'),
        ],
      }).symbols,
    ).toEqual([
      expect.objectContaining({
        symbol: '币安人生USDT',
        baseAsset: '币安人生',
      }),
      expect.objectContaining({ symbol: '牛来USDT', baseAsset: '牛来' }),
    ]);
  });

  it('loads the unauthenticated exchange information endpoint', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ symbols: [symbol('BTCUSDT', 'BTC')] })),
      );
    const client = new BinanceSpotSymbolCatalogClient(
      'https://data-api.binance.vision/',
      http,
      () => receivedAt,
    );
    await expect(client.load()).resolves.toMatchObject({
      symbols: [{ symbol: 'BTCUSDT' }],
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/exchangeInfo',
    );
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('records the current minute request weight and published limit', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            rateLimits: [
              {
                rateLimitType: 'REQUEST_WEIGHT',
                interval: 'MINUTE',
                intervalNum: 1,
                limit: 6000,
              },
            ],
            symbols: [symbol('BTCUSDT', 'BTC')],
          }),
          { headers: { 'x-mbx-used-weight-1m': '42' } },
        ),
      );

    await expect(
      new BinanceSpotSymbolCatalogClient(
        'https://example.com',
        http,
        () => receivedAt,
      ).load(),
    ).resolves.toMatchObject({
      requestWeight: {
        usedWeight: 42,
        limit: 6000,
        intervalMs: 60_000,
        observedAt: receivedAt,
      },
    });
  });

  it('preserves used request weight when the provider omits its limit', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ symbols: [] }), {
          headers: { 'x-mbx-used-weight-1m': '7' },
        }),
      );

    await expect(
      new BinanceSpotSymbolCatalogClient('https://example.com', http).load(),
    ).resolves.toMatchObject({
      requestWeight: { usedWeight: 7, limit: null, intervalMs: null },
    });
  });

  it('reports provider throttling with Retry-After', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '12' },
        }),
      );

    await expect(
      new BinanceSpotSymbolCatalogClient('https://example.com', http).load(),
    ).rejects.toEqual(new SpotSymbolCatalogRateLimitError(429, 12_000));
  });

  it('rejects non-success responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 429 }));
    await expect(
      new BinanceSpotSymbolCatalogClient('https://example.com', http).load(),
    ).rejects.toBeInstanceOf(SpotSymbolCatalogRateLimitError);
  });
});

function symbol(name: string, baseAsset: string) {
  return {
    symbol: name,
    baseAsset,
    quoteAsset: 'USDT',
    status: 'TRADING',
    isSpotTradingAllowed: true,
  };
}
