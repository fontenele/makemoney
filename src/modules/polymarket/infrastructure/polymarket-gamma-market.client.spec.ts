import { jest } from '@jest/globals';
import { PolymarketGammaMarketClient } from './polymarket-gamma-market.client';

describe('PolymarketGammaMarketClient', () => {
  const receivedAt = new Date('2026-09-26T12:00:00.000Z');

  it('normalizes a public active-market page', () => {
    const client = new PolymarketGammaMarketClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(
      client.normalize({
        markets: [market()],
        next_cursor: 'next_page',
      }),
    ).toEqual({
      markets: [
        {
          provider: 'polymarket',
          id: '703257',
          slug: 'will-example-happen',
          question: 'Will the example happen?',
          conditionId:
            '0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75',
          closed: false,
        },
      ],
      nextCursor: 'next_page',
      receivedAt,
    });
  });

  it('retains documented nullable market metadata', () => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(
      client.normalize({
        markets: [{ id: '1', slug: null, question: null, conditionId: null }],
        next_cursor: null,
      }).markets[0],
    ).toMatchObject({
      id: '1',
      slug: null,
      question: null,
      conditionId: null,
    });
  });

  it('rejects malformed provider data', () => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(() =>
      client.normalize({
        markets: [{ ...market(), conditionId: 'invalid' }],
        next_cursor: null,
      }),
    ).toThrow('Invalid Polymarket market payload');
    expect(() => client.normalize({ markets: [] })).toThrow(
      'Invalid Polymarket market page payload',
    );
  });

  it('loads an unauthenticated bounded keyset page', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ markets: [market()], next_cursor: null }),
        ),
      );
    const client = new PolymarketGammaMarketClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(
      client.listActive({ limit: 20, afterCursor: 'previous_page' }),
    ).resolves.toMatchObject({ markets: [{ id: '703257' }] });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/markets/keyset?closed=false&limit=20&after_cursor=previous_page',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects non-success responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 429 }));

    await expect(
      new PolymarketGammaMarketClient('https://example.com', http).listActive({
        limit: 20,
      }),
    ).rejects.toThrow('429');
  });
});

function market() {
  return {
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId:
      '0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75',
  };
}
