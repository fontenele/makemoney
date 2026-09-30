import { PredictionEvent } from './prediction-event';

export interface PredictionSearchQuery {
  query: string;
  limit: number;
  page: number;
}

export interface PredictionSearchResult {
  query: string;
  page: number;
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
