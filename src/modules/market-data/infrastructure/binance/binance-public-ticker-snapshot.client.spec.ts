import { jest } from '@jest/globals';
import { BinancePublicTickerSnapshotClient } from './binance-public-ticker-snapshot.client';

describe('BinancePublicTickerSnapshotClient', () => {
  const observedAt = new Date('2026-10-22T12:00:00.000Z');

  it('loads and normalizes the public BTC/USDT price snapshot', async () => {
    const httpClient = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ symbol: 'BTCUSDT', price: '108765.43000000' }),
        {
          status: 200,
        },
      ),
    );
    const client = new BinancePublicTickerSnapshotClient(
      'https://data-api.binance.vision/',
      httpClient,
      () => observedAt,
    );

    await expect(client.load()).resolves.toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '108765.43000000',
      eventTime: observedAt,
      receivedAt: observedAt,
    });
    expect(httpClient.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT',
    );
    expect(httpClient.mock.calls[0]?.[1]?.headers).toEqual({
      accept: 'application/json',
    });
    expect(httpClient.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {},
    { symbol: 'ETHUSDT', price: '3000' },
    { symbol: 'BTCUSDT', price: '0' },
    { symbol: 'BTCUSDT', price: '-1' },
    { symbol: 'BTCUSDT', price: '1e5' },
  ])('rejects an invalid provider payload %#', (payload) => {
    const client = new BinancePublicTickerSnapshotClient(
      'https://data-api.binance.vision',
      undefined,
      () => observedAt,
    );

    expect(client.normalize(payload)).toBeNull();
  });

  it('rejects a non-successful provider response without exposing its body', async () => {
    const httpClient = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('provider detail', { status: 503 }));
    const client = new BinancePublicTickerSnapshotClient(
      'https://data-api.binance.vision',
      httpClient,
    );

    await expect(client.load()).rejects.toThrow(
      'Binance ticker price request failed: 503',
    );
  });
});
