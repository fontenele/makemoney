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

  it('loads a bounded range across multiple Binance pages', async () => {
    const pagedRequest: HistoricalCandleRequest = {
      ...request,
      endTime: new Date(request.startTime.getTime() + 1_000 * 60_000),
      limit: 1_001,
    };
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            Array.from({ length: 1_000 }, (_, index) => kline(index)),
          ),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([kline(1_000)]), { status: 200 }),
      );
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => new Date(pagedRequest.endTime.getTime() + 60_000),
    );

    const candles = await client.load(pagedRequest);

    expect(candles).toHaveLength(1_001);
    expect(candles[0]?.openTime).toEqual(pagedRequest.startTime);
    expect(candles.at(-1)?.openTime).toEqual(pagedRequest.endTime);
    expect(httpClient).toHaveBeenCalledTimes(2);
    expect(httpClient.mock.calls[0]?.[0]).toContain('limit=1000');
    expect(httpClient.mock.calls[1]?.[0]).toContain(
      `startTime=${pagedRequest.endTime.getTime()}`,
    );
    expect(httpClient.mock.calls[1]?.[0]).toContain('limit=1');
  });

  it('stops pagination when Binance returns an empty page', async () => {
    const pagedRequest: HistoricalCandleRequest = {
      ...request,
      endTime: new Date(request.startTime.getTime() + 1_000 * 60_000),
      limit: 1_001,
    };
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => new Date(pagedRequest.endTime.getTime() + 60_000),
    );

    await expect(client.load(pagedRequest)).resolves.toHaveLength(0);
    expect(httpClient).toHaveBeenCalledTimes(1);
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
    { ...request, limit: 10_001 },
    {
      ...request,
      endTime: new Date(request.startTime.getTime() - 1),
    },
    {
      ...request,
      endTime: new Date(request.startTime.getTime() + 10_001 * 60_000),
    },
  ])('rejects an invalid or excessive request', (invalidRequest) => {
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
    );

    expect(() => client.normalize([], invalidRequest)).toThrow(
      'Invalid bounded historical candle request',
    );
  });

  it('retries network failures with bounded exponential delays', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient
      .mockRejectedValueOnce(new TypeError('network unavailable'))
      .mockRejectedValueOnce(new TypeError('network unavailable'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([kline(0)]), { status: 200 }),
      );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    await expect(client.load(request)).resolves.toHaveLength(1);
    expect(httpClient).toHaveBeenCalledTimes(3);
    expect(sleeper.mock.calls).toEqual([
      [500, undefined],
      [1_000, undefined],
    ]);
  });

  it('honors Retry-After for rate limiting with a safe delay cap', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '60' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([kline(0)]), { status: 200 }),
      );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    await expect(client.load(request)).resolves.toHaveLength(1);
    expect(sleeper).toHaveBeenCalledWith(30_000, undefined);
  });

  it('fails after three transient HTTP attempts', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles request failed: 503',
    );
    expect(httpClient).toHaveBeenCalledTimes(3);
    expect(sleeper.mock.calls).toEqual([
      [500, undefined],
      [1_000, undefined],
    ]);
  });

  it('opens after three exhausted pages and closes after a successful probe', async () => {
    let currentTime = now;
    let providerAvailable = false;
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockImplementation(() =>
      Promise.resolve(
        providerAvailable
          ? new Response(JSON.stringify([kline(0)]), { status: 200 })
          : new Response(null, { status: 503 }),
      ),
    );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => currentTime,
      sleeper,
    );

    for (let failure = 0; failure < 3; failure += 1) {
      await expect(client.load(request)).rejects.toThrow(
        'Binance historical candles request failed: 503',
      );
    }
    expect(httpClient).toHaveBeenCalledTimes(9);

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles circuit is open',
    );
    expect(httpClient).toHaveBeenCalledTimes(9);

    currentTime = new Date(now.getTime() + 30_000);
    providerAvailable = true;
    await expect(client.load(request)).resolves.toHaveLength(1);
    await expect(client.load(request)).resolves.toHaveLength(1);
    expect(httpClient).toHaveBeenCalledTimes(11);
  });

  it('allows only one concurrent half-open probe', async () => {
    let currentTime = now;
    let resolveProbe: ((response: Response) => void) | undefined;
    let probePending = false;
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockImplementation(() => {
      if (probePending) {
        return new Promise<Response>((resolve) => {
          resolveProbe = resolve;
        });
      }
      return Promise.resolve(new Response(null, { status: 503 }));
    });
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => currentTime,
      sleeper,
    );

    for (let failure = 0; failure < 3; failure += 1) {
      await expect(client.load(request)).rejects.toThrow();
    }
    currentTime = new Date(now.getTime() + 30_000);
    probePending = true;
    const probe = client.load(request);

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles circuit is open',
    );
    resolveProbe?.(new Response(JSON.stringify([kline(0)]), { status: 200 }));
    await expect(probe).resolves.toHaveLength(1);
  });

  it('reopens the circuit when the half-open probe exhausts retries', async () => {
    let currentTime = now;
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    sleeper.mockResolvedValue();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => currentTime,
      sleeper,
    );

    for (let failure = 0; failure < 3; failure += 1) {
      await expect(client.load(request)).rejects.toThrow();
    }
    currentTime = new Date(now.getTime() + 30_000);
    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles request failed: 503',
    );
    expect(httpClient).toHaveBeenCalledTimes(12);

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles circuit is open',
    );
    expect(httpClient).toHaveBeenCalledTimes(12);
  });

  it('does not count permanent responses or invalid payloads toward the circuit', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([['invalid']]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([['invalid']]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([['invalid']]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([kline(0)]), { status: 200 }),
      );
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    for (let failure = 0; failure < 6; failure += 1) {
      await expect(client.load(request)).rejects.toThrow();
    }
    await expect(client.load(request)).resolves.toHaveLength(1);
    expect(httpClient).toHaveBeenCalledTimes(7);
    expect(sleeper).not.toHaveBeenCalled();
  });

  it('propagates caller cancellation during a retry delay', async () => {
    const controller = new AbortController();
    const cancellation = new Error('cancelled');
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockRejectedValue(new TypeError('network unavailable'));
    const sleeper = jest.fn(
      (delayMs: number, signal?: AbortSignal): Promise<void> => {
        void delayMs;
        void signal;
        controller.abort(cancellation);
        return Promise.reject(cancellation);
      },
    );
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    await expect(client.load(request, controller.signal)).rejects.toBe(
      cancellation,
    );
    expect(httpClient).toHaveBeenCalledTimes(1);
    expect(sleeper).toHaveBeenCalledWith(500, controller.signal);
  });

  it('does not retry a permanent client response', async () => {
    const httpClient =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    httpClient.mockResolvedValue(new Response(null, { status: 400 }));
    const sleeper =
      jest.fn<(delayMs: number, signal?: AbortSignal) => Promise<void>>();
    const client = new BinanceHistoricalCandlesClient(
      'https://data-api.binance.vision',
      httpClient,
      () => now,
      sleeper,
    );

    await expect(client.load(request)).rejects.toThrow(
      'Binance historical candles request failed: 400',
    );
    expect(httpClient).toHaveBeenCalledTimes(1);
    expect(sleeper).not.toHaveBeenCalled();
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
