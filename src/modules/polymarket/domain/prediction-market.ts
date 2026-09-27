export interface PredictionMarket {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  closed: false;
}

export interface PredictionMarketPage {
  markets: PredictionMarket[];
  nextCursor: string | null;
  receivedAt: Date;
}

export interface ActivePredictionMarketQuery {
  limit: number;
  afterCursor?: string;
}

export const PREDICTION_MARKET_PROVIDER = Symbol('PREDICTION_MARKET_PROVIDER');

export interface PredictionMarketProvider {
  listActive(
    query: ActivePredictionMarketQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPage>;
}
