import { jest } from '@jest/globals';
import { PredictionEventLiveVolumeUnavailableError } from '../domain/prediction-event-live-volume';
import { PolymarketDataEventLiveVolumeClient } from './polymarket-data-event-live-volume.client';

describe('PolymarketDataEventLiveVolumeClient', () => {
  it('requests and normalizes one event live-volume breakdown', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    http.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            taker_volume_total: 15.5,
            conditions: [
              { condition_id: conditionId('a'), taker_volume: 10 },
              { condition_id: conditionId('b'), taker_volume: 5.5 },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const receivedAt = new Date('2026-09-28T05:00:00.000Z');
    const client = new PolymarketDataEventLiveVolumeClient(
      'https://data-api.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getLiveVolume('1000')).resolves.toEqual({
      provider: 'polymarket',
      eventId: '1000',
      takerVolumeTotalShares: '15.5',
      markets: [
        { conditionId: conditionId('a'), takerVolumeShares: '10' },
        { conditionId: conditionId('b'), takerVolumeShares: '5.5' },
      ],
      source: 'data-api-live-volume',
      receivedAt,
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://data-api.polymarket.com/v2/live-volume?event_id=1000',
    );
  });

  it('accepts one unidentified source row and zero total', () => {
    const client = new PolymarketDataEventLiveVolumeClient(
      'https://data-api.polymarket.com',
    );

    expect(
      client.normalize('1000', {
        data: {
          taker_volume_total: '0',
          conditions: [{ condition_id: null, taker_volume: '0' }],
        },
      }).markets,
    ).toEqual([{ conditionId: null, takerVolumeShares: '0' }]);
  });

  it.each([
    {},
    { data: null },
    { data: { taker_volume_total: 1, conditions: 'invalid' } },
    {
      data: {
        taker_volume_total: 3,
        conditions: [
          { condition_id: conditionId('a'), taker_volume: 1 },
          { condition_id: conditionId('b'), taker_volume: 2 },
        ],
      },
    },
    {
      data: {
        taker_volume_total: 4,
        conditions: [
          { condition_id: conditionId('a'), taker_volume: 2 },
          { condition_id: conditionId('a'), taker_volume: 2 },
        ],
      },
    },
    {
      data: {
        taker_volume_total: 2,
        conditions: [{ condition_id: 'invalid', taker_volume: 2 }],
      },
    },
    {
      data: {
        taker_volume_total: 3,
        conditions: [{ condition_id: conditionId('a'), taker_volume: 2 }],
      },
    },
  ])(
    'rejects malformed, unordered, duplicate, or unreconciled payload %#',
    (payload) => {
      const client = new PolymarketDataEventLiveVolumeClient(
        'https://data-api.polymarket.com',
      );

      expect(() => client.normalize('1000', payload)).toThrow(
        'Invalid Polymarket event live-volume payload',
      );
    },
  );

  it('maps provider absence explicitly', async () => {
    const client = new PolymarketDataEventLiveVolumeClient(
      'https://data-api.polymarket.com',
      () => Promise.resolve(new Response('', { status: 404 })),
    );

    await expect(client.getLiveVolume('1000')).rejects.toThrow(
      PredictionEventLiveVolumeUnavailableError,
    );
  });

  it('rejects invalid event identity before HTTP', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    const client = new PolymarketDataEventLiveVolumeClient(
      'https://data-api.polymarket.com',
      http,
    );

    await expect(client.getLiveVolume('invalid')).rejects.toThrow(
      'Invalid Polymarket event identity',
    );
    expect(http).not.toHaveBeenCalled();
  });
});

function conditionId(character: string): string {
  return `0x${character.repeat(64)}`;
}
