export interface PredictionMarketOutcomeMidpoint {
  provider: 'polymarket';
  tokenId: string;
  price: string;
  source: 'clob-midpoint';
  executable: false;
  providerTimestamp: null;
  receivedAt: Date;
}

export const PREDICTION_MARKET_MIDPOINT_PROVIDER = Symbol(
  'PREDICTION_MARKET_MIDPOINT_PROVIDER',
);

export interface PredictionMarketMidpointProvider {
  getMidpoint(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketOutcomeMidpoint>;
}

export class PredictionMarketMidpointUnavailableError extends Error {
  constructor(tokenId: string) {
    super(`Polymarket midpoint for token ${tokenId} is unavailable`);
    this.name = PredictionMarketMidpointUnavailableError.name;
  }
}

export function isPredictionMarketTokenId(value: string): boolean {
  return /^(?:0|[1-9]\d{0,77})$/.test(value);
}
