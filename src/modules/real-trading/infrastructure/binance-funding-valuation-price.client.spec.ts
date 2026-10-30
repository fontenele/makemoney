import { jest } from '@jest/globals';
import { BinanceFundingValuationPriceClient } from './binance-funding-valuation-price.client';

describe('BinanceFundingValuationPriceClient', () => {
  const observedAt = new Date('2026-10-22T03:00:00.000Z');

  it('loads the exact public Binance BNB/USDT and USDT/BRL prices', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(
      Response.json([
        { symbol: 'USDTBRL', price: '5.04450000' },
        { symbol: 'BNBUSDT', price: '742.19000000' },
      ]),
    );
    const client = new BinanceFundingValuationPriceClient(
      'https://data-api.binance.vision/',
      httpClient,
      () => observedAt,
    );

    await expect(client.load()).resolves.toEqual({
      provider: 'binance',
      bnbUsdtPrice: '742.19000000',
      btcUsdtPrice: null,
      usdtBrlPrice: '5.04450000',
      observedAt,
    });
    expect(httpClient.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/ticker/price?symbols=%5B%22BNBUSDT%22%2C%22USDTBRL%22%2C%22BTCUSDT%22%5D',
    );
    expect(httpClient.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('loads a precise BTC reference without claiming a BTCB quote', () => {
    const client = new BinanceFundingValuationPriceClient(
      'https://data-api.binance.vision',
    );
    expect(
      client.normalize([
        { symbol: 'BNBUSDT', price: '742.19' },
        { symbol: 'USDTBRL', price: '5.0445' },
        { symbol: 'BTCUSDT', price: '77000.12345678' },
      ])?.btcUsdtPrice,
    ).toBe('77000.12345678');
  });
  it.each(['0', '-1', '1e4', 'bad', 77000, '1'.repeat(80)])(
    'keeps other prices when BTC reference is invalid: %s',
    (price) => {
      const client = new BinanceFundingValuationPriceClient(
        'https://data-api.binance.vision',
      );
      expect(
        client.normalize([
          { symbol: 'BNBUSDT', price: '742.19' },
          { symbol: 'USDTBRL', price: '5.0445' },
          { symbol: 'BTCUSDT', price },
        ]),
      ).toMatchObject({ bnbUsdtPrice: '742.19', btcUsdtPrice: null });
    },
  );
  it.each([
    { payload: [] },
    { payload: [{ symbol: 'BNBUSDT', price: '742.19' }] },
    {
      payload: [
        { symbol: 'BNBUSDT', price: '742.19' },
        { symbol: 'BNBUSDT', price: '742.20' },
      ],
    },
    {
      payload: [
        { symbol: 'BNBUSDT', price: '0' },
        { symbol: 'USDTBRL', price: '5.04' },
      ],
    },
    {
      payload: [
        { symbol: 'BNBUSDT', price: '742.19' },
        { symbol: 'OTHER', price: '5.04' },
      ],
    },
  ])('rejects malformed or incomplete price payload %#', ({ payload }) => {
    const client = new BinanceFundingValuationPriceClient(
      'https://data-api.binance.vision',
    );

    expect(client.normalize(payload)).toBeNull();
  });

  it('rejects a non-success Binance response', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(new Response(null, { status: 429 }));
    const client = new BinanceFundingValuationPriceClient(
      'https://data-api.binance.vision',
      httpClient,
    );

    await expect(client.load()).rejects.toThrow(
      'Binance funding price request failed: 429',
    );
  });
});
