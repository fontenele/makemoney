export type PredictionMarketPriceHistoryResolution =
  '1m' | '5m' | '30m' | '3h' | '12h';

export interface PredictionMarketPriceHistoryQuery {
  start: Date;
  end: Date;
  resolution: PredictionMarketPriceHistoryResolution;
  limit: number;
  afterCursor?: string;
}

export interface PredictionMarketPriceHistoryPoint {
  timestamp: Date;
  price: string;
  resolutionSeconds: number;
}

export interface PredictionMarketPriceHistoryPage {
  provider: 'polymarket';
  tokenId: string;
  start: Date;
  end: Date;
  resolution: PredictionMarketPriceHistoryResolution;
  points: readonly PredictionMarketPriceHistoryPoint[];
  nextCursor: string | null;
  source: 'data-api-price-history';
  receivedAt: Date;
  executable: false;
}

export interface PredictionMarketHistoricalPriceObservation {
  provider: 'polymarket';
  tokenId: string;
  requestedAt: Date;
  observedAt: Date;
  price: string;
  resolutionSeconds: number;
  exactTimestamp: boolean;
  source: 'data-api-price-history';
  receivedAt: Date;
  executable: false;
}

export const PREDICTION_MARKET_PRICE_HISTORY_PROVIDER = Symbol(
  'PREDICTION_MARKET_PRICE_HISTORY_PROVIDER',
);

export interface PredictionMarketPriceHistoryProvider {
  getPriceHistory(
    tokenId: string,
    query: PredictionMarketPriceHistoryQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPriceHistoryPage>;
  getPriceAt(
    tokenId: string,
    at: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketHistoricalPriceObservation>;
}

export class PredictionMarketPriceHistoryUnavailableError extends Error {
  constructor(tokenId: string) {
    super(`Polymarket price history for outcome ${tokenId} is unavailable`);
    this.name = PredictionMarketPriceHistoryUnavailableError.name;
  }
}

export class PredictionMarketHistoricalPriceUnavailableError extends Error {
  constructor(tokenId: string, at: Date) {
    super(
      `Polymarket historical price for outcome ${tokenId} at ${at.toISOString()} is unavailable`,
    );
    this.name = PredictionMarketHistoricalPriceUnavailableError.name;
  }
}
