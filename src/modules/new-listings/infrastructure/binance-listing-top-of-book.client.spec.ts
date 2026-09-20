import { jest } from '@jest/globals';
import { BinanceListingTopOfBookClient } from './binance-listing-top-of-book.client';

describe('BinanceListingTopOfBookClient', () => {
  const receivedAt = new Date('2026-09-20T03:00:00.100Z');
  const request = { provider: 'binance' as const, symbol: 'NEWUSDT' };

  it('normalizes only the best level without converting decimals', () => {
    const client = new BinanceListingTopOfBookClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(client.normalize(payload(), request)).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      updateId: '123456789',
      bidPrice: '9.99000000',
      bidQuantity: '1000.50000000',
      askPrice: '10.01000000',
      askQuantity: '900.25000000',
      receivedAt,
    });
  });

  it('loads one symbol from the unauthenticated public depth endpoint', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(payload())));
    const client = new BinanceListingTopOfBookClient(
      'https://data-api.binance.vision/',
      http,
      () => receivedAt,
    );

    await expect(client.load(request)).resolves.toMatchObject({
      symbol: 'NEWUSDT',
      updateId: '123456789',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.binance.vision/api/v3/depth?symbol=NEWUSDT&limit=5',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('composes caller cancellation with the request timeout', async () => {
    const controller = new AbortController();
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((_input, init) => {
        expect(init?.signal).not.toBe(controller.signal);
        controller.abort();
        expect(init?.signal?.aborted).toBe(true);
        return Promise.reject(new DOMException('aborted', 'AbortError'));
      });

    await expect(
      new BinanceListingTopOfBookClient('https://example.com', http).load(
        request,
        controller.signal,
      ),
    ).rejects.toThrow('aborted');
  });

  it('rejects invalid requests before network access', async () => {
    const http = jest.fn<typeof fetch>();
    await expect(
      new BinanceListingTopOfBookClient('https://example.com', http).load({
        provider: 'binance',
        symbol: 'new/usdt',
      }),
    ).rejects.toThrow('Invalid Binance listing top-of-book request');
    expect(http).not.toHaveBeenCalled();
  });

  it('rejects non-success responses without exposing a response body', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response('{"secret":"provider detail"}', { status: 429 }),
      );

    await expect(
      new BinanceListingTopOfBookClient('https://example.com', http).load(
        request,
      ),
    ).rejects.toThrow('Binance depth snapshot request failed: 429');
  });

  it.each([
    null,
    [],
    { ...payload(), lastUpdateId: -1 },
    { ...payload(), lastUpdateId: 1.5 },
    { ...payload(), bids: null },
    { ...payload(), bids: [] },
    { ...payload(), bids: [['9.99']] },
    { ...payload(), asks: [] },
    { ...payload(), asks: [[10.01, '1']] },
  ])('rejects malformed payload %#', (value) => {
    expect(() =>
      new BinanceListingTopOfBookClient('https://example.com').normalize(
        value,
        request,
      ),
    ).toThrow('Invalid Binance depth snapshot payload');
  });

  it.each([
    { ...payload(), bids: [['0', '1']] },
    { ...payload(), bids: [['9.99', '-1']] },
    { ...payload(), asks: [['9.98', '1']] },
  ])('rejects payload that violates domain invariants %#', (value) => {
    expect(() =>
      new BinanceListingTopOfBookClient('https://example.com').normalize(
        value,
        request,
      ),
    ).toThrow('Listing top-of-book');
  });
});

function payload() {
  return {
    lastUpdateId: 123456789,
    bids: [
      ['9.99000000', '1000.50000000'],
      ['9.98000000', '2000.00000000'],
    ],
    asks: [
      ['10.01000000', '900.25000000'],
      ['10.02000000', '1500.00000000'],
    ],
  };
}
