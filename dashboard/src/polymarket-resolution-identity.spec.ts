import { describe, expect, it } from 'vitest';
import type {
  PolymarketBinaryResolution,
  PolymarketMarketDetails,
} from './api';
import { verifyPolymarketResolutionIdentity } from './polymarket-resolution-identity';

describe('verifyPolymarketResolutionIdentity', () => {
  it('verifies the selected market, condition, indexed tokens, and payout tokens', () => {
    expect(
      verifyPolymarketResolutionIdentity(market(), {
        status: 'available',
        data: resolution(),
      }),
    ).toEqual({ status: 'verified' });
  });

  it.each([
    ['market', { market: { ...market(), id: '43' } }],
    [
      'condition',
      {
        resolution: {
          ...resolution().resolution,
          conditionId: `0x${'b'.repeat(64)}`,
        },
      },
    ],
    [
      'payout token',
      {
        payouts: {
          ...resolution().payouts,
          yes: { ...resolution().payouts.yes, tokenId: '333' },
        },
      },
    ],
  ])('rejects divergent %s identity', (_scenario, overrides) => {
    expect(
      verifyPolymarketResolutionIdentity(market(), {
        status: 'available',
        data: { ...resolution(), ...overrides },
      }),
    ).toEqual({
      status: 'incoherent',
      message: 'Binary resolution identity diverges from selected market',
    });
  });

  it('preserves an unavailable resolution without inventing coherence', () => {
    expect(
      verifyPolymarketResolutionIdentity(market(), {
        status: 'unavailable',
        message: 'Unavailable (404)',
      }),
    ).toEqual({ status: 'unavailable', message: 'Unavailable (404)' });
  });
});

function market(): PolymarketMarketDetails {
  return {
    provider: 'polymarket',
    id: '42',
    slug: 'example',
    question: 'Example?',
    conditionId: conditionId(),
    outcomes: {
      yes: { label: 'Yes', tokenId: '111' },
      no: { label: 'No', tokenId: '222' },
    },
    receivedAt: '2026-09-30T12:00:00.000Z',
  };
}

function resolution(): PolymarketBinaryResolution {
  return {
    provider: 'polymarket',
    market: market(),
    resolution: {
      provider: 'polymarket',
      conditionId: conditionId(),
      status: 'resolved',
      extendedReview: false,
      wasDisputed: false,
      wasArbitrated: false,
      resolvedAt: '2026-09-30T11:00:00.000Z',
      source: 'data-api-resolution',
      receivedAt: '2026-09-30T12:00:01.000Z',
    },
    result: 'yes',
    payouts: {
      yes: {
        label: 'Yes',
        tokenId: '111',
        payoutRate: '1',
        status: 'winner',
      },
      no: {
        label: 'No',
        tokenId: '222',
        payoutRate: '0',
        status: 'loser',
      },
    },
    executable: false,
  };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
