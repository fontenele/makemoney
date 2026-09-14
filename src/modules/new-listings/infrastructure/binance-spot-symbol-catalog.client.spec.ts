import { jest } from '@jest/globals';
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

  it('rejects non-success responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 429 }));
    await expect(
      new BinanceSpotSymbolCatalogClient('https://example.com', http).load(),
    ).rejects.toThrow('429');
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
