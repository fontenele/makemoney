import { describe, expect, it } from 'vitest';
import { buildPolymarketMarketIdentityRows } from './polymarket-market-identities';

describe('buildPolymarketMarketIdentityRows', () => {
  it('preserves the exact condition and indexed outcome token identities', () => {
    expect(
      buildPolymarketMarketIdentityRows({
        provider: 'polymarket',
        id: '42',
        slug: 'example-market',
        question: 'Will the example happen?',
        conditionId: `0x${'a'.repeat(64)}`,
        outcomes: {
          yes: { label: 'Yes', tokenId: '111' },
          no: { label: 'No', tokenId: '222' },
        },
        receivedAt: '2026-09-30T12:00:00.000Z',
      }),
    ).toEqual([
      {
        key: 'condition',
        label: 'Condition ID',
        value: `0x${'a'.repeat(64)}`,
      },
      { key: 'yes', label: 'Yes token', value: '111' },
      { key: 'no', label: 'No token', value: '222' },
    ]);
  });

  it('keeps unavailable identities explicit without inventing values', () => {
    expect(
      buildPolymarketMarketIdentityRows({
        provider: 'polymarket',
        id: '42',
        slug: null,
        question: null,
        conditionId: null,
        outcomes: {
          yes: { label: 'YES', tokenId: null },
          no: { label: 'NO', tokenId: null },
        },
        receivedAt: '2026-09-30T12:00:00.000Z',
      }),
    ).toEqual([
      { key: 'condition', label: 'Condition ID', value: null },
      { key: 'yes', label: 'YES token', value: null },
      { key: 'no', label: 'NO token', value: null },
    ]);
  });
});
