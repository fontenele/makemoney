import { describe, expect, it } from 'vitest';
import type {
  PolymarketMarketDetails,
  PolymarketOutcomeParentMarket,
  Resource,
} from './api';
import { verifyPolymarketReverseIdentities } from './polymarket-reverse-identity';

describe('verifyPolymarketReverseIdentities', () => {
  it('verifies both token roles against one exact market identity', () => {
    expect(
      verifyPolymarketReverseIdentities(
        market(),
        available(parent('yes')),
        available(parent('no')),
      ),
    ).toEqual({
      status: 'verified',
      conditionId: conditionId(),
      yesReceivedAt: '2026-09-30T12:00:01.000Z',
      noReceivedAt: '2026-09-30T12:00:01.000Z',
    });
  });

  it('fails closed when a reverse identity changes role or membership', () => {
    expect(
      verifyPolymarketReverseIdentities(
        market(),
        available(parent('yes')),
        available({ ...parent('no'), requestedOutcome: 'yes' }),
      ),
    ).toEqual({
      status: 'incoherent',
      message: 'Reverse outcome identities diverge from market detail',
    });
  });

  it('keeps missing provider observations unavailable', () => {
    expect(
      verifyPolymarketReverseIdentities(market(), available(parent('yes')), {
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

function parent(requestedOutcome: 'yes' | 'no'): PolymarketOutcomeParentMarket {
  return {
    provider: 'polymarket',
    requestedTokenId: requestedOutcome === 'yes' ? '111' : '222',
    requestedOutcome,
    conditionId: conditionId(),
    outcomes: { yes: { tokenId: '111' }, no: { tokenId: '222' } },
    source: 'clob-market-by-token',
    receivedAt: '2026-09-30T12:00:01.000Z',
    executable: false,
  };
}

function available<T>(data: T): Resource<T> {
  return { status: 'available', data };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
