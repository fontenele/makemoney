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

export interface PredictionMarketTag {
  id: string;
  label: string | null;
  slug: string | null;
}

export interface PredictionMarketTags {
  provider: 'polymarket';
  marketId: string;
  tags: PredictionMarketTag[];
  receivedAt: Date;
}

export interface PredictionMarketOutcomeIdentity {
  label: string;
  tokenId: string | null;
}

export interface PredictionMarketDetails {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  outcomes: {
    yes: PredictionMarketOutcomeIdentity;
    no: PredictionMarketOutcomeIdentity;
  };
  receivedAt: Date;
}

export interface ActivePredictionMarketQuery {
  limit: number;
  afterCursor?: string;
  tagId?: string;
}

export const PREDICTION_MARKET_PROVIDER = Symbol('PREDICTION_MARKET_PROVIDER');

export interface PredictionMarketProvider {
  listActive(
    query: ActivePredictionMarketQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPage>;
  getById(id: string, signal?: AbortSignal): Promise<PredictionMarketDetails>;
  getTagsById(id: string, signal?: AbortSignal): Promise<PredictionMarketTags>;
}

export class PredictionMarketNotFoundError extends Error {
  constructor(id: string) {
    super(`Polymarket market ${id} was not found`);
    this.name = PredictionMarketNotFoundError.name;
  }
}

export class PredictionMarketProviderDnsError extends Error {
  constructor() {
    super('Polymarket provider hostname could not be resolved');
    this.name = PredictionMarketProviderDnsError.name;
  }
}
