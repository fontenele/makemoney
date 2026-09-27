export interface PredictionMarketBookLevel {
  price: string;
  quantity: string;
}

export interface PredictionMarketTopOfBook {
  provider: 'polymarket';
  tokenId: string;
  conditionId: string;
  snapshotHash: string;
  bid: PredictionMarketBookLevel | null;
  ask: PredictionMarketBookLevel | null;
  spread: string | null;
  source: 'clob-order-book';
  executable: false;
  providerTimestamp: string;
  receivedAt: Date;
}

export const PREDICTION_MARKET_ORDER_BOOK_PROVIDER = Symbol(
  'PREDICTION_MARKET_ORDER_BOOK_PROVIDER',
);

export interface PredictionMarketOrderBookProvider {
  getTopOfBook(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTopOfBook>;
}

export class PredictionMarketOrderBookUnavailableError extends Error {
  constructor(tokenId: string) {
    super(`Polymarket order book for token ${tokenId} is unavailable`);
    this.name = PredictionMarketOrderBookUnavailableError.name;
  }
}
