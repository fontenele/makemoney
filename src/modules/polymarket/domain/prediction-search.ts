import { PredictionEvent } from './prediction-event';

export interface PredictionSearchQuery {
  query: string;
  limit: number;
}

export interface PredictionSearchResult {
  query: string;
  events: PredictionEvent[];
  hasMore: boolean;
  totalResults: number;
  receivedAt: Date;
}

export const PREDICTION_SEARCH_PROVIDER = Symbol('PREDICTION_SEARCH_PROVIDER');

export interface PredictionSearchProvider {
  searchActiveEvents(
    query: PredictionSearchQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSearchResult>;
}
