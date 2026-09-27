import type { PredictionMarketOutcomeMidpoint } from './prediction-market-midpoint';
import type { PredictionMarketDetails } from './prediction-market';

export type PredictionMarketMidpointComplementStatus =
  'balanced' | 'below_one' | 'above_one';

export interface PredictionMarketMidpointComplement {
  provider: 'polymarket';
  market: PredictionMarketDetails;
  outcomes: {
    yes: PredictionMarketOutcomeMidpoint;
    no: PredictionMarketOutcomeMidpoint;
  };
  midpointSum: string;
  deviationFromOne: string;
  status: PredictionMarketMidpointComplementStatus;
  atomicSnapshot: false;
  executable: false;
}

export class PredictionMarketOutcomeTokensUnavailableError extends Error {
  constructor(readonly marketId: string) {
    super(`Polymarket market ${marketId} has no complete outcome-token pair`);
    this.name = PredictionMarketOutcomeTokensUnavailableError.name;
  }
}

export class PredictionMarketMidpointComplementIncoherentError extends Error {
  constructor(readonly marketId: string) {
    super(`Incoherent Polymarket midpoint complement for market ${marketId}`);
    this.name = PredictionMarketMidpointComplementIncoherentError.name;
  }
}
