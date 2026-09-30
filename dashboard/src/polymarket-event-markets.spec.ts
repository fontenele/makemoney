import { describe, expect, it } from 'vitest';
import type { PolymarketEventDetails } from './api';
import {
  buildPolymarketEventMarketPage,
  buildPolymarketEventMarketRows,
  eventMarketRowToSummary,
} from './polymarket-event-markets';

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
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        conditionId: null,
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
      {
        id: '41',
        label: 'candidate-a',
        slug: 'candidate-a',
        question: null,
        conditionId: null,
        closed: false,
      },
      {
        id: '42',
        label: 'Market 42',
        slug: null,
        question: null,
        conditionId: null,
        closed: true,
      },
    ]);
  });

  it('maps only open references into the existing market-selection model', () => {
    const [open, closed] = buildPolymarketEventMarketRows(
      eventDetails([
        {
          id: '41',
          slug: 'candidate-a',
          question: 'Candidate A?',
          conditionId: '0xabc',
          closed: false,
        },
        {
          id: '42',
          slug: 'candidate-b',
          question: 'Candidate B?',
          conditionId: '0xdef',
          closed: true,
        },
      ]),
    );

    expect(open && eventMarketRowToSummary(open)).toEqual({
      provider: 'polymarket',
      id: '41',
      slug: 'candidate-a',
      question: 'Candidate A?',
      conditionId: '0xabc',
      closed: false,
    });
    expect(closed && eventMarketRowToSummary(closed)).toBeNull();
  });

  it('pages the complete bounded reference collection without accumulating rows', () => {
    const event = eventDetails(
      Array.from({ length: 18 }, (_, index) => ({
        id: String(index + 1),
        slug: `market-${index + 1}`,
        question: `Question ${index + 1}`,
        conditionId: null,
        closed: false,
      })),
    );

    expect(buildPolymarketEventMarketPage(event, 2)).toMatchObject({
      page: 2,
      pageCount: 3,
      total: 18,
      rows: [
        { id: '9', label: 'Question 9' },
        { id: '10', label: 'Question 10' },
        { id: '11', label: 'Question 11' },
        { id: '12', label: 'Question 12' },
        { id: '13', label: 'Question 13' },
        { id: '14', label: 'Question 14' },
        { id: '15', label: 'Question 15' },
        { id: '16', label: 'Question 16' },
      ],
    });
    expect(buildPolymarketEventMarketPage(event, 3).rows).toHaveLength(2);
  });

  it('clamps a stale page after the selected event changes', () => {
    expect(buildPolymarketEventMarketPage(eventDetails([]), 4)).toEqual({
      rows: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });

  it.each([0, -1, 1.5])('rejects invalid page %s', (page) => {
    expect(() =>
      buildPolymarketEventMarketPage(eventDetails([]), page),
    ).toThrow('page must be a positive integer');
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
