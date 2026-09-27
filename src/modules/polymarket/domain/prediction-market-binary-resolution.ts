import type { PredictionMarketResolutionState } from './prediction-market-resolution';
import type {
  PredictionMarketDetails,
  PredictionMarketOutcomeIdentity,
} from './prediction-market';

export type PredictionMarketBinaryResolutionResult =
  'yes' | 'no' | 'fifty_fifty';

export type PredictionMarketOutcomePayoutStatus = 'winner' | 'loser' | 'split';

export interface PredictionMarketOutcomePayout extends PredictionMarketOutcomeIdentity {
  payoutRate: '0' | '0.5' | '1';
  status: PredictionMarketOutcomePayoutStatus;
}

export interface PredictionMarketBinaryResolution {
  provider: 'polymarket';
  market: PredictionMarketDetails;
  resolution: PredictionMarketResolutionState;
  result: PredictionMarketBinaryResolutionResult;
  payouts: {
    yes: PredictionMarketOutcomePayout;
    no: PredictionMarketOutcomePayout;
  };
  executable: false;
}

export class PredictionMarketConditionUnavailableError extends Error {
  constructor(marketId: string) {
    super(`Polymarket market ${marketId} has no condition identity`);
    this.name = PredictionMarketConditionUnavailableError.name;
  }
}

export class PredictionMarketBinaryResolutionUnavailableError extends Error {
  constructor(marketId: string) {
    super(`Polymarket binary resolution for market ${marketId} is unavailable`);
    this.name = PredictionMarketBinaryResolutionUnavailableError.name;
  }
}

export class PredictionMarketBinaryResolutionIncoherentError extends Error {
  constructor(marketId: string) {
    super(`Polymarket binary resolution for market ${marketId} is incoherent`);
    this.name = PredictionMarketBinaryResolutionIncoherentError.name;
  }
}
