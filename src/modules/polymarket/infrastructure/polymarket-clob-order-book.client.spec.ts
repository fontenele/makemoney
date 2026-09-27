import { jest } from '@jest/globals';
import { PredictionMarketOrderBookUnavailableError } from '../domain/prediction-market-top-of-book';
import { PolymarketClobOrderBookClient } from './polymarket-clob-order-book.client';

describe('PolymarketClobOrderBookClient', () => {
  const receivedAt = new Date('2026-09-26T20:00:00.000Z');

  it('normalizes exact top levels and spread with snapshot provenance', () => {
    const client = new PolymarketClobOrderBookClient(
      'https://clob.polymarket.com',
      jest.fn(),
      () => receivedAt,
    );

    expect(client.normalize('111', book())).toEqual({
      provider: 'polymarket',
      tokenId: '111',
      conditionId: '0xcondition',
      snapshotHash: '0xhash',
      bid: { price: '0.45', quantity: '100.00' },
      ask: { price: '0.460', quantity: '150' },
      spread: '0.01',
      source: 'clob-order-book',
      executable: false,
      providerTimestamp: '1758920000123',
      receivedAt,
    });
  });

  it.each([
    { bids: [], asks: [] },
    { bids: [], asks: [{ price: '0.46', size: '150' }] },
    { bids: [{ price: '0.45', size: '100' }], asks: [] },
  ])('represents missing liquidity explicitly %#', ({ bids, asks }) => {
    const result = new PolymarketClobOrderBookClient(
      'https://clob.polymarket.com',
    ).normalize('111', { ...book(), bids, asks });

    expect(result.bid).toEqual(
      bids.length === 0 ? null : { price: '0.45', quantity: '100' },
    );
    expect(result.ask).toEqual(
      asks.length === 0 ? null : { price: '0.46', quantity: '150' },
    );
    expect(result.spread).toBeNull();
  });

  it.each([
    { asset_id: '222' },
    { market: '' },
    { hash: null },
    { timestamp: '01' },
    { bids: null },
    { asks: null },
  ])('rejects malformed snapshot identity or metadata %#', (override) => {
    expect(() =>
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
      ).normalize('111', { ...book(), ...override }),
    ).toThrow('Invalid Polymarket order-book payload');
  });

  it.each([
    { price: 0.45, size: '100' },
    { price: '.45', size: '100' },
    { price: '1.01', size: '100' },
    { price: '0.45', size: 100 },
    { price: '0.45', size: '0' },
    { price: '0.45', size: '-1' },
  ])('rejects malformed book level %#', (level) => {
    expect(() =>
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
      ).normalize('111', { ...book(), bids: [level] }),
    ).toThrow('Invalid Polymarket order-book level');
  });

  it('rejects levels that violate documented provider ordering', () => {
    expect(() =>
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
      ).normalize('111', {
        ...book(),
        bids: [
          { price: '0.44', size: '100' },
          { price: '0.45', size: '200' },
        ],
      }),
    ).toThrow('Invalid Polymarket order-book ordering');
  });

  it('rejects a crossed top of book', () => {
    expect(() =>
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
      ).normalize('111', {
        ...book(),
        bids: [{ price: '0.47', size: '100' }],
        asks: [{ price: '0.46', size: '150' }],
      }),
    ).toThrow('Invalid Polymarket crossed order book');
  });

  it('loads a public order book by token without credentials', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(book())));
    const client = new PolymarketClobOrderBookClient(
      'https://clob.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getTopOfBook('111')).resolves.toMatchObject({
      tokenId: '111',
      spread: '0.01',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://clob.polymarket.com/book?token_id=111',
    );
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid token identity %s before HTTP',
    async (tokenId) => {
      const http =
        jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
      await expect(
        new PolymarketClobOrderBookClient(
          'https://clob.polymarket.com',
          http,
        ).getTopOfBook(tokenId),
      ).rejects.toThrow('Invalid Polymarket token identity');
      expect(http).not.toHaveBeenCalled();
    },
  );

  it.each([400, 404])('maps unavailable provider status %s', async (status) => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status }));

    await expect(
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
        http,
      ).getTopOfBook('111'),
    ).rejects.toThrow(PredictionMarketOrderBookUnavailableError);
  });

  it('rejects other unsuccessful provider responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      new PolymarketClobOrderBookClient(
        'https://clob.polymarket.com',
        http,
      ).getTopOfBook('111'),
    ).rejects.toThrow('Polymarket order-book request failed: 500');
  });
});

function book() {
  return {
    market: '0xcondition',
    asset_id: '111',
    timestamp: '1758920000123',
    hash: '0xhash',
    bids: [
      { price: '0.45', size: '100.00' },
      { price: '0.44', size: '200' },
    ],
    asks: [
      { price: '0.460', size: '150' },
      { price: '0.47', size: '250' },
    ],
  };
}
