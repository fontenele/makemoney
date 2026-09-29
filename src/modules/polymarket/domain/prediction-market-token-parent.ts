import { isPredictionMarketTokenId } from './prediction-market-midpoint';
import { isPredictionMarketConditionId } from './prediction-market-resolution';

export type PredictionMarketOutcomeSide = 'yes' | 'no';

export interface PredictionMarketTokenParent {
  provider: 'polymarket';
  requestedTokenId: string;
  requestedOutcome: PredictionMarketOutcomeSide;
  conditionId: string;
  outcomes: {
    yes: { tokenId: string };
    no: { tokenId: string };
  };
  source: 'clob-market-by-token';
  receivedAt: Date;
  executable: false;
}

export const PREDICTION_MARKET_TOKEN_PARENT_PROVIDER = Symbol(
  'PREDICTION_MARKET_TOKEN_PARENT_PROVIDER',
);

export interface PredictionMarketTokenParentProvider {
  getByToken(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTokenParent>;
}

export class PredictionMarketTokenParentUnavailableError extends Error {
  constructor(tokenId: string) {
    super(`Polymarket parent market for token ${tokenId} is unavailable`);
    this.name = PredictionMarketTokenParentUnavailableError.name;
  }
}

export function isPredictionMarketTokenParentIdentity(value: {
  conditionId: string;
  yesTokenId: string;
  noTokenId: string;
}): boolean {
  return (
    isPredictionMarketConditionId(value.conditionId) &&
    isPredictionMarketTokenId(value.yesTokenId) &&
    isPredictionMarketTokenId(value.noTokenId) &&
    value.yesTokenId !== value.noTokenId
  );
}
