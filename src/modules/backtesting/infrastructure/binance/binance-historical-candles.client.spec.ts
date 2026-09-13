import { jest } from '@jest/globals';
import { HistoricalCandleRequest } from '../../domain/historical-candle-provider';
import { BinanceHistoricalCandlesClient } from './binance-historical-candles.client';

describe('BinanceHistoricalCandlesClient', () => {
  const now = new Date('2026-09-12T12:03:00.000Z');
  const request: HistoricalCandleRequest = {
    symbol: 'BTC/USDT',
    interval: '1m',
    startTime: new Date('2026-09-12T12:00:00.000Z'),
    endTime: new Date('2026-09-12T12:03:00.000Z'),
    limit: 4,
  };

  it('requests and normalizes public BTCUSDT one-minute klines', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(
      new Response(JSON.stringify([kline(0), kline(1)]), { status: 200 }),
    );
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision/',
      httpClient,
      () => now,
    );

    await expect(client.load(request)).resolves.toEqual([
      expect.objectContaining({
        symbol: 'BTC/USDT',
        interval: '1m',
        openPrice: '99',
        highPrice: '102',
        lowPrice: '98',
        closePrice: '100',
        baseVolume: '1.5',
        quoteVolume: '150',
        takerBuyBaseVolume: '0.75',
        takerBuyQuoteVolume: '75',
        tradeCount: 10,
        isClosed: true,
      }),
      expect.objectContaining({ closePrice: '101', isClosed: true }),
    ]);
    expect(httpClient.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=1789214400000&endTime=1789214580000&limit=4',
    );
    expect(httpClient.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('discards a candle whose close time has not passed', () => {
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      fetch,
      () => new Date('2026-09-12T12:01:30.000Z'),
    );

    expect(client.normalize([kline(0), kline(1)], request)).toHaveLength(1);
  });

  it('preserves arbitrary decimal precision without native-number conversion', () => {
    const precise = kline(0);
    precise[1] = '99999.12345678901234567890123456789';
    precise[2] = '100001.12345678901234567890123456789';
    precise[3] = '99998.12345678901234567890123456789';
    precise[4] = '100000.12345678901234567890123456789';
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      fetch,
      () => now,
    );

    expect(client.normalize([precise], request)[0]).toMatchObject({
      openPrice: precise[1],
      highPrice: precise[2],
      lowPrice: precise[3],
      closePrice: precise[4],
    });
  });

  it.each([
    { field: 2, value: '97' },
    { field: 3, value: '103' },
    { field: 1, value: '0' },
    { field: 5, value: '-1' },
  ])('rejects incoherent OHLCV at field $field', ({ field, value }) => {
    const invalid = kline(0);
    invalid[field] = value;
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      fetch,
      () => now,
    );

    expect(() => client.normalize([invalid], request)).toThrow();
  });

  it.each([[[['invalid']]], [[kline(1), kline(0)]], [[kline(0), kline(0)]]])(
    'rejects malformed, out-of-order, and duplicate payloads',
    (payload) => {
      const client = new BinanceHistoricalCandlesClient(
        'https://data-api.binance.vision',
        fetch,
        () => now,
      );

      expect(() => client.normalize(payload, request)).toThrow();
    },
  );

  it.each([
    { ...request, limit: 0 },
    { ...request, limit: 1001 },
    { ...request, endTime: request.startTime },
    {
      ...request,
      endTime: new Date(request.startTime.getTime() + 1_001 * 60_000),
    },
  ])('rejects an invalid or excessive request', (invalidRequest) => {
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
    );

    expect(() => client.normalize([], invalidRequest)).toThrow(
      'Invalid bounded historical candle request',
    );
  });

  it('throws when Binance returns a non-success response', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(new Response(null, { status: 429 }));
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
    );

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles request failed: 429',
    );
  });
});

function kline(index: number): unknown[] {
  const openTime = Date.parse('2026-09-12T12:00:00.000Z') + index * 60_000;
  return [
    openTime,
    String(99 + index),
    String(102 + index),
    String(98 + index),
    String(100 + index),
    '1.5',
    openTime + 59_999,
    '150',
    10,
    '0.75',
    '75',
    '0',
  ];
}
