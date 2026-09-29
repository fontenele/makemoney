import { describe, expect, it } from 'vitest';
import type {
  PolymarketBinaryPriceChange,
  PolymarketPriceChangeObservation,
} from './api';
import { buildPolymarketPriceChangeObservationRows } from './polymarket-price-change-observations';

describe('buildPolymarketPriceChangeObservationRows', () => {
  it('preserves outcome and boundary identity for all four observations', () => {
    const change = binaryChange();

    expect(
      buildPolymarketPriceChangeObservationRows(change).map((row) => ({
        key: row.key,
        boundary: row.boundary,
        outcome: row.outcome,
        requestedAt: row.requestedAt,
        tokenId: row.observation.tokenId,
        price: row.observation.price,
      })),
    ).toEqual([
      {
        key: 'from-yes',
        boundary: 'Earlier',
        outcome: 'YES',
        requestedAt: '2026-09-28T12:00:00.000Z',
        tokenId: '111',
        price: '0.58',
      },
      {
        key: 'from-no',
        boundary: 'Earlier',
        outcome: 'NO',
        requestedAt: '2026-09-28T12:00:00.000Z',
        tokenId: '222',
        price: '0.42',
      },
      {
        key: 'to-yes',
        boundary: 'Later',
        outcome: 'YES',
        requestedAt: '2026-09-29T12:00:00.000Z',
        tokenId: '111',
        price: '0.62',
      },
      {
        key: 'to-no',
        boundary: 'Later',
        outcome: 'NO',
        requestedAt: '2026-09-29T12:00:00.000Z',
        tokenId: '222',
        price: '0.38',
      },
    ]);
  });
});

function binaryChange(): PolymarketBinaryPriceChange {
  const requestedFrom = '2026-09-28T12:00:00.000Z';
  const requestedTo = '2026-09-29T12:00:00.000Z';
  const observation = (
    tokenId: string,
    requestedAt: string,
    price: string,
  ): PolymarketPriceChangeObservation => ({
    provider: 'polymarket',
    tokenId,
    requestedAt,
    observedAt: requestedAt,
    price,
    resolutionSeconds: 1800,
    exactTimestamp: true,
    source: 'data-api-price-history',
    receivedAt: '2026-09-29T12:00:01.000Z',
    executable: false,
  });

  return {
    provider: 'polymarket',
    requestedFrom,
    requestedTo,
    outcomes: {
      yes: {
        provider: 'polymarket',
        tokenId: '111',
        requestedFrom,
        requestedTo,
        observations: {
          from: observation('111', requestedFrom, '0.58'),
          to: observation('111', requestedTo, '0.62'),
        },
        priceChange: '0.04',
        direction: 'up',
        sameObservedTimestamp: false,
        sameResolution: true,
        executable: false,
      },
      no: {
        provider: 'polymarket',
        tokenId: '222',
        requestedFrom,
        requestedTo,
        observations: {
          from: observation('222', requestedFrom, '0.42'),
          to: observation('222', requestedTo, '0.38'),
        },
        priceChange: '-0.04',
        direction: 'down',
        sameObservedTimestamp: false,
        sameResolution: true,
        executable: false,
      },
    },
    combinedPriceChange: '0',
    combinedDirection: 'unchanged',
    sameFromObservedTimestamp: true,
    sameToObservedTimestamp: true,
    sameFromResolution: true,
    sameToResolution: true,
    atomicSnapshot: false,
    executable: false,
  };
}
