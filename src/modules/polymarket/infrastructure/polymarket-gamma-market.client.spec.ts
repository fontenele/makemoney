import { jest } from '@jest/globals';
import { PolymarketGammaMarketClient } from './polymarket-gamma-market.client';
import {
  PredictionMarketNotFoundError,
  PredictionMarketProviderDnsError,
} from '../domain/prediction-market';

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

  it('requests and verifies an exact market tag filter', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            markets: [
              {
                ...market(),
                tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
              },
            ],
            next_cursor: null,
          }),
        ),
      );
    const client = new PolymarketGammaMarketClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(
      client.listActive({ limit: 20, tagId: '2' }),
    ).resolves.toMatchObject({ markets: [{ id: '703257' }] });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/markets/keyset?closed=false&limit=20&tag_id=2&include_tag=true',
    );
  });

  it('rejects a market page without the exact requested tag', () => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(() =>
      client.normalize(
        {
          markets: [
            {
              ...market(),
              tags: [{ id: '3', label: 'Elections', slug: 'elections' }],
            },
          ],
          next_cursor: null,
        },
        '2',
      ),
    ).toThrow('Invalid Polymarket tag-filtered market payload');
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

  it.each(['ENOTFOUND', 'EAI_AGAIN'])(
    'classifies provider DNS failure %s',
    async (code) => {
      const error = new TypeError('fetch failed', {
        cause: Object.assign(new Error('dns failed'), { code }),
      });
      const http = jest
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockRejectedValue(error);

      await expect(
        new PolymarketGammaMarketClient(
          'https://gamma-api.polymarket.com',
          http,
        ).listActive({ limit: 8 }),
      ).rejects.toBeInstanceOf(PredictionMarketProviderDnsError);
    },
  );

  it('normalizes indexed YES and NO token identities', () => {
    const client = new PolymarketGammaMarketClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(client.normalizeDetails(marketDetails())).toEqual({
      provider: 'polymarket',
      id: '703257',
      slug: 'will-example-happen',
      question: 'Will the example happen?',
      conditionId:
        '0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75',
      outcomes: {
        yes: { label: 'Yes', tokenId: '111' },
        no: { label: 'No', tokenId: '222' },
      },
      receivedAt,
    });
  });

  it('retains unavailable CLOB token identities as null', () => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(
      client.normalizeDetails({ ...marketDetails(), clobTokenIds: null })
        .outcomes,
    ).toEqual({
      yes: { label: 'Yes', tokenId: null },
      no: { label: 'No', tokenId: null },
    });
  });

  it.each([
    { outcomes: '["Yes"]' },
    { outcomes: 'not-json' },
    { clobTokenIds: '["111", "invalid"]' },
    { clobTokenIds: '["111"]' },
  ])('rejects malformed outcome identity payload %#', (override) => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(() =>
      client.normalizeDetails({ ...marketDetails(), ...override }),
    ).toThrow('Invalid Polymarket outcome identity payload');
  });

  it('loads one public market detail by Gamma ID', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(marketDetails())));
    const client = new PolymarketGammaMarketClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getById('703257')).resolves.toMatchObject({
      id: '703257',
      outcomes: { yes: { tokenId: '111' }, no: { tokenId: '222' } },
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/markets/703257',
    );
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects a market detail that does not match the requested identity', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...marketDetails(), id: '703258' })),
      );

    await expect(
      new PolymarketGammaMarketClient('https://example.com', http).getById(
        '703257',
      ),
    ).rejects.toThrow('Invalid Polymarket market detail identity');
  });

  it('distinguishes an absent market from provider failure', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      new PolymarketGammaMarketClient('https://example.com', http).getById(
        '703257',
      ),
    ).rejects.toThrow(PredictionMarketNotFoundError);
  });

  it('normalizes only bounded market-tag identity', () => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(
      client.normalizeTags([
        {
          id: '2',
          label: 'Politics',
          slug: 'politics',
          forceShow: true,
          publishedAt: '2026-01-01T00:00:00Z',
        },
        { id: '9', label: null, slug: null, forceHide: false },
      ]),
    ).toEqual([
      { id: '2', label: 'Politics', slug: 'politics' },
      { id: '9', label: null, slug: null },
    ]);
  });

  it('loads tags for one unauthenticated market by Gamma ID', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ id: '2', label: 'Politics', slug: 'politics' }]),
        ),
      );
    const client = new PolymarketGammaMarketClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getTagsById('703257')).resolves.toEqual({
      provider: 'polymarket',
      marketId: '703257',
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      receivedAt,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/markets/703257/tags',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {},
    [{ id: '', label: 'Politics', slug: 'politics' }],
    [{ id: '2', label: 1, slug: 'politics' }],
    [
      { id: '2', label: 'Politics', slug: 'politics' },
      { id: '2', label: 'Duplicate', slug: 'duplicate' },
    ],
    Array.from({ length: 101 }, (_, index) => ({
      id: `${index + 1}`,
      label: `Tag ${index + 1}`,
      slug: `tag-${index + 1}`,
    })),
  ])('rejects malformed or unbounded market tags payload %#', (payload) => {
    const client = new PolymarketGammaMarketClient('https://example.com');

    expect(() => client.normalizeTags(payload)).toThrow(
      /Invalid Polymarket market tag/,
    );
  });

  it('distinguishes absent market tags from provider failure', async () => {
    const absent = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const failed = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      new PolymarketGammaMarketClient(
        'https://example.com',
        absent,
      ).getTagsById('703257'),
    ).rejects.toThrow(PredictionMarketNotFoundError);
    await expect(
      new PolymarketGammaMarketClient(
        'https://example.com',
        failed,
      ).getTagsById('703257'),
    ).rejects.toThrow('500');
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

function marketDetails() {
  return {
    ...market(),
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.085", "0.915"]',
    clobTokenIds: '["111", "222"]',
  };
}
