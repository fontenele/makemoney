import type { PredictionMarketDetails } from './prediction-market';

export interface PredictionMarketConditionOpenInterest {
  provider: 'polymarket';
  conditionId: string;
  openInterestUsdc: string;
  source: 'data-api-open-interest';
  receivedAt: Date;
}

export interface PredictionMarketOpenInterest {
  provider: 'polymarket';
  market: PredictionMarketDetails;
  conditionId: string;
  openInterestUsdc: string;
  source: 'data-api-open-interest';
  receivedAt: Date;
  executable: false;
}

export interface PredictionGlobalOpenInterest {
  provider: 'polymarket';
  openInterestUsdc: string;
  source: 'data-api-open-interest';
  receivedAt: Date;
  executable: false;
}

export const PREDICTION_MARKET_OPEN_INTEREST_PROVIDER = Symbol(
  'PREDICTION_MARKET_OPEN_INTEREST_PROVIDER',
);

export interface PredictionMarketOpenInterestProvider {
  getOpenInterest(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketConditionOpenInterest>;
}

export const PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER = Symbol(
  'PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER',
);

export interface PredictionGlobalOpenInterestProvider {
  getGlobalOpenInterest(
    signal?: AbortSignal,
  ): Promise<PredictionGlobalOpenInterest>;
}

export class PredictionMarketOpenInterestUnavailableError extends Error {
  constructor(conditionId: string) {
    super(
      `Polymarket open interest for condition ${conditionId} is unavailable`,
    );
    this.name = PredictionMarketOpenInterestUnavailableError.name;
  }
}

export class PredictionMarketOpenInterestIncoherentError extends Error {
  constructor(marketId: string) {
    super(`Polymarket open interest for market ${marketId} is incoherent`);
    this.name = PredictionMarketOpenInterestIncoherentError.name;
  }
}
