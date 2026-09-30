import { describe, expect, it } from 'vitest';
import type { PolymarketEventDetails } from './api';
import { buildPolymarketEventMarketRows } from './polymarket-event-markets';

describe('buildPolymarketEventMarketRows', () => {
  it('preserves provider order and bounds the displayed reference sample', () => {
    const event = eventDetails(
      Array.from({ length: 10 }, (_, index) => ({
        id: String(index + 1),
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        conditionId: null,
        closed: index === 1,
      })),
    );

    expect(buildPolymarketEventMarketRows(event)).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        id: String(index + 1),
        label: `Question ${index + 1}`,
        closed: index === 1,
      })),
    );
  });

  it('uses slug and identity fallbacks without inventing market detail', () => {
    const event = eventDetails([
      {
        id: '41',
        slug: 'candidate-a',
        question: null,
        conditionId: null,
        closed: false,
      },
      {
        id: '42',
        slug: null,
        question: null,
        conditionId: null,
        closed: true,
      },
    ]);

    expect(buildPolymarketEventMarketRows(event)).toEqual([
      { id: '41', label: 'candidate-a', closed: false },
      { id: '42', label: 'Market 42', closed: true },
    ]);
  });
});

function eventDetails(
  markets: PolymarketEventDetails['markets'],
): PolymarketEventDetails {
  return {
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
    markets,
    receivedAt: '2026-09-29T18:00:01.000Z',
  };
}
