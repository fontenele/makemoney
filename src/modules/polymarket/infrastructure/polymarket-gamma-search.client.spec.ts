import { jest } from '@jest/globals';
import { PolymarketGammaSearchClient } from './polymarket-gamma-search.client';

describe('PolymarketGammaSearchClient', () => {
  const receivedAt = new Date('2026-09-29T23:00:00.000Z');
  const query = { query: 'bitcoin', limit: 8, page: 2 };

  it('loads and normalizes bounded active event search results', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        Response.json({
          events: [event()],
          pagination: { hasMore: true, totalResults: 853 },
        }),
      );
    const client = new PolymarketGammaSearchClient(
      'https://gamma-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.searchActiveEvents(query)).resolves.toEqual({
      query: 'bitcoin',
      page: 2,
      events: [
        {
          provider: 'polymarket',
          id: '946004',
          slug: 'bitcoin-in-september',
          title: 'What price will Bitcoin hit in September?',
          startDate: '2026-09-01T05:07:13Z',
          endDate: '2026-10-01T04:00:00Z',
          active: true,
          closed: false,
          archived: false,
          restricted: true,
        },
      ],
      hasMore: true,
      totalResults: 853,
      receivedAt,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://gamma-api.polymarket.com/public-search?q=bitcoin&events_status=active&limit_per_type=8&page=2',
    );
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {
      events: [event(), event()],
      pagination: { hasMore: false, totalResults: 2 },
    },
    {
      events: [{ ...event(), closed: true }],
      pagination: { hasMore: false, totalResults: 1 },
    },
    { events: [event()], pagination: { hasMore: 'yes', totalResults: 1 } },
    { events: [event()], pagination: { hasMore: false, totalResults: -1 } },
  ])('rejects malformed search payload %#', (payload) => {
    const client = new PolymarketGammaSearchClient('https://example.com');
    expect(() => client.normalize(payload, query)).toThrow(
      /Invalid Polymarket search/,
    );
  });

  it('rejects a response larger than the requested bound', () => {
    const client = new PolymarketGammaSearchClient('https://example.com');
    expect(() =>
      client.normalize(
        {
          events: Array.from({ length: 9 }, (_, index) => ({
            ...event(),
            id: String(index + 1),
          })),
          pagination: { hasMore: true, totalResults: 9 },
        },
        query,
      ),
    ).toThrow('Invalid Polymarket search payload');
  });

  it('normalizes the documented null event collection as an empty page', () => {
    const client = new PolymarketGammaSearchClient('https://example.com');

    expect(
      client.normalize(
        {
          events: null,
          pagination: { hasMore: false, totalResults: 0 },
        },
        query,
      ),
    ).toMatchObject({ page: 2, events: [], hasMore: false, totalResults: 0 });
  });
});

function event() {
  return {
    id: '946004',
    slug: 'bitcoin-in-september',
    title: 'What price will Bitcoin hit in September?',
    startDate: '2026-09-01T05:07:13Z',
    endDate: '2026-10-01T04:00:00Z',
    active: true,
    closed: false,
    archived: false,
    restricted: true,
  };
}
