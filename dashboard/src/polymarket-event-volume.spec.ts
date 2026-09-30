import { describe, expect, it } from 'vitest';
import type { PolymarketEventLiveVolume } from './api';
import { buildPolymarketEventVolumeRows } from './polymarket-event-volume';

describe('buildPolymarketEventVolumeRows', () => {
  it('correlates and bounds provider-ordered volume rows by condition identity', () => {
    const observation = liveVolume(
      Array.from({ length: 10 }, (_, index) => ({
        conditionId: conditionId(index),
        takerVolumeShares: String(100 - index),
      })),
      Array.from({ length: 10 }, (_, index) => ({
        id: String(index + 1),
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        conditionId: conditionId(index).toUpperCase().replace('0X', '0x'),
        closed: false,
      })),
    );

    expect(buildPolymarketEventVolumeRows(observation)).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        conditionId: conditionId(index),
        marketId: String(index + 1),
        label: `Question ${index + 1}`,
        takerVolumeShares: String(100 - index),
      })),
    );
  });

  it('keeps an unidentified provider row explicit', () => {
    const observation = liveVolume(
      [{ conditionId: null, takerVolumeShares: '0' }],
      [],
    );

    expect(buildPolymarketEventVolumeRows(observation)).toEqual([
      {
        conditionId: null,
        marketId: null,
        label: 'Unidentified provider row',
        takerVolumeShares: '0',
      },
    ]);
  });
});

function liveVolume(
  markets: PolymarketEventLiveVolume['markets'],
  eventMarkets: PolymarketEventLiveVolume['event']['markets'],
): PolymarketEventLiveVolume {
  return {
    provider: 'polymarket',
    event: {
      provider: 'polymarket',
      id: '84',
      slug: 'event-84',
      title: 'Event 84',
      description: null,
      resolutionSource: null,
      startDate: null,
      endDate: null,
      active: true,
      closed: false,
      archived: false,
      restricted: false,
      markets: eventMarkets,
      receivedAt: '2026-09-29T18:00:00.000Z',
    },
    takerVolumeTotalShares: '0',
    markets,
    source: 'data-api-live-volume',
    receivedAt: '2026-09-29T18:00:01.000Z',
    executable: false,
  };
}

function conditionId(index: number): string {
  return `0x${index.toString(16).padStart(64, '0')}`;
}
