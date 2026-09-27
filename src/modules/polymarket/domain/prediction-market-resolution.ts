export interface PredictionMarketResolutionState {
  provider: 'polymarket';
  conditionId: string;
  status: string;
  extendedReview: boolean;
  wasDisputed: boolean;
  wasArbitrated: boolean;
  resolvedAt: string | null;
  source: 'data-api-resolution';
  receivedAt: Date;
}

export interface PredictionMarketResolutionRecord extends PredictionMarketResolutionState {
  payouts: readonly string[] | null;
}

export const PREDICTION_MARKET_RESOLUTION_PROVIDER = Symbol(
  'PREDICTION_MARKET_RESOLUTION_PROVIDER',
);

export interface PredictionMarketResolutionProvider {
  getResolution(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketResolutionRecord>;
}

export class PredictionMarketResolutionUnavailableError extends Error {
  constructor(conditionId: string) {
    super(`Polymarket resolution for condition ${conditionId} is unavailable`);
    this.name = PredictionMarketResolutionUnavailableError.name;
  }
}

export function isPredictionMarketConditionId(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}
