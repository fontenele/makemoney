import { jest } from '@jest/globals';
import { BinanceListingMarketObservationClient } from './binance-listing-market-observation.client';

describe('BinanceListingMarketObservationClient', () => {
  const receivedAt = new Date('2026-09-14T12:05:00.100Z');
  const request = { provider: 'binance' as const, symbol: 'NEWUSDT' };

  it('normalizes the public rolling ticker without converting decimals', () => {
    const client = new BinanceListingMarketObservationClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(client.normalize(payload(), request)).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      lastPrice: '0.00001000',
      baseVolume: '1200000.50000000',
      quoteVolume: '12.34567890',
      tradeCount: 42,
      windowOpenTime: new Date('2026-09-13T12:05:00.000Z'),
      windowCloseTime: new Date('2026-09-14T12:05:00.000Z'),
      receivedAt,
    });
  });

  it('loads one symbol from the unauthenticated public endpoint', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(payload())));
    const client = new BinanceListingMarketObservationClient(
      'https://data-api.binance.vision/',
      http,
      () => receivedAt,
    );

    await expect(client.load(request)).resolves.toMatchObject({
      symbol: 'NEWUSDT',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=NEWUSDT',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('composes a caller cancellation signal with the timeout', async () => {
    const controller = new AbortController();
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((_input, init) => {
        expect(init?.signal).not.toBe(controller.signal);
        expect(init?.signal?.aborted).toBe(false);
        controller.abort();
        expect(init?.signal?.aborted).toBe(true);
        return Promise.reject(new DOMException('aborted', 'AbortError'));
      });

    await expect(
      new BinanceListingMarketObservationClient(
        'https://example.com',
        http,
      ).load(request, controller.signal),
    ).rejects.toThrow('aborted');
  });

  it('rejects invalid requests before network access', async () => {
    const http = jest.fn<typeof fetch>();
    await expect(
      new BinanceListingMarketObservationClient(
        'https://example.com',
        http,
      ).load({ provider: 'binance', symbol: 'new/usdt' }),
    ).rejects.toThrow('Invalid Binance listing market observation request');
    expect(http).not.toHaveBeenCalled();
  });

  it('rejects non-success responses without exposing a response body', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response('{"secret":"provider detail"}', { status: 429 }),
      );

    await expect(
      new BinanceListingMarketObservationClient(
        'https://example.com',
        http,
      ).load(request),
    ).rejects.toThrow('Binance 24-hour ticker request failed: 429');
  });

  it.each([
    null,
    [],
    { ...payload(), symbol: 'OTHERUSDT' },
    { ...payload(), lastPrice: 1 },
    { ...payload(), volume: null },
    { ...payload(), quoteVolume: 12 },
    { ...payload(), openTime: -1 },
    { ...payload(), closeTime: 1.5 },
    { ...payload(), count: -1 },
    { ...payload(), count: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed payload %#', (value) => {
    expect(() =>
      new BinanceListingMarketObservationClient(
        'https://example.com',
      ).normalize(value, request),
    ).toThrow('Invalid Binance 24-hour ticker payload');
  });

  it.each([
    { ...payload(), lastPrice: '0' },
    { ...payload(), volume: '-1' },
    { ...payload(), quoteVolume: '1e3' },
    { ...payload(), openTime: payload().closeTime + 1 },
  ])('rejects payload that violates domain invariants %#', (value) => {
    expect(() =>
      new BinanceListingMarketObservationClient(
        'https://example.com',
      ).normalize(value, request),
    ).toThrow('Listing market observation');
  });
});

function payload() {
  return {
    symbol: 'NEWUSDT',
    lastPrice: '0.00001000',
    volume: '1200000.50000000',
    quoteVolume: '12.34567890',
    openTime: Date.parse('2026-09-13T12:05:00.000Z'),
    closeTime: Date.parse('2026-09-14T12:05:00.000Z'),
    count: 42,
  };
}
