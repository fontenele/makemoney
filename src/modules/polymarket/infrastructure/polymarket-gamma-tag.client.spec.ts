import { jest } from '@jest/globals';
import { PolymarketGammaTagClient } from './polymarket-gamma-tag.client';

describe('PolymarketGammaTagClient', () => {
  it('requests a deterministic bounded catalog page', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ id: '2', label: 'Politics', slug: 'politics' }]),
        ),
      );
    const receivedAt = new Date('2026-09-27T21:00:00.000Z');
    const client = new PolymarketGammaTagClient(
      'https://example.com/',
      http,
      () => receivedAt,
    );

    await expect(client.list({ limit: 20, offset: 40 })).resolves.toEqual({
      provider: 'polymarket',
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      offset: 40,
      nextOffset: null,
      stablePagination: false,
      receivedAt,
    });
    expect(http).toHaveBeenCalledWith(
      'https://example.com/tags?limit=20&offset=40&order=id&ascending=true',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it('offers the following offset only when the page is full', () => {
    const client = new PolymarketGammaTagClient('https://example.com');

    expect(
      client.normalize(
        [
          { id: '2', label: 'Politics', slug: 'politics' },
          { id: '3', label: null, slug: null },
        ],
        { limit: 2, offset: 10 },
      ).nextOffset,
    ).toBe(12);
    expect(
      client.normalize(
        [
          { id: '2', label: 'Politics', slug: 'politics' },
          { id: '3', label: null, slug: null },
        ],
        { limit: 2, offset: 10_000 },
      ).nextOffset,
    ).toBeNull();
  });

  it('loads one selected tag and verifies its identity', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ id: '2', label: 'Politics', slug: 'politics' }),
        ),
      );
    const receivedAt = new Date('2026-09-27T22:00:00.000Z');
    const client = new PolymarketGammaTagClient(
      'https://example.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getById('2')).resolves.toEqual({
      provider: 'polymarket',
      id: '2',
      label: 'Politics',
      slug: 'politics',
      receivedAt,
    });
    expect(http).toHaveBeenCalledWith(
      'https://example.com/tags/2',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it('rejects selected-tag identity divergence', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: '3', label: null, slug: null })),
      );

    await expect(
      new PolymarketGammaTagClient('https://example.com', http).getById('2'),
    ).rejects.toThrow('Invalid Polymarket tag detail identity');
  });

  it.each([404, 503])(
    'rejects selected-tag provider status %s',
    async (status) => {
      const http = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('', { status }));

      await expect(
        new PolymarketGammaTagClient('https://example.com', http).getById('2'),
      ).rejects.toThrow(
        status === 404
          ? 'Polymarket tag 2 was not found'
          : 'Polymarket tag detail request failed: 503',
      );
    },
  );

  it('loads a bounded related-tag collection', async () => {
    const http = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: '3', label: 'Elections', slug: 'elections' },
          { id: '4', label: null, slug: 'government' },
        ]),
      ),
    );
    const receivedAt = new Date('2026-09-27T23:00:00.000Z');
    const client = new PolymarketGammaTagClient(
      'https://example.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getRelatedById('2')).resolves.toEqual({
      provider: 'polymarket',
      tagId: '2',
      tags: [
        { id: '3', label: 'Elections', slug: 'elections' },
        { id: '4', label: null, slug: 'government' },
      ],
      receivedAt,
    });
    expect(http).toHaveBeenCalledWith(
      'https://example.com/tags/2/related-tags/tags',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it.each([
    ['non-array payload', {}],
    [
      'duplicate identity',
      [
        { id: '3', label: null, slug: null },
        { id: '3', label: null, slug: null },
      ],
    ],
    ['source identity', [{ id: '2', label: null, slug: null }]],
    [
      'oversized collection',
      Array.from({ length: 101 }, (_, index) => ({
        id: `${index + 3}`,
        label: null,
        slug: null,
      })),
    ],
  ])('rejects related tags with %s', (_scenario, payload) => {
    expect(() =>
      new PolymarketGammaTagClient('https://example.com').normalizeRelated(
        '2',
        payload,
      ),
    ).toThrow('Invalid Polymarket related-tag payload');
  });

  it.each([404, 503])(
    'rejects related-tag provider status %s',
    async (status) => {
      const http = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('', { status }));

      await expect(
        new PolymarketGammaTagClient(
          'https://example.com',
          http,
        ).getRelatedById('2'),
      ).rejects.toThrow(
        status === 404
          ? 'Polymarket tag 2 was not found'
          : 'Polymarket related-tag request failed: 503',
      );
    },
  );

  it.each([
    ['non-array payload', {}],
    ['missing identity', [{ label: 'Politics', slug: 'politics' }]],
    [
      'duplicate identity',
      [
        { id: '2', label: null, slug: null },
        { id: '2', label: null, slug: null },
      ],
    ],
    [
      'oversized page',
      Array.from({ length: 3 }, (_, index) => ({
        id: `${index + 1}`,
        label: null,
        slug: null,
      })),
    ],
  ])('rejects %s', (_scenario, payload) => {
    const client = new PolymarketGammaTagClient('https://example.com');

    expect(() => client.normalize(payload, { limit: 2, offset: 0 })).toThrow();
  });

  it('rejects a failed provider response', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 503 }));

    await expect(
      new PolymarketGammaTagClient('https://example.com', http).list({
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow('Polymarket tag catalog request failed: 503');
  });
});
