import { describe, expect, it } from 'vitest';
import { buildPolymarketResolutionContextRows } from './polymarket-resolution-context';

describe('buildPolymarketResolutionContextRows', () => {
  it('keeps inactive lifecycle dimensions explicit', () => {
    expect(buildPolymarketResolutionContextRows(resolution())).toEqual([
      {
        key: 'review',
        label: 'Review',
        value: 'Standard review',
        active: false,
      },
      {
        key: 'dispute',
        label: 'Dispute',
        value: 'Not disputed',
        active: false,
      },
      {
        key: 'arbitration',
        label: 'Arbitration',
        value: 'Not arbitrated',
        active: false,
      },
    ]);
  });

  it('preserves independent active review, dispute, and arbitration flags', () => {
    expect(
      buildPolymarketResolutionContextRows(
        resolution({
          extendedReview: true,
          wasDisputed: true,
          wasArbitrated: true,
        }),
      ).map(({ value, active }) => ({ value, active })),
    ).toEqual([
      { value: 'Extended review', active: true },
      { value: 'Disputed', active: true },
      { value: 'Arbitrated', active: true },
    ]);
  });
});

function resolution(
  overrides: Partial<{
    extendedReview: boolean;
    wasDisputed: boolean;
    wasArbitrated: boolean;
  }> = {},
) {
  return {
    provider: 'polymarket' as const,
    conditionId: `0x${'a'.repeat(64)}`,
    status: 'resolved',
    extendedReview: false,
    wasDisputed: false,
    wasArbitrated: false,
    resolvedAt: '2026-09-30T12:00:00.000Z',
    source: 'data-api-resolution' as const,
    receivedAt: '2026-09-30T12:00:01.000Z',
    ...overrides,
  };
}
