import type {
  PolymarketMarketDetails,
  PolymarketOutcomeParentMarket,
  Resource,
} from './api';

export type PolymarketReverseIdentityVerification =
  | {
      status: 'verified';
      conditionId: string;
      yesReceivedAt: string;
      noReceivedAt: string;
    }
  | { status: 'unavailable'; message: string }
  | { status: 'incoherent'; message: string };

export function verifyPolymarketReverseIdentities(
  market: PolymarketMarketDetails,
  yesParent: Resource<PolymarketOutcomeParentMarket>,
  noParent: Resource<PolymarketOutcomeParentMarket>,
): PolymarketReverseIdentityVerification {
  const yesTokenId = market.outcomes.yes.tokenId;
  const noTokenId = market.outcomes.no.tokenId;
  if (
    market.conditionId === null ||
    yesTokenId === null ||
    noTokenId === null
  ) {
    return {
      status: 'unavailable',
      message: 'Complete market identities are unavailable',
    };
  }
  if (yesParent.status === 'unavailable') {
    return { status: 'unavailable', message: yesParent.message };
  }
  if (noParent.status === 'unavailable') {
    return { status: 'unavailable', message: noParent.message };
  }

  const expected = {
    conditionId: market.conditionId.toLowerCase(),
    yesTokenId,
    noTokenId,
  };
  const coherent =
    parentMatches(yesParent.data, 'yes', expected) &&
    parentMatches(noParent.data, 'no', expected);
  if (!coherent) {
    return {
      status: 'incoherent',
      message: 'Reverse outcome identities diverge from market detail',
    };
  }

  return {
    status: 'verified',
    conditionId: market.conditionId,
    yesReceivedAt: yesParent.data.receivedAt,
    noReceivedAt: noParent.data.receivedAt,
  };
}

function parentMatches(
  parent: PolymarketOutcomeParentMarket,
  expectedOutcome: 'yes' | 'no',
  expected: {
    conditionId: string;
    yesTokenId: string;
    noTokenId: string;
  },
): boolean {
  return (
    parent.requestedOutcome === expectedOutcome &&
    parent.requestedTokenId ===
      (expectedOutcome === 'yes' ? expected.yesTokenId : expected.noTokenId) &&
    parent.conditionId.toLowerCase() === expected.conditionId &&
    parent.outcomes.yes.tokenId === expected.yesTokenId &&
    parent.outcomes.no.tokenId === expected.noTokenId
  );
}
