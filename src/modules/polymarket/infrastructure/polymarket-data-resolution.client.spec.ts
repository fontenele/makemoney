import { jest } from '@jest/globals';
import { PredictionMarketResolutionUnavailableError } from '../domain/prediction-market-resolution';
import { PolymarketDataResolutionClient } from './polymarket-data-resolution.client';

describe('PolymarketDataResolutionClient', () => {
  const receivedAt = new Date('2026-09-27T18:00:00.000Z');

  it('normalizes the documented condition-grain resolution state', () => {
    const client = new PolymarketDataResolutionClient(
      'https://example.com',
      fetch,
      () => receivedAt,
    );

    expect(client.normalize(conditionId(), payload())).toEqual({
      provider: 'polymarket',
      conditionId: conditionId(),
      status: 'resolved',
      extendedReview: false,
      wasDisputed: true,
      wasArbitrated: false,
      resolvedAt: '2026-09-27T17:00:00Z',
      source: 'data-api-resolution',
      receivedAt,
      payouts: ['0', '1'],
    });
  });

  it('loads one unauthenticated condition selector with a timeout signal', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(payload())));
    const client = new PolymarketDataResolutionClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getResolution(conditionId())).resolves.toMatchObject({
      conditionId: conditionId(),
      status: 'resolved',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      `https://data-api.polymarket.com/v2/resolutions?condition=${conditionId()}`,
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('maps a documented empty result to explicit unavailability', () => {
    const client = new PolymarketDataResolutionClient('https://example.com');

    expect(() => client.normalize(conditionId(), { data: [] })).toThrow(
      PredictionMarketResolutionUnavailableError,
    );
  });

  it.each([
    [
      [1, 0],
      ['1', '0'],
    ],
    [
      [0, 1],
      ['0', '1'],
    ],
    [
      [0.5, 0.5],
      ['0.5', '0.5'],
    ],
  ])(
    'preserves a bounded numeric payout vector %j internally',
    (payouts, expected) => {
      const client = new PolymarketDataResolutionClient('https://example.com');

      expect(
        client.normalize(conditionId(), {
          data: [{ ...row(), payouts }],
        }).payouts,
      ).toEqual(expected);
    },
  );

  it.each([undefined, [], [Number.NaN], [-1, 2], ['1', '0']])(
    'marks unusable payout data %j as unavailable without hiding lifecycle state',
    (payouts) => {
      const client = new PolymarketDataResolutionClient('https://example.com');

      expect(
        client.normalize(conditionId(), {
          data: [{ ...row(), payouts }],
        }),
      ).toMatchObject({ status: 'resolved', payouts: null });
    },
  );

  it.each([
    {},
    { data: 'invalid' },
    { data: [row(), row()] },
    { data: [{ ...row(), condition_id: `0x${'b'.repeat(64)}` }] },
    { data: [{ ...row(), status: '' }] },
    { data: [{ ...row(), extended_review: 'false' }] },
    { data: [{ ...row(), was_disputed: null }] },
    { data: [{ ...row(), resolved_at: '' }] },
  ])('rejects malformed or incoherent payload %#', (value) => {
    const client = new PolymarketDataResolutionClient('https://example.com');

    expect(() => client.normalize(conditionId(), value)).toThrow(
      'Invalid Polymarket resolution payload',
    );
  });

  it('rejects non-success responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 429 }));

    await expect(
      new PolymarketDataResolutionClient(
        'https://example.com',
        http,
      ).getResolution(conditionId()),
    ).rejects.toThrow('429');
  });

  it('rejects an invalid condition identity before HTTP', async () => {
    const http = jest.fn<(input: string) => Promise<Response>>();

    await expect(
      new PolymarketDataResolutionClient(
        'https://example.com',
        http,
      ).getResolution('invalid'),
    ).rejects.toThrow('Invalid Polymarket condition identity');
    expect(http).not.toHaveBeenCalled();
  });
});

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}

function payload() {
  return { data: [row()] };
}

function row() {
  return {
    condition_id: conditionId(),
    status: 'resolved',
    extended_review: false,
    was_disputed: true,
    was_arbitrated: false,
    resolved_at: '2026-09-27T17:00:00Z',
    payouts: [0, 1],
  };
}
