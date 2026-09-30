import { describe, expect, it } from 'vitest';
import type { PolymarketEventLiveVolume } from './api';
import {
  buildPolymarketEventVolumePage,
  buildPolymarketEventVolumeRows,
  eventVolumeRowToSummary,
} from './polymarket-event-volume';

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
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        closed: false,
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
        slug: null,
        question: null,
        closed: null,
        takerVolumeShares: '0',
      },
    ]);
  });

  it('pages provider-ordered rows without accumulating earlier results', () => {
    const observation = liveVolume(
      Array.from({ length: 18 }, (_, index) => ({
        conditionId: conditionId(index),
        takerVolumeShares: String(100 - index),
      })),
      Array.from({ length: 18 }, (_, index) => ({
        id: String(index + 1),
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        conditionId: conditionId(index),
        closed: false,
      })),
    );

    expect(buildPolymarketEventVolumePage(observation, 2)).toMatchObject({
      page: 2,
      pageCount: 3,
      total: 18,
      rows: [
        { marketId: '9', takerVolumeShares: '92' },
        { marketId: '10', takerVolumeShares: '91' },
        { marketId: '11', takerVolumeShares: '90' },
        { marketId: '12', takerVolumeShares: '89' },
        { marketId: '13', takerVolumeShares: '88' },
        { marketId: '14', takerVolumeShares: '87' },
        { marketId: '15', takerVolumeShares: '86' },
        { marketId: '16', takerVolumeShares: '85' },
      ],
    });
    expect(buildPolymarketEventVolumePage(observation, 3).rows).toHaveLength(2);
  });

  it('clamps a stale page after the selected event changes', () => {
    expect(buildPolymarketEventVolumePage(liveVolume([], []), 5)).toEqual({
      rows: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });

  it.each([0, -1, 1.5])('rejects invalid volume page %s', (page) => {
    expect(() =>
      buildPolymarketEventVolumePage(liveVolume([], []), page),
    ).toThrow('page must be a positive integer');
  });

  it('maps only correlated open rows into the existing market selection', () => {
    const [open, closed, unidentified] = buildPolymarketEventVolumeRows(
      liveVolume(
        [
          { conditionId: conditionId(1), takerVolumeShares: '10' },
          { conditionId: conditionId(2), takerVolumeShares: '5' },
          { conditionId: null, takerVolumeShares: '1' },
        ],
        [
          {
            id: '41',
            slug: 'candidate-a',
            question: 'Candidate A?',
            conditionId: conditionId(1),
            closed: false,
          },
          {
            id: '42',
            slug: 'candidate-b',
            question: 'Candidate B?',
            conditionId: conditionId(2),
            closed: true,
          },
        ],
      ),
    );

    expect(open && eventVolumeRowToSummary(open)).toEqual({
      provider: 'polymarket',
      id: '41',
      slug: 'candidate-a',
      question: 'Candidate A?',
      conditionId: conditionId(1),
      closed: false,
    });
    expect(closed && eventVolumeRowToSummary(closed)).toBeNull();
    expect(unidentified && eventVolumeRowToSummary(unidentified)).toBeNull();
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
