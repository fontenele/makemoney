import { jest } from '@jest/globals';
import { PredictionMarketOpenInterestUnavailableError } from '../domain/prediction-market-open-interest';
import { PolymarketDataOpenInterestClient } from './polymarket-data-open-interest.client';

describe('PolymarketDataOpenInterestClient', () => {
  it('requests and normalizes one condition open-interest value', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    http.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ condition_id: conditionId(), value: 7113116.142022 }],
        }),
        { status: 200 },
      ),
    );
    const receivedAt = new Date('2026-09-28T04:00:00.000Z');
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getOpenInterest(conditionId())).resolves.toEqual({
      provider: 'polymarket',
      conditionId: conditionId(),
      openInterestUsdc: '7113116.142022',
      source: 'data-api-open-interest',
      receivedAt,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      `https://data-api.polymarket.com/v2/oi?condition=${conditionId()}`,
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
  });

  it('accepts zero and a provider decimal string without native arithmetic', () => {
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com',
      fetch,
      () => new Date('2026-09-28T04:00:00.000Z'),
    );

    expect(
      client.normalize(conditionId(), {
        data: [{ condition_id: conditionId(), value: '0.00000001' }],
      }).openInterestUsdc,
    ).toBe('0.00000001');
  });

  it('maps an empty documented result to explicit unavailability', () => {
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com',
    );

    expect(() => client.normalize(conditionId(), { data: [] })).toThrow(
      PredictionMarketOpenInterestUnavailableError,
    );
  });

  it('requests and normalizes the global open-interest row', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    http.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ condition_id: null, value: 356037494.1056115 }],
        }),
        { status: 200 },
      ),
    );
    const receivedAt = new Date('2026-09-28T06:00:00.000Z');
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getGlobalOpenInterest()).resolves.toEqual({
      provider: 'polymarket',
      openInterestUsdc: '356037494.1056115',
      source: 'data-api-open-interest',
      receivedAt,
      executable: false,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.polymarket.com/v2/oi',
    );
  });

  it.each([
    { data: [] },
    { data: [{ condition_id: conditionId(), value: 1 }] },
    { data: [{ condition_id: null, value: -1 }] },
    {
      data: [
        { condition_id: null, value: 1 },
        { condition_id: null, value: 2 },
      ],
    },
  ])('rejects malformed global open-interest payload %#', async (payload) => {
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com',
      () => Promise.resolve(Response.json(payload)),
    );

    await expect(client.getGlobalOpenInterest()).rejects.toThrow(
      'Invalid Polymarket open-interest payload',
    );
  });

  it.each([
    {},
    { data: 'invalid' },
    { data: [{ condition_id: conditionId(), value: -1 }] },
    { data: [{ condition_id: conditionId(), value: '1e3' }] },
    { data: [{ condition_id: `0x${'b'.repeat(64)}`, value: 1 }] },
    {
      data: [
        { condition_id: conditionId(), value: 1 },
        { condition_id: conditionId(), value: 2 },
      ],
    },
  ])('rejects malformed or incoherent payload %#', (payload) => {
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com',
    );

    expect(() => client.normalize(conditionId(), payload)).toThrow(
      'Invalid Polymarket open-interest payload',
    );
  });

  it('rejects an invalid requested condition before HTTP', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    const client = new PolymarketDataOpenInterestClient(
      'https://data-api.polymarket.com',
      http,
    );

    await expect(client.getOpenInterest('invalid')).rejects.toThrow(
      'Invalid Polymarket condition identity',
    );
    expect(http).not.toHaveBeenCalled();
  });
});

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
