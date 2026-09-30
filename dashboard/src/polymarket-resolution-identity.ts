import type {
  PolymarketBinaryResolution,
  PolymarketMarketDetails,
  Resource,
} from './api';

export type PolymarketResolutionIdentityVerification =
  | { status: 'verified' }
  | { status: 'unavailable'; message: string }
  | { status: 'incoherent'; message: string };

export function verifyPolymarketResolutionIdentity(
  selectedMarket: PolymarketMarketDetails,
  resolution: Resource<PolymarketBinaryResolution>,
): PolymarketResolutionIdentityVerification {
  if (resolution.status === 'unavailable') {
    return { status: 'unavailable', message: resolution.message };
  }

  const conditionId = selectedMarket.conditionId;
  const yesTokenId = selectedMarket.outcomes.yes.tokenId;
  const noTokenId = selectedMarket.outcomes.no.tokenId;
  if (conditionId === null || yesTokenId === null || noTokenId === null) {
    return {
      status: 'unavailable',
      message: 'Complete selected-market identities are unavailable',
    };
  }

  const result = resolution.data;
  const coherent =
    result.market.id === selectedMarket.id &&
    result.market.conditionId?.toLowerCase() === conditionId.toLowerCase() &&
    result.market.outcomes.yes.tokenId === yesTokenId &&
    result.market.outcomes.no.tokenId === noTokenId &&
    result.resolution.conditionId.toLowerCase() === conditionId.toLowerCase() &&
    result.payouts.yes.tokenId === yesTokenId &&
    result.payouts.no.tokenId === noTokenId;

  return coherent
    ? { status: 'verified' }
    : {
        status: 'incoherent',
        message: 'Binary resolution identity diverges from selected market',
      };
}
