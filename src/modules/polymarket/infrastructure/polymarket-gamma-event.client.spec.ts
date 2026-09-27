import { jest } from '@jest/globals';
import { PredictionEventNotFoundError } from '../domain/prediction-event';
import { PolymarketGammaEventClient } from './polymarket-gamma-event.client';

describe('PolymarketGammaEventClient', () => {
  const receivedAt = new Date('2026-09-27T20:00:00.000Z');

  it('normalizes a bounded active-event page without nested provider relations', () => {
    const client = new PolymarketGammaEventClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(
      client.normalizePage({
        events: [eventPayload()],
        next_cursor: 'next-page',
      }),
    ).toEqual({
      events: [
        {
          provider: 'polymarket',
          id: '1000',
          slug: 'example-event',
          title: 'Example event',
          startDate: '2026-09-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
          active: true,
          closed: false,
          archived: false,
          restricted: false,
        },
      ],
      nextCursor: 'next-page',
      receivedAt,
    });
  });

  it('normalizes an omitted final-page cursor to null', () => {
    const client = new PolymarketGammaEventClient('https://example.com');

    expect(client.normalizePage({ events: [] })).toMatchObject({
      events: [],
      nextCursor: null,
    });
  });

  it('loads active events with bounded keyset pagination', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ events: [], next_cursor: null })),
      );
    const client = new PolymarketGammaEventClient(
      'https://gamma-api.polymarket.com/',
      http,
    );

    await client.listActive({ limit: 50, afterCursor: 'page_2-cursor' });

    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/events/keyset?closed=false&limit=50&after_cursor=page_2-cursor',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {},
    { events: 'invalid', next_cursor: null },
    { events: [], next_cursor: '' },
    { events: [{ ...eventPayload(), closed: true }], next_cursor: null },
    { events: [{ ...eventPayload(), title: '' }], next_cursor: null },
  ])('rejects malformed event-page payload %#', (payload) => {
    const client = new PolymarketGammaEventClient('https://example.com');

    expect(() => client.normalizePage(payload)).toThrow(/Invalid Polymarket/);
  });

  it('rejects unsuccessful event discovery', async () => {
    const http = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      new PolymarketGammaEventClient('https://example.com', http).listActive({
        limit: 20,
      }),
    ).rejects.toThrow('503');
  });

  it('normalizes only bounded event-tag identity', () => {
    const client = new PolymarketGammaEventClient('https://example.com');

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

  it('loads tags for one unauthenticated event by Gamma ID', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ id: '2', label: 'Politics', slug: 'politics' }]),
        ),
      );
    const client = new PolymarketGammaEventClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getTagsById('1000')).resolves.toEqual({
      provider: 'polymarket',
      eventId: '1000',
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      receivedAt,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/events/1000/tags',
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
  ])('rejects malformed or unbounded event tags payload %#', (payload) => {
    const client = new PolymarketGammaEventClient('https://example.com');

    expect(() => client.normalizeTags(payload)).toThrow(
      /Invalid Polymarket event tag/,
    );
  });

  it('distinguishes absent event tags from provider failure', async () => {
    const absent = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const failed = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      new PolymarketGammaEventClient('https://example.com', absent).getTagsById(
        '1000',
      ),
    ).rejects.toThrow(PredictionEventNotFoundError);
    await expect(
      new PolymarketGammaEventClient('https://example.com', failed).getTagsById(
        '1000',
      ),
    ).rejects.toThrow('500');
  });

  it('normalizes selected-event identity, lifecycle, rules, and market references', () => {
    const client = new PolymarketGammaEventClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(client.normalize(eventPayload())).toEqual({
      provider: 'polymarket',
      id: '1000',
      slug: 'example-event',
      title: 'Example event',
      description: 'An event grouping two binary markets.',
      resolutionSource: 'Official example source',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      active: true,
      closed: false,
      archived: false,
      restricted: false,
      markets: [
        {
          id: '703257',
          slug: 'will-example-happen',
          question: 'Will the example happen?',
          conditionId: conditionId(),
          closed: false,
        },
      ],
      receivedAt,
    });
  });

  it('retains documented nullable descriptive fields and an empty market group', () => {
    const client = new PolymarketGammaEventClient('https://example.com');

    expect(
      client.normalize({
        ...eventPayload(),
        slug: null,
        description: null,
        resolutionSource: null,
        startDate: null,
        endDate: null,
        markets: [],
      }),
    ).toMatchObject({
      slug: null,
      description: null,
      resolutionSource: null,
      startDate: null,
      endDate: null,
      markets: [],
    });
  });

  it('loads one unauthenticated event by Gamma ID', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(eventPayload())));
    const client = new PolymarketGammaEventClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getById('1000')).resolves.toMatchObject({ id: '1000' });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/events/1000',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {},
    { ...eventPayload(), title: '' },
    { ...eventPayload(), active: 'true' },
    { ...eventPayload(), startDate: 'not-a-date' },
    { ...eventPayload(), markets: 'invalid' },
    {
      ...eventPayload(),
      markets: [{ ...marketPayload(), conditionId: 'invalid' }],
    },
    { ...eventPayload(), markets: [{ ...marketPayload(), closed: null }] },
  ])('rejects malformed provider payload %#', (payload) => {
    const client = new PolymarketGammaEventClient('https://example.com');

    expect(() => client.normalize(payload)).toThrow(/Invalid Polymarket event/);
  });

  it('rejects a response with a different event identity', async () => {
    const http = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...eventPayload(), id: '1001' })),
      );

    await expect(
      new PolymarketGammaEventClient('https://example.com', http).getById(
        '1000',
      ),
    ).rejects.toThrow('Invalid Polymarket event identity');
  });

  it('distinguishes absence from provider failure', async () => {
    const absent = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const failed = jest
      .fn<(input: string) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      new PolymarketGammaEventClient('https://example.com', absent).getById(
        '1000',
      ),
    ).rejects.toThrow(PredictionEventNotFoundError);
    await expect(
      new PolymarketGammaEventClient('https://example.com', failed).getById(
        '1000',
      ),
    ).rejects.toThrow('500');
  });
});

function eventPayload() {
  return {
    id: '1000',
    slug: 'example-event',
    title: 'Example event',
    description: 'An event grouping two binary markets.',
    resolutionSource: 'Official example source',
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    active: true,
    closed: false,
    archived: false,
    restricted: false,
    markets: [marketPayload()],
  };
}

function marketPayload() {
  return {
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId: conditionId(),
    closed: false,
  };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
