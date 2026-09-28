import { jest } from '@jest/globals';
import { PolymarketGammaSeriesClient } from './polymarket-gamma-series.client';

describe('PolymarketGammaSeriesClient', () => {
  it('requests a deterministic bounded active-series page without events', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([seriesPayload()])));
    const receivedAt = new Date('2026-09-28T00:00:00.000Z');
    const client = new PolymarketGammaSeriesClient(
      'https://example.com/',
      http,
      () => receivedAt,
    );

    await expect(client.listActive({ limit: 20, offset: 40 })).resolves.toEqual(
      {
        provider: 'polymarket',
        series: [seriesPayload()],
        offset: 40,
        nextOffset: null,
        stablePagination: false,
        receivedAt,
      },
    );
    expect(http).toHaveBeenCalledWith(
      'https://example.com/series?limit=20&offset=40&order=id&ascending=true&closed=false&exclude_events=true',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it('applies and verifies an exact recurrence filter', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([seriesPayload()])));
    const client = new PolymarketGammaSeriesClient(
      'https://example.com/',
      http,
    );

    await expect(
      client.listActive({ limit: 20, offset: 0, recurrence: 'weekly' }),
    ).resolves.toMatchObject({ series: [seriesPayload()] });
    expect(http).toHaveBeenCalledWith(
      'https://example.com/series?limit=20&offset=0&order=id&ascending=true&closed=false&exclude_events=true&recurrence=weekly',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it('rejects a series outside the requested recurrence', () => {
    expect(() =>
      new PolymarketGammaSeriesClient('https://example.com').normalizePage(
        [seriesPayload()],
        { limit: 20, offset: 0, recurrence: 'daily' },
      ),
    ).toThrow('Invalid Polymarket series discovery payload');
  });

  it('offers the following offset only when the page is full', () => {
    const client = new PolymarketGammaSeriesClient('https://example.com');

    expect(
      client.normalizePage([seriesPayload()], { limit: 1, offset: 10 })
        .nextOffset,
    ).toBe(11);
    expect(
      client.normalizePage([seriesPayload()], { limit: 1, offset: 10_000 })
        .nextOffset,
    ).toBeNull();
  });

  it.each([
    ['non-array payload', {}],
    ['closed series', [{ ...seriesPayload(), closed: true }]],
    ['duplicate identity', [seriesPayload(), seriesPayload()]],
    [
      'oversized requested page',
      [seriesPayload(), { ...seriesPayload(), id: '2' }],
    ],
  ])('rejects discovery with %s', (_scenario, payload) => {
    expect(() =>
      new PolymarketGammaSeriesClient('https://example.com').normalizePage(
        payload,
        { limit: 1, offset: 0 },
      ),
    ).toThrow('Invalid Polymarket series discovery payload');
  });

  it('rejects a failed discovery response', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 503 }));

    await expect(
      new PolymarketGammaSeriesClient('https://example.com', http).listActive({
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow('Polymarket series discovery request failed: 503');
  });

  it('loads one selected series and verifies its identity', async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(seriesPayload())));
    const receivedAt = new Date('2026-09-27T23:30:00.000Z');
    const client = new PolymarketGammaSeriesClient(
      'https://example.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getById('1')).resolves.toEqual({
      provider: 'polymarket',
      ...seriesPayload(),
      receivedAt,
    });
    expect(http).toHaveBeenCalledWith(
      'https://example.com/series/1',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  it.each([404, 503])('rejects provider status %s', async (status) => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status }));

    await expect(
      new PolymarketGammaSeriesClient('https://example.com', http).getById('1'),
    ).rejects.toThrow(
      status === 404
        ? 'Polymarket series 1 was not found'
        : 'Polymarket series detail request failed: 503',
    );
  });

  it.each([
    ['non-object payload', []],
    ['identity divergence', { ...seriesPayload(), id: '2' }],
    ['missing slug', { ...seriesPayload(), slug: undefined }],
    ['empty title', { ...seriesPayload(), title: '' }],
    ['invalid recurrence', { ...seriesPayload(), recurrence: 7 }],
    ['invalid closed state', { ...seriesPayload(), closed: 'false' }],
  ])('rejects %s', (_scenario, payload) => {
    expect(() =>
      new PolymarketGammaSeriesClient('https://example.com').normalize(
        payload,
        '1',
      ),
    ).toThrow('Invalid Polymarket series detail payload');
  });

  it('accepts documented nullable descriptive fields', () => {
    const receivedAt = new Date('2026-09-27T23:30:00.000Z');
    const client = new PolymarketGammaSeriesClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(
      client.normalize(
        {
          ...seriesPayload(),
          slug: null,
          title: null,
          recurrence: null,
        },
        '1',
      ),
    ).toEqual({
      id: '1',
      slug: null,
      title: null,
      recurrence: null,
      closed: false,
    });
  });
});

function seriesPayload() {
  return {
    id: '1',
    slug: 'nfl',
    title: 'NFL',
    recurrence: 'weekly',
    closed: false,
  };
}
